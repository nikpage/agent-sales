// pages/api/auth/google/index.ts

export default async function handler(req, res) {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id parameter" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "Missing GOOGLE_CLIENT_ID" });
  }

  const proto =
    (req.headers["x-forwarded-proto"] as string) ||
    (req.socket as any)?.encrypted ? "https" : "http";

  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  if (!host) {
    return res.status(500).json({ error: "Missing host header" });
  }

  const redirectUri = `${proto}://${host}/api/auth/google/callback`;

  const scope = encodeURIComponent(
    [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" ")
  );

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${encodeURIComponent(user_id)}`;

  res.redirect(authUrl);
}
