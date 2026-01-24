// pages/index.js

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const { code, state } = router.query
    if (code && state) {
      router.push(`/api/auth/google/callback?code=${code}&state=${state}`)
    }
  }, [router.query])

  const handleSendPendingEmails = async () => {
    if (!userId || !apiKey) {
      alert('Please enter both user_id and api_key')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/send-pending-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ user_id: userId })
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({ error: data.error || 'Request failed' })
      } else {
        setResult(data)
      }
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Sales Assistant</h1>

      <div style={{ marginTop: '40px', maxWidth: '400px' }}>
        <h2>Send Pending Emails</h2>

        <div style={{ marginBottom: '10px' }}>
          <label>
            User ID:
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
              placeholder="Enter user_id"
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            API Key:
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
              placeholder="Enter api_key"
            />
          </label>
        </div>

        <button
          onClick={handleSendPendingEmails}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Sending...' : 'Send Pending Emails'}
        </button>

        {result && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: result.error ? '#fee' : '#efe', borderRadius: '4px' }}>
            {result.error ? (
              <p style={{ color: 'red', margin: 0 }}>Error: {result.error}</p>
            ) : (
              <>
                <p style={{ margin: '4px 0' }}><strong>Message:</strong> {result.message}</p>
                <p style={{ margin: '4px 0' }}><strong>Sent:</strong> {result.sent}</p>
                <p style={{ margin: '4px 0' }}><strong>Failed:</strong> {result.failed}</p>
                <p style={{ margin: '4px 0' }}><strong>Skipped:</strong> {result.skipped}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
