// api/auth/google/index.ts

import { getAuthUrl } from '../../../../lib/google-auth';

export default function handler(req: any, res: any) {
  console.log('AUTH START:', {
    userId: req.query.user_id,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  });

  const userId = req.query.user_id;
  const baseUrl = getAuthUrl();
  const url = baseUrl + `&state=${encodeURIComponent(userId)}`;

  console.log('REDIRECT TO:', url);

  res.redirect(url);
}
