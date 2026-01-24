// cli/send-pending-emails.ts

import { supabase } from "../lib/supabase";
import { sendGmail } from "../lib/email/send-gmail";

async function main() {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("id,action_id,user_id,to,subject,text_body,html_body,status")
    .eq("status", "pending")
    .order("id", { ascending: true })
    .limit(10);

  if (error) throw error;

  if (!emails || emails.length === 0) {
    console.log("No pending emails.");
    return;
  }

  for (const e of emails) {
    if (!e.action_id) {
      console.error(`Skipping ${e.id}: missing action_id`);
      continue;
    }
    if (!e.user_id || !e.subject) {
      console.error(`Skipping ${e.id}: missing required fields`);
      continue;
    }

    try {
      // IMPORTANT:
      // The reminder email is sent TO THE USER THEMSELVES (their connected Gmail).
      // The `to` value from the DB is ignored on purpose.
      await sendGmail({
        action_id: e.action_id,
        user_id: e.user_id,
        to: "", // ignored by sendGmail
        subject: e.subject,
        text_body: e.text_body ?? "",
        html_body: e.html_body ?? "",
      });

      console.log("Sent:", e.id);
    } catch (err) {
      console.error("Send failed:", e.id, err);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
