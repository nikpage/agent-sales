// pages/api/auth/google/callback.js

import { google } from 'googleapis'
import { getTokensFromCode, setCredentials } from '../../../../lib/google-auth'
import { supabase } from '../../../../lib/supabase'

export default async function handler(req, res) {
  const { code, state } = req.query
  if (!code) return res.status(400).end()

  const tokens = await getTokensFromCode(code)

  const { data: existing } = await supabase
    .from('users')
    .select('google_oauth_tokens')
    .eq('id', state)
    .single()

  const merged = {
    ...(existing?.google_oauth_tokens || {}),
    ...tokens,
    refresh_token:
      existing?.google_oauth_tokens?.refresh_token || tokens.refresh_token
  }

  await supabase
    .from('users')
    .update({ google_oauth_tokens: merged })
    .eq('id', state)

  const auth = setCredentials(merged)
  const gmail = google.gmail({ version: 'v1', auth })

  await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: process.env.GMAIL_PUBSUB_TOPIC
    }
  })

  return res.redirect('/')
}
