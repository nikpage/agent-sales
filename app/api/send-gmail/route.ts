// api/send-gmail.ts

import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js"; // Switch to standard client for service role
import MailComposer from "nodemailer/lib/mail-composer";

export async function POST(req: Request) {
  // 1. Initialize Supabase with Service Role Key to bypass Auth
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    const { to, subject, body, userId } = await req.json();

    if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });

    // 2. Fetch the tokens for the specific user ID provided
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("google_oauth_tokens")
      .eq("id", userId)
      .single();

    if (dbError || !userData?.google_oauth_tokens) {
      return Response.json({ error: "Tokens not found for this user" }, { status: 404 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(userData.google_oauth_tokens as any);

    const mail = new MailComposer({ to, subject, text: body });
    const message = await mail.compile().build();
    const raw = Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
