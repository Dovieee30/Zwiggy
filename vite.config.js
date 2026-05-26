import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev plugin — proxies /api/send-sms so SMS works without Vercel
function localSmsApi() {
  return {
    name: 'local-sms-api',
    configureServer(server) {
      server.middlewares.use('/api/send-sms', async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        // Parse JSON body
        let body = ''
        for await (const chunk of req) body += chunk
        let parsed
        try { parsed = JSON.parse(body) } catch { parsed = {} }

        const { numbers, message } = parsed
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken  = process.env.TWILIO_AUTH_TOKEN
        const fromNumber = process.env.TWILIO_PHONE_NUMBER

        console.log('[Local SMS] Twilio config — SID:', !!accountSid, 'Token:', !!authToken, 'From:', fromNumber)

        if (!accountSid || !authToken || !fromNumber) {
          res.statusCode = 500
          res.end(JSON.stringify({
            error: 'Twilio credentials not configured',
            hint: 'Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to your .env file',
          }))
          return
        }

        if (!numbers || !message) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing numbers or message' }))
          return
        }

        const phoneList = numbers.split(',').map(n => n.trim()).filter(Boolean)
        console.log('[Local SMS] Sending to', phoneList.length, 'numbers via Twilio')

        const results = []

        for (const phone of phoneList) {
          try {
            const toNumber = phone.startsWith('+') ? phone : `+91${phone}`
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

            const params = new URLSearchParams({ To: toNumber, From: fromNumber, Body: message })

            const response = await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            })

            const data = await response.json()
            console.log(`[Local SMS] Twilio response for ${toNumber}:`, JSON.stringify(data))

            if (data.sid) {
              results.push({ phone: toNumber, success: true, sid: data.sid, status: data.status })
            } else {
              results.push({ phone: toNumber, success: false, error: data.message || data.code })
            }
          } catch (err) {
            console.error(`[Local SMS] Error sending to ${phone}:`, err.message)
            results.push({ phone, success: false, error: err.message })
          }
        }

        const anySuccess = results.some(r => r.success)
        res.statusCode = anySuccess ? 200 : 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          return: anySuccess,
          message: anySuccess ? 'SMS sent successfully via Twilio' : 'All SMS attempts failed',
          results,
        }))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load ALL env vars (including TWILIO_* without VITE_ prefix) into process.env
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), localSmsApi()],
    server: {
      port: 5173,
    },
    optimizeDeps: {
      exclude: ['jspdf'],
    },
  }
})
