console.log("CID:",process.env.GOOGLE_CLIENT_ID,"REDIR:",process.env.GOOGLE_REDIRECT_URI)
import { getAuthUrl } from '../../../lib/google-auth'

export default function handler(req, res) {
  const url = getAuthUrl()
  res.status(200).json({ url })
}
