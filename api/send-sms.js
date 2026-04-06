// Vercel Serverless Function — proxies Fast2SMS to avoid browser CORS
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { numbers, message } = req.body
  const apiKey = process.env.VITE_FAST2SMS_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'Fast2SMS key not configured' })
  }

  if (!numbers || !message) {
    return res.status(400).json({ error: 'Missing numbers or message' })
  }

  try {
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=q&message=${encodeURIComponent(message)}&language=english&flash=0&numbers=${numbers}`

    const response = await fetch(url, { method: 'GET' })
    const data = await response.json()

    console.log('[SMS Proxy] Fast2SMS response:', data)
    return res.status(200).json(data)
  } catch (err) {
    console.error('[SMS Proxy] Error:', err)
    return res.status(500).json({ error: 'SMS send failed' })
  }
}
