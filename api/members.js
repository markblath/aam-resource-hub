// /api/members — fetches active AAM members from Wild Apricot and applies
// each member's privacy preferences before returning to the frontend.
//
// Wild Apricot custom fields required (create once in WA admin):
//   "Hub: Show Email"  — Yes/No field (default yes — hide by setting to No)
//   "Hub: Show Phone"  — Yes/No field (default no — show by setting to Yes)
//   "Hub: Artists"     — Multi-line text: comma-separated artists to display
//                        Leave blank = no artists shown in directory

const ACCENTS = ["#C8F035", "#FFD166", "#8CE0B5", "#F95B4A"];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");

  try {
    // 1. Get access token via API key
    const credentials = Buffer.from(
      `APIKEY:${process.env.WILD_APRICOT_API_KEY}`
    ).toString("base64");

    const tokenRes = await fetch("https://oauth.wildapricot.org/auth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=auto",
    });

    if (!tokenRes.ok) throw new Error("Token fetch failed");
    const { access_token } = await tokenRes.json();

    // 2. Fetch all active members — WA caps at 100 per page, so paginate
    const accountId = process.env.WILD_APRICOT_ACCOUNT_ID;
    const baseUrl = `https://api.wildapricot.org/v2.3/accounts/${accountId}/contacts`;
    const headers = { Authorization: `Bearer ${access_token}`, Accept: "application/json" };

    let allContacts = [];
    let skip = 0;
    const pageSize = 100;

    while (true) {
      const url = `${baseUrl}?$filter=Status%20eq%20'Active'&$top=${pageSize}&$skip=${skip}&$async=false`;
      const contactsRes = await fetch(url, { headers });
      if (!contactsRes.ok) throw new Error("Contacts fetch failed");
      const data = await contactsRes.json();
      const page = data.Contacts || [];
      allContacts = allContacts.concat(page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }

    const data = { Contacts: allContacts };

    // 3. Filter to paying members only and map to directory format
    const members = (data.Contacts || [])
      .filter((c) => c.MembershipLevel != null)
      .map((c) => {
        // Build a quick field lookup from the FieldValues array
        const fields = {};
        (c.FieldValues || []).forEach((f) => {
          fields[f.FieldName] = f.Value;
        });

        // Privacy preferences — default: show email, hide phone
        const showEmail = fields["Hub: Show Email"] !== false;
        const showPhone  = fields["Hub: Show Phone"] === true;

        // Artists: member controls which artists appear via the Hub: Artists field
        const artistsRaw = fields["Hub: Artists"] || "";
        const artists = artistsRaw
          ? artistsRaw.split(",").map((a) => a.trim()).filter(Boolean)
          : [];

        const firstName = c.FirstName || "";
        const lastName  = c.LastName  || "";

        return {
          id:        c.Id,
          level:     c.MembershipLevel?.Name || "Member",
          firstName,
          lastName,
          org:       c.Organization || fields["Organization"] || "",
          city:      fields["City"]  || "",
          state:     fields["State"]?.Label || fields["State"] || "",
          email:     showEmail ? (c.Email || null) : null,
          phone:     showPhone ? (fields["Phone"] || fields["Mobile phone"] || null) : null,
          artists,
          initials:  ((firstName[0] || "") + (lastName[0] || "")).toUpperCase(),
          accent:    ACCENTS[c.Id % ACCENTS.length],
        };
      })
      .filter((m) => m.firstName || m.lastName); // exclude nameless contacts

    res.status(200).json({ members });
  } catch (err) {
    console.error("Members API error:", err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
}
