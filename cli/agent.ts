// cli/agent.ts

import { createClient } from '@supabase/supabase-js';
import { runAgentForClient } from '../agent/agentRunner';
import { runOutboundIngestion } from '../agent/agents/outboundIngestion';
import { createAgentContext } from '../agent/agentContext';
import { sendGmail } from '../lib/email/send-gmail';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
);

async function runCommand(clientId?: string, bulkMode: boolean = false) {
  console.log(`DEBUG: runCommand called with bulkMode=${bulkMode}`);
  if (clientId) {
    const result = await runAgentForClient(clientId, bulkMode);
    if (result.errors.length > 0) {
      console.log(`✗ Client ${clientId}: ${result.processedMessages} messages processed, ${result.errors.length} errors`);
      result.errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log(`✓ Client ${clientId}: ${result.processedMessages} messages processed`);
    }
  } else {
    const { data: clients } = await supabase
      .from('users')
      .select('id, settings')
      .not('google_oauth_tokens', 'is', null);

    if (!clients || clients.length === 0) {
      console.log('No clients found');
      return;
    }

    const activeClients = clients.filter(c => !c.settings?.agent_paused);

    if (activeClients.length === 0) {
      console.log('No active clients found (all paused)');
      return;
    }

    console.log(`Running agent for ${activeClients.length} clients...`);
    for (const client of activeClients) {
      const result = await runAgentForClient(client.id, bulkMode);
      if (result.errors.length > 0) {
        console.log(`✗ Client ${client.id}: ${result.processedMessages} messages processed, ${result.errors.length} errors`);
      } else {
        console.log(`✓ Client ${client.id}: ${result.processedMessages} messages processed`);
      }
    }
  }
}

async function runOutboundCommand(clientId: string, bulkMode: boolean = false) {
  console.log(`DEBUG: runOutboundCommand called with bulkMode=${bulkMode}`);
  const ctx = await createAgentContext(clientId, bulkMode);
  const count = await runOutboundIngestion(ctx!);
  console.log(`✓ Client ${clientId}: ${count} outbound messages processed`);
}

async function sendCommand(clientId?: string) {
  const query = supabase
    .from("emails")
    .select("id,action_id,user_id,to,subject,text_body,html_body,status")
    .eq("status", "pending")
    .order("id", { ascending: true })
    .limit(50);

  if (clientId) {
    query.eq('user_id', clientId);
  }

  const { data: emails, error } = await query;

  if (error) throw error;

  if (!emails || emails.length === 0) {
    console.log(clientId ? `No pending emails for client ${clientId}` : 'No pending emails');
    return;
  }

  console.log(`Sending ${emails.length} pending emails...`);
  let sent = 0;
  let failed = 0;

  for (const e of emails) {
    if (!e.action_id) {
      console.log(`✗ Skipping ${e.id}: missing action_id`);
      failed++;
      continue;
    }
    if (!e.user_id || !e.subject) {
      console.log(`✗ Skipping ${e.id}: missing required fields`);
      failed++;
      continue;
    }

    try {
      await sendGmail({
        action_id: e.action_id,
        user_id: e.user_id,
        to: "",
        subject: e.subject,
        text_body: e.text_body ?? "",
        html_body: e.html_body ?? "",
      });

      console.log(`✓ Sent email ${e.id} for action ${e.action_id}`);
      sent++;
    } catch (err: any) {
      console.log(`✗ Send failed for ${e.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✓ ${sent} sent, ✗ ${failed} failed`);
}

async function pauseCommand(clientId: string) {
  const { data: client } = await supabase
    .from('users')
    .select('settings')
    .eq('id', clientId)
    .single();

  if (!client) {
    console.log(`✗ Client ${clientId} not found`);
    return;
  }

  const settings = client.settings || {};
  settings.agent_paused = true;

  await supabase
    .from('users')
    .update({ settings })
    .eq('id', clientId);

  console.log(`✓ Client ${clientId}: agent paused`);
}

async function healthCommand(clientId: string) {
  const { data: client } = await supabase
    .from('users')
    .select('*')
    .eq('id', clientId)
    .single();

  if (!client) {
    console.log(`✗ Client ${clientId} not found`);
    return;
  }

  console.log(`Client ${clientId}:`);
  console.log(`  Email: ${client.email || 'N/A'}`);
  console.log(`  Tokens: ${client.google_oauth_tokens ? '✓ Present' : '✗ Missing'}`);
  console.log(`  Agent paused: ${client.settings?.agent_paused ? 'Yes' : 'No'}`);
  console.log(`  Calendar webhook expires: ${client.settings?.calendar_webhook_expires ? new Date(parseInt(client.settings.calendar_webhook_expires)).toISOString() : 'N/A'}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  agent run --client <id> [--bulk]');
    console.log('  agent run --all [--bulk]');
    console.log('  agent run-outbound --client <id> [--bulk]');
    console.log('  agent send [--client <id>]');
    console.log('  agent pause --client <id>');
    console.log('  agent health --client <id>');
    process.exit(1);
  }

  const command = args[0];

  try {
    if (command === 'run') {
      const bulkMode = args.includes('--bulk');
      if (args.includes('--client')) {
        const clientIndex = args.indexOf('--client');
        const clientId = args[clientIndex + 1];
        if (clientId) {
          await runCommand(clientId, bulkMode);
        } else {
          console.log('Invalid run command. Use: agent run --client <id> [--bulk]');
          process.exit(1);
        }
      } else if (args[1] === '--all') {
        await runCommand(undefined, bulkMode);
      } else {
        console.log('Invalid run command. Use: agent run --client <id> [--bulk] or agent run --all [--bulk]');
        process.exit(1);
      }
    } else if (command === 'run-outbound') {
      const bulkMode = args.includes('--bulk');
      if (args.includes('--client')) {
        const clientIndex = args.indexOf('--client');
        const clientId = args[clientIndex + 1];
        if (clientId) {
          await runOutboundCommand(clientId, bulkMode);
        } else {
          console.log('Invalid run-outbound command. Use: agent run-outbound --client <id> [--bulk]');
          process.exit(1);
        }
      } else {
        console.log('Invalid run-outbound command. Use: agent run-outbound --client <id> [--bulk]');
        process.exit(1);
      }
    } else if (command === 'send') {
      if (args.includes('--client')) {
        const clientIndex = args.indexOf('--client');
        const clientId = args[clientIndex + 1];
        await sendCommand(clientId);
      } else {
        await sendCommand();
      }
    } else if (command === 'pause') {
      if (args[1] === '--client' && args[2]) {
        await pauseCommand(args[2]);
      } else {
        console.log('Invalid pause command. Use: agent pause --client <id>');
        process.exit(1);
      }
    } else if (command === 'health') {
      if (args[1] === '--client' && args[2]) {
        await healthCommand(args[2]);
      } else {
        console.log('Invalid health command. Use: agent health --client <id>');
        process.exit(1);
      }
    } else {
      console.log(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.log(`✗ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
