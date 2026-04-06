import React, { createContext, useContext, useState, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const SafetyContext = createContext()

export function SafetyProvider({ children }) {
  const [isRecording, setIsRecording]   = useState(false)
  const [currentGPS, setCurrentGPS]     = useState(null)
  const [safetyMode, setSafetyMode]     = useState(
    () => localStorage.getItem('appMode') === 'safety'
  )
  const [sosActive, setSosActive]       = useState(false)

  const isRecordingRef   = useRef(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const startTimeRef     = useRef(null)
  const sosIntervalRef   = useRef(null)

  // ─── Safety mode ────────────────────────────────────────────────────────────
  const activateSafetyMode = useCallback(() => {
    localStorage.setItem('appMode', 'safety')
    setSafetyMode(true)
  }, [])

  // ─── GPS ────────────────────────────────────────────────────────────────────
  const getGPS = () => new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    )
  })

  // ─── SMS — tries API proxy first, falls back to direct call ─────────────────
  const sendSMS = useCallback(async (numbers, message) => {
    if (numbers.length === 0) return
    try {
      // Try server-side API proxy first (works on Vercel)
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: numbers.join(','), message }),
      })

      // If the API route returned HTML (SPA fallback), it means we're on localhost
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/html')) {
        throw new Error('API route not available — falling back to direct call')
      }

      const data = await res.json()
      console.log('[Safety] SMS API response:', data)
    } catch (err) {
      console.warn('[Safety] API proxy failed, trying direct Fast2SMS:', err.message)
      // Fallback: call Fast2SMS directly (may fail due to CORS on some browsers)
      try {
        const key = import.meta.env.VITE_FAST2SMS_KEY
        if (!key) { console.error('[Safety] No FAST2SMS key found'); return }
        const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${key}&route=q&message=${encodeURIComponent(message)}&language=english&flash=0&numbers=${numbers.join(',')}`
        const r = await fetch(url)
        const d = await r.json()
        console.log('[Safety] Direct Fast2SMS response:', d)
      } catch (e2) {
        console.error('[Safety] Direct SMS also failed (CORS):', e2.message)
      }
    }
  }, [])

  // ─── SOS ────────────────────────────────────────────────────────────────────
  const sendSOS = useCallback(async () => {
    if (sosActive) return

    const gps = await getGPS()
    const mapLink = gps
      ? `https://maps.google.com/?q=${gps.lat},${gps.lng}`
      : 'Location unavailable'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: contacts } = await supabase
      .from('sos_contacts')
      .select('*')
      .eq('user_id', user.id)

    if (!contacts || contacts.length === 0) return

    const message = `URGENT: I need help! My location: ${mapLink} — Time: ${new Date().toLocaleString()}`
    const phones  = contacts.filter(c => c.phone).map(c => c.phone)

    // Send SMS via Fast2SMS
    sendSMS(phones, message)

    // Also open WhatsApp as backup on mobile
    const waMsg = encodeURIComponent(`🚨 ${message}`)
    contacts.forEach(c => {
      if (c.phone) window.open(`https://wa.me/91${c.phone}?text=${waMsg}`, '_blank')
    })

    setSosActive(true)

    // Retry every 3 minutes
    sosIntervalRef.current = setInterval(async () => {
      const gps2 = await getGPS()
      const link2 = gps2
        ? `https://maps.google.com/?q=${gps2.lat},${gps2.lng}`
        : mapLink
      const retryMsg = `URGENT (retry): I still need help! Location: ${link2} — Time: ${new Date().toLocaleString()}`
      sendSMS(phones, retryMsg)
    }, 3 * 60 * 1000)
  }, [sosActive, sendSMS])

  const cancelSOS = useCallback(() => {
    if (sosIntervalRef.current) {
      clearInterval(sosIntervalRef.current)
      sosIntervalRef.current = null
    }
    setSosActive(false)
  }, [])

  // ─── Logo SOS (triple-tap logo): SMS only via Fast2SMS ─────────────────────
  const sendLogoSOS = useCallback(async () => {
    try {
      const gps = await getGPS()
      const mapLink = gps
        ? `https://maps.google.com/?q=${gps.lat},${gps.lng}`
        : 'Location unavailable'

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: contacts } = await supabase
        .from('sos_contacts')
        .select('*')
        .eq('user_id', user.id)

      if (!contacts || contacts.length === 0) {
        console.warn('[Safety] No trusted contacts saved — SOS skipped')
        return
      }

      const message = `URGENT: I need help! My location: ${mapLink} — Time: ${new Date().toLocaleString()}`
      const phones = contacts.filter(c => c.phone).map(c => c.phone)

      // SMS via Fast2SMS (through API proxy)
      await sendSMS(phones, message)
      console.log('[Safety] ✅ SOS SMS sent to:', phones.join(', '))
    } catch (err) {
      console.error('[Safety] Logo SOS failed:', err)
    }
  }, [sendSMS])

  // ─── Recording ──────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Pick the first mimeType the browser supports
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        '',   // let browser choose
      ].find(t => t === '' || MediaRecorder.isTypeSupported(t))

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      startTimeRef.current     = Date.now()
      setIsRecording(true)
      isRecordingRef.current   = true

      // GPS in background
      getGPS().then(setCurrentGPS)

      // Auto-stop at 60s
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') stopRecording(true)
      }, 60000)
    } catch (err) {
      console.error('[Safety] startRecording failed:', err)
    }
  }, [])

  const stopRecording = useCallback(async (save = true) => {
    const rec = mediaRecorderRef.current
    if (!rec || rec.state === 'inactive') return
    isRecordingRef.current = false

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const usedMime = rec.mimeType || 'audio/webm'  // capture before stopping
    rec.stop()
    rec.stream?.getTracks().forEach(t => t.stop())
    setIsRecording(false)
    isRecordingRef.current = false

    if (!save) return

    // Wait for final ondataavailable chunks to flush
    await new Promise(r => setTimeout(r, 800))

    let audioUrl = null

    // ── Convert audio to base64 data URL (no storage bucket needed) ───────────
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const blob = new Blob(audioChunksRef.current, { type: usedMime })
      console.log('[Safety] Saving recording:', blob.size, 'bytes,', duration, 's, mimeType:', usedMime)

      if (blob.size > 0) {
        // Convert blob → base64 data URL so we can store it in the DB directly
        audioUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror   = reject
          reader.readAsDataURL(blob)
        })
        console.log('[Safety] Audio converted to data URL, length:', audioUrl.length)
      } else {
        console.warn('[Safety] No audio chunks captured — microphone may have been muted')
      }

      // ── Always save the DB record, even if audio upload failed ─────────────
      const { error: dbErr } = await supabase.from('evidence_vault').insert({
        user_id:          user.id,
        audio_url:        audioUrl,          // null if upload failed
        gps_lat:          currentGPS?.lat ?? null,
        gps_lng:          currentGPS?.lng ?? null,
        duration_seconds: duration,
        trigger_type:     'triple_tap',
        aggression_level: 'recorded',
      })

      if (dbErr) console.error('[Safety] DB insert failed:', dbErr)
      else console.log('[Safety] Evidence saved to vault ✅')

    } catch (err) {
      console.error('[Safety] stopRecording error:', err)
    }
  }, [currentGPS])

  // ─── "I'm Safe" — stop everything at once ───────────────────────────────────
  const goSafe = useCallback(() => {
    cancelSOS()
    if (isRecordingRef.current) stopRecording(false) // discard — emergency stop
    setCurrentGPS(null)
  }, [cancelSOS, stopRecording])

  return (
    <SafetyContext.Provider value={{
      isRecording, isRecordingRef, currentGPS, safetyMode, sosActive,
      activateSafetyMode, startRecording, stopRecording,
      sendSOS, sendLogoSOS, cancelSOS, goSafe,
    }}>
      {children}
    </SafetyContext.Provider>
  )
}

export function useSafety() {
  const ctx = useContext(SafetyContext)
  if (!ctx) throw new Error('useSafety must be used within SafetyProvider')
  return ctx
}
