// lib/email/send-gmail.ts

import { supabase as defaultSupabase } from "../supabase";
import { google } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";

const requiredEnvVars = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) throw new Error(`Missing required environment variable: ${envVar}`);
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const MAX_RETRIES = 3;
const GMAIL_SEND_DELAY_MS = 1000;

interface SendEmailParams {
  action_id: string;
  user_id: string;
  to: string; // ignored intentionally
  subject: string;
  text_body: string;
  html_body: string;
}

interface EmailRecord {
  id: string;
  action_id: string;
  status: string;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
}

export async function sendGmail(
  params: SendEmailParams,
  supabase: SupabaseClient = defaultSupabase
): Promise<void> {
  let emailRecordId: string | null = null;

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("emails")
      .select("id, action_id, status, retry_count, last_retry_at, created_at")
      .eq("action_id", params.action_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let emailRecord: EmailRecord;

    if (existing) {
      emailRecord = existing as EmailRecord;
      emailRecordId = emailRecord.id;

      if (emailRecord.status === "sent" || emailRecord.status === "bounced") {
        console.log(`Email already processed: ${emailRecord.status}`);
        return;
      }

      if (emailRecord.retry_count >= MAX_RETRIES) {
        await supabase.from("emails").update({ status: "failed" }).eq("id", emailRecord.id);
        console.log(`Max retries reached for action_id: ${params.action_id}`);
        return;
      }
    } else {
      const { data: newEmail, error: insertError } = await supabase
        .from("emails")
        .insert({
          action_id: params.action_id,
          user_id: params.user_id,
          to: params.to,
          subject: params.subject,
          text_body: params.text_body,
          html_body: params.html_body,
          status: "pending",
          retry_count: 0,
          bounced: false,
        })
        .select("id, action_id, status, retry_count, last_retry_at, created_at")
        .single();

      if (insertError) throw insertError;

      emailRecord = newEmail as EmailRecord;
      emailRecordId = emailRecord.id;
    }

    const lastAttempt = emailRecord.last_retry_at || emailRecord.created_at;
    const timeSinceLastAttempt = Date.now() - new Date(lastAttempt).getTime();
    if (timeSinceLastAttempt < GMAIL_SEND_DELAY_MS) {
      console.log(`Throttling: ${GMAIL_SEND_DELAY_MS - timeSinceLastAttempt}ms remaining`);
      return;
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email_unsubscribed, email_enabled, google_oauth_tokens")
      .eq("id", params.user_id)
      .single();

    if (userError) throw userError;

    if (user.email_unsubscribed || !user.email_enabled) {
      await supabase
        .from("emails")
        .update({ status: "failed", last_error: "User unsubscribed or email disabled" })
        .eq("id", emailRecordId);
      return;
    }

    const googleTokens = user.google_oauth_tokens as any;
    if (!googleTokens?.refresh_token) {
      await supabase
        .from("emails")
        .update({ status: "failed", last_error: "Missing Google refresh_token" })
        .eq("id", emailRecordId);
      return;
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: googleTokens.refresh_token,
      access_token: googleTokens.access_token,
      expiry_date: googleTokens.expiry_date,
    });

    await oauth2Client.getAccessToken();

    const refreshed = oauth2Client.credentials;
    if (refreshed?.access_token && refreshed?.expiry_date) {
      await supabase
        .from("users")
        .update({
          google_oauth_tokens: {
            ...googleTokens,
            access_token: refreshed.access_token,
            expiry_date: refreshed.expiry_date,
          },
        })
        .eq("id", params.user_id);
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const profile = await gmail.users.getProfile({ userId: "me" });
    const userEmail = profile.data.emailAddress || null;
    if (!userEmail) {
      await supabase
        .from("emails")
        .update({ status: "failed", last_error: "Gmail profile missing emailAddress" })
        .eq("id", emailRecordId);
      return;
    }

    const fromEmail = userEmail;
    const toEmail = userEmail;

    // MAKE IT VISIBLE: unique subject prevents Gmail threading/hiding it
    const unique = Date.now();
    const subject2 = `[AGENT ${unique}] ${params.subject}`;

    console.log("FROM", fromEmail);
    console.log("TO", toEmail);

    const rawMessage = createRawMessage(
      fromEmail,
      toEmail,
      subject2,
      params.text_body,
      params.html_body
    );

    const sendResult = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: rawMessage },
    });

    if (sendResult.data.id) {
      await gmail.users.messages.get({
        userId: "me",
        id: sendResult.data.id,
        format: "metadata",
      });
    }

    const { error: updateError } = await supabase
      .from("emails")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        external_id: sendResult.data.id,
      })
      .eq("id", emailRecordId);

    if (updateError) throw updateError;

    console.log(`Email sent successfully: ${sendResult.data.id}`);
  } catch (error: any) {
    if (!emailRecordId) return;

    const { data: currentEmail } = await supabase
      .from("emails")
      .select("retry_count")
      .eq("id", emailRecordId)
      .single();

    const newRetryCount = (currentEmail?.retry_count || 0) + 1;

    await supabase
      .from("emails")
      .update({
        status: "failed",
        retry_count: newRetryCount,
        last_retry_at: new Date().toISOString(),
        last_error: error?.message || String(error),
      })
      .eq("id", emailRecordId);
  }
}

function createRawMessage(from: string, to: string, subject: string, textBody: string, htmlBody: string): string {
  const boundary = "----=_Part_0_" + Date.now();
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const b64 = (s: string) => wrap76(Buffer.from(s, "utf8").toString("base64"));

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(textBody),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(htmlBody),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return Buffer.from(message, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function wrap76(s: string): string {
  return s.replace(/.{1,76}/g, (m) => m + "\r\n").trimEnd();
}
