// /api/logout — clears the session cookie
export default function handler(req, res) {
  res.setHeader(
    "Set-Cookie",
    "aam_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  res.redirect(302, "/");
}
