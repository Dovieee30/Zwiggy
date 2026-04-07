// Vercel Serverless Function — sends SMS via Twilio (FREE trial, reliable delivery)
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

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  console.log('[SMS Proxy] Twilio config — SID:', !!accountSid, 'Token:', !!authToken, 'From:', fromNumber)

  if (!accountSid || !authToken || !fromNumber) {
    return res.status(500).json({
      error: 'Twilio credentials not configured',
      hint: 'Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in Vercel Environment Variables',
    })
  }

  if (!numbers || !message) {
    return res.status(400).json({ error: 'Missing numbers or message' })
  }

  // Split comma-separated numbers
  const phoneList = numbers.split(',').map(n => n.trim()).filter(Boolean)
  console.log('[SMS Proxy] Sending to', phoneList.length, 'numbers via Twilio')

  const results = []

  for (const phone of phoneList) {
    try {
      // Add +91 for Indian numbers if not already in E.164 format
      const toNumber = phone.startsWith('+') ? phone : `+91${phone}`

      // Twilio REST API — no npm package needed
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

      const body = new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: message,
      })

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      const data = await response.json()
      console.log(`[SMS Proxy] Twilio response for ${toNumber}:`, JSON.stringify(data))

      if (data.sid) {
        results.push({ phone: toNumber, success: true, sid: data.sid, status: data.status })
      } else {
        results.push({ phone: toNumber, success: false, error: data.message || data.code })
      }
    } catch (err) {
      console.error(`[SMS Proxy] Error sending to ${phone}:`, err.message)
      results.push({ phone, success: false, error: err.message })
    }
  }

  const anySuccess = results.some(r => r.success)
  return res.status(anySuccess ? 200 : 500).json({
    return: anySuccess,
    message: anySuccess ? 'SMS sent successfully via Twilio' : 'All SMS attempts failed',
    results,
  })
}
