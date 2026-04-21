// /api/login — redirects the user to Wild Apricot's OAuth login page
export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.WILD_APRICOT_CLIENT_ID,
    redirect_uri: process.env.WILD_APRICOT_REDIRECT_URI,
    response_type: "code",
    scope: "auto",
  });

  res.redirect(302, `https://AAMMembers.wildapricot.org/sys/login/OAuthLogin?${params}`);
}
