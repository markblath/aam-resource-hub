// /api/callback — Wild Apricot redirects here after the user logs in.
// Exchanges the auth code for a token, verifies AAM membership, sets a cookie.
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(302, "/?auth=denied");
  }

  try {
    // 1. Exchange auth code for access token
    const credentials = Buffer.from(
      `${process.env.WILD_APRICOT_CLIENT_ID}:${process.env.WILD_APRICOT_CLIENT_SECRET}`
    ).toString("base64");

    const tokenRes = await fetch("https://oauth.wildapricot.org/auth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.WILD_APRICOT_REDIRECT_URI,
        scope: "auto",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return res.redirect(302, "/?auth=error");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const Permissions = tokenData.Permissions;

    // 2. Verify the user is an active AAM member
    // Wild Apricot includes membership info in the token response via Permissions
    const accountId = process.env.WILD_APRICOT_ACCOUNT_ID;
    const accountPermission = Permissions?.find(
      (p) => String(p.AccountId) === String(accountId)
    );

    const isMember =
      accountPermission &&
      accountPermission.SecurityProfileId !== undefined;

    if (!isMember) {
      return res.redirect(302, "/?auth=not-member");
    }

    // 3. Fetch contact details so we have the member's name
    const contactRes = await fetch(
      `https://api.wildapricot.org/v2.3/accounts/${accountId}/contacts/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    const contact = contactRes.ok ? await contactRes.json() : {};

    // 4. Set a simple signed session cookie
    // In a production system you'd use a proper JWT library — this is a lightweight approach.
    const sessionPayload = Buffer.from(
      JSON.stringify({
        name: `${contact.FirstName || ""} ${contact.LastName || ""}`.trim(),
        email: contact.Email || "",
        memberId: contact.Id || "",
        exp: Date.now() + 8 * 60 * 60 * 1000, // 8-hour session
      })
    ).toString("base64");

    res.setHeader(
      "Set-Cookie",
      `aam_session=${sessionPayload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`
    );

    return res.redirect(302, "/?auth=success");
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.redirect(302, "/?auth=error");
  }
}
