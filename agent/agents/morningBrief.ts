import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifySignature } from '../../lib/security';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifySignature(req.query)) {
    return res.status(401).send('<h1>⛔ Neplatný odkaz</h1>');
  }

  const { action, id } = req.query;

  try {
    if (action === 'complete_todo') {
      await supabase.from('todos').update({ status: 'completed' }).eq('id', id);
      return res.send('<h1>✅ Úkol dokončen</h1>');
    }

    if (action === 'snooze_todo') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await supabase.from('todos').update({ due_date: tomorrow.toISOString().split('T')[0] }).eq('id', id);
      return res.send('<h1>📅 Úkol přesunut na zítra</h1>');
    }

    if (action === 'accept_event') {
      await supabase.from('events').update({ status: 'confirmed' }).eq('id', id);
      return res.send('<h1>✅ Událost potvrzena</h1>');
    }

    if (action === 'reject_event') {
      await supabase.from('events').update({ status: 'rejected' }).eq('id', id);
      return res.send('<h1>❌ Událost zrušena</h1>');
    }

    if (action === 'reschedule_event') {
      return res.send('<h1>⏰ Navrhněte nový čas</h1><p>Tato funkce bude brzy dostupná.</p>');
    }

    if (action === 'approve_suggestion') {
      try {
        const { data: todo } = await supabase.from('todos').select('user_id').eq('id', id).single();

        if (!todo) {
          await supabase.from('agent_errors').insert({
            user_id: null,
            agent_type: 'cmd_action',
            message_user: 'Todo not found',
            message_internal: `Action: approve_suggestion\nId: ${id}\nError: Todo not found`
          });
          return res.status(404).send('<h1>⚠️ Úkol nenalezen</h1>');
        }

        await supabase.from('todos').update({ status: 'approved' }).eq('id', id);
        return res.send('<h1>✅ Návrh schválen</h1>');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const { data: todo } = await supabase.from('todos').select('user_id').eq('id', id).single();
        await supabase.from('agent_errors').insert({
          user_id: todo?.user_id || null,
          agent_type: 'cmd_action',
          message_user: 'Failed to approve suggestion',
          message_internal: `Action: approve_suggestion\nId: ${id}\nError: ${errorMsg}`
        });
        return res.status(500).send('<h1>❌ Chyba při schvalování</h1>');
      }
    }

    if (action === 'reject_suggestion') {
      try {
        const { data: todo } = await supabase.from('todos').select('user_id').eq('id', id).single();

        if (!todo) {
          await supabase.from('agent_errors').insert({
            user_id: null,
            agent_type: 'cmd_action',
            message_user: 'Todo not found',
            message_internal: `Action: reject_suggestion\nId: ${id}\nError: Todo not found`
          });
          return res.status(404).send('<h1>⚠️ Úkol nenalezen</h1>');
        }

        await supabase.from('todos').update({ status: 'rejected' }).eq('id', id);
        return res.send('<h1>❌ Návrh zamítnut</h1>');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const { data: todo } = await supabase.from('todos').select('user_id').eq('id', id).single();
        await supabase.from('agent_errors').insert({
          user_id: todo?.user_id || null,
          agent_type: 'cmd_action',
          message_user: 'Failed to reject suggestion',
          message_internal: `Action: reject_suggestion\nId: ${id}\nError: ${errorMsg}`
        });
        return res.status(500).send('<h1>❌ Chyba při zamítání</h1>');
      }
    }

    if (action === 'snooze_suggestion') {
      try {
        const { data: todo } = await supabase.from('todos').select('user_id').eq('id', id).single();

        if (!todo) {
          await supabase.from('agent_errors').insert({
            user_id: null,
            agent_type: 'cmd_action',
            message_user: 'Todo not found',
            message_internal: `Action: snooze_suggestion\nId: ${id}\nError: Todo not found`
          });
          return res.status(404).send('<h1>⚠️ Úkol nenalezen</h1>');
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await supabase.from('todos').update({ due_date: tomorrow.toISOString().split('T')[0] }).eq('id', id);
        return res.send('<h1>📅 Návrh odložen na zítra</h1>');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const { data: todo } = await supabase.from('todos').select('user_id').eq('id', id).single();
        await supabase.from('agent_errors').insert({
          user_id: todo?.user_id || null,
          agent_type: 'cmd_action',
          message_user: 'Failed to snooze suggestion',
          message_internal: `Action: snooze_suggestion\nId: ${id}\nError: ${errorMsg}`
        });
        return res.status(500).send('<h1>❌ Chyba při odkládání</h1>');
      }
    }

    res.send('<h1>❓ Neznámá akce</h1>');
  } catch (err: any) {
    res.status(500).send('<h1>❌ Chyba: ' + err.message + '</h1>');
  }
}
