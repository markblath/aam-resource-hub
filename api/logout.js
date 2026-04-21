// /api/logout — clears AAM session cookie, then logs out of Wild Apricot too
// so the user has to re-enter their password on next sign in
export default function handler(req, res) {
  res.setHeader(
    "Set-Cookie",
    "aam_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  // Redirect to Wild Apricot's logout URL, which then returns to our home page
  res.redirect(302, "https://AAMMembers.wildapricot.org/sys/login?ReturnUrl=https://aam-resource-hub.vercel.app&logoff=true");
}
