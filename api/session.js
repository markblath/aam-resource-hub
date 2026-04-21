// /api/session — called by the frontend to check if the user is logged in.
// Returns the session info if valid, or 401 if not.
export default function handler(req, res) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/aam_session=([^;]+)/);

  if (!match) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const session = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));

    if (Date.now() > session.exp) {
      return res.status(401).json({ authenticated: false, reason: "expired" });
    }

    return res.status(200).json({
      authenticated: true,
      name: session.name,
      email: session.email,
      memberId: session.memberId,
    });
  } catch {
    return res.status(401).json({ authenticated: false });
  }
}
