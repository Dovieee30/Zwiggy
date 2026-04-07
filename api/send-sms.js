// Vercel Serverless Function — sends SMS via Textbelt (FREE, no signup needed)
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { numbers, message } = req.body || {}

  if (!numbers || !message) {
    return res.status(400).json({ error: 'Missing numbers or message' })
  }

  // Split comma-separated numbers
  const phoneList = numbers.split(',').map(n => n.trim()).filter(Boolean)
  console.log('[SMS Proxy] Sending to', phoneList.length, 'numbers via Textbelt')

  const results = []

  for (const phone of phoneList) {
    try {
      // Textbelt needs E.164 format — add +91 for Indian numbers
      const e164 = phone.startsWith('+') ? phone : `+91${phone}`

      const response = await fetch('https://textbelt.com/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: e164,
          message: message,
          key: 'textbelt',   // FREE tier — 1 SMS/day, no signup required
        }),
      })

      const data = await response.json()
      console.log(`[SMS Proxy] Textbelt response for ${e164}:`, JSON.stringify(data))
      results.push({ phone: e164, ...data })
    } catch (err) {
      console.error(`[SMS Proxy] Error sending to ${phone}:`, err.message)
      results.push({ phone, success: false, error: err.message })
    }
  }

  const anySuccess = results.some(r => r.success)
  return res.status(anySuccess ? 200 : 500).json({
    return: anySuccess,
    message: anySuccess ? 'SMS sent successfully' : 'All SMS attempts failed',
    results,
  })
}
