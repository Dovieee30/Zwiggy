import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const SafetyContext = createContext()

// Base URL for live tracking links — uses current origin (works in dev + production)
const getAppUrl = () => window.location.origin

export function SafetyProvider({ children }) {
  const [isRecording, setIsRecording]   = useState(false)
  const [currentGPS, setCurrentGPS]     = useState(null)
  const [safetyMode, setSafetyMode]     = useState(
    () => localStorage.getItem('appMode') === 'safety'
  )
  const [sosActive, setSosActive]       = useState(false)
  const [sosReplies, setSosReplies]     = useState([])
  const sosChannelRef = useRef(null)

  const isRecordingRef   = useRef(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const startTimeRef     = useRef(null)
  const sosIntervalRef   = useRef(null)
  const gpsWatchRef      = useRef(null)

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
      // Increased to 5s to give the device time to acquire location
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    )
  })

  // ─── SMS via Twilio (FREE trial) — server-side API proxy ────────────────────
  const sendSMS = useCallback(async (numbers, message) => {
    if (numbers.length === 0) {
      console.warn('[Safety] sendSMS called with 0 numbers — skipping')
      return
    }

    console.log('[Safety] Sending SMS to:', numbers.join(', '))

    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: numbers.join(','), message }),
      })

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/html')) {
        throw new Error('API route not available (got HTML)')
      }

      const data = await res.json()
      console.log('[Safety] Twilio API response (status ' + res.status + '):', data)

      if (data.return) {
        console.log('[Safety] ✅ SMS sent via Twilio!', data.results)
      } else {
        console.error('[Safety] ❌ Twilio SMS failed:', data.message, data.results)
      }
    } catch (err) {
      console.error('[Safety] API proxy error:', err.message)
      // Silent failure — no external apps opened
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

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Someone'
    const liveLink = `${getAppUrl()}/live/${user.id}`

    const { data: contacts } = await supabase
      .from('sos_contacts')
      .select('*')
      .eq('user_id', user.id)

    if (!contacts || contacts.length === 0) return

    const message = `SOS! ${userName} needs help. Map: ${mapLink} Track: ${liveLink}`
    const phones  = contacts.filter(c => c.phone).map(c => c.phone)

    sendSMS(phones, message)

    setSosActive(true)

    // Retry every 3 minutes with updated GPS
    sosIntervalRef.current = setInterval(async () => {
      const gps2 = await getGPS()
      const link2 = gps2
        ? `https://maps.google.com/?q=${gps2.lat},${gps2.lng}`
        : mapLink
      const retryMsg = `SOS! ${userName} still needs help. Map: ${link2} Track: ${liveLink}`
      sendSMS(phones, retryMsg)
    }, 3 * 60 * 1000)
  }, [sosActive, sendSMS])

  const cancelSOS = useCallback(() => {
    if (sosIntervalRef.current) {
      clearInterval(sosIntervalRef.current)
      sosIntervalRef.current = null
    }
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current)
      gpsWatchRef.current = null
    }

    // Set tracking as inactive in database
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('live_tracking').update({ is_active: false }).eq('user_id', user.id).then(() => {})
      }
    })

    setSosActive(false)
    setSosReplies([])

    // Unsubscribe from SOS replies channel
    if (sosChannelRef.current) {
      supabase.removeChannel(sosChannelRef.current)
      sosChannelRef.current = null
    }
  }, [])

  // ─── WhatsApp SOS Only ──────────────────────────────────────────────────────
  const sendWhatsAppSOS = useCallback(async () => {
    try {
      const gps = await getGPS()
      const mapLink = gps
        ? `https://maps.google.com/?q=${gps.lat},${gps.lng}`
        : 'Location unavailable'

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Someone'
      const liveLink = `${getAppUrl()}/live/${user.id}`

      const { data: contacts } = await supabase
        .from('sos_contacts')
        .select('*')
        .eq('user_id', user.id)

      if (!contacts || contacts.length === 0) return

      const message = `🚨 SOS! ${userName} needs help!\n\n📍 Maps: ${mapLink}\n🔴 Live: ${liveLink}\n🕐 ${new Date().toLocaleString()}`
      const phones = contacts.filter(c => c.phone).map(c => c.phone)

      if (phones.length === 0) return

      const waMsg = encodeURIComponent(message)
      phones.forEach(phone => {
        window.open(`https://wa.me/91${phone}?text=${waMsg}`, '_blank')
      })
      console.log('[Safety] ✅ WhatsApp SOS opened')
    } catch (err) {
      console.error('[Safety] ❌ WhatsApp SOS failed:', err)
    }
  }, [])

  // ─── Logo SOS (triple-tap logo): Twilio SMS + live tracking ──────────────────
  const sendLogoSOS = useCallback(async () => {
    if (sosActive) return
    console.log('[Safety] 🚨 sendLogoSOS triggered')
    try {
      const gps = await getGPS()
      const mapLink = gps
        ? `https://maps.google.com/?q=${gps.lat},${gps.lng}`
        : 'Location unavailable'
      console.log('[Safety] GPS:', mapLink)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('[Safety] ❌ No authenticated user — cannot send SOS')
        return
      }

      const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Someone'
      const liveLink = `${getAppUrl()}/live/${user.id}`
      console.log('[Safety] User:', user.id, 'Name:', userName, 'Live:', liveLink)

      const { data: contacts, error: contactsErr } = await supabase
        .from('sos_contacts')
        .select('*')
        .eq('user_id', user.id)

      if (contactsErr) {
        console.error('[Safety] ❌ Error fetching contacts:', contactsErr)
        return
      }

      if (!contacts || contacts.length === 0) {
        console.warn('[Safety] ⚠️ No trusted contacts saved — SOS skipped. Add contacts in Saved Addresses.')
        return
      }

      console.log('[Safety] Found', contacts.length, 'contacts:', contacts.map(c => c.phone))

      const message = `SOS! ${userName} needs help! Map: ${mapLink} Live: ${liveLink}`
      
      const phones = contacts.filter(c => c.phone).map(c => c.phone)

      if (phones.length === 0) {
        console.error('[Safety] ❌ Contacts found but none have phone numbers')
        return
      }

      // Start Live Tracking stream to DB
      if (navigator.geolocation) {
        gpsWatchRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords
            setCurrentGPS({ lat, lng })
            console.log('[Safety] Upserting live tracking point:', lat, lng)
            await supabase.from('live_tracking').upsert({
              user_id: user.id,
              lat,
              lng,
              is_active: true,
              updated_at: new Date().toISOString()
            })
          },
          (err) => console.error('[Safety] watchPosition error:', err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        )
      }

      // Send SMS with live tracking link
      await sendSMS(phones, message)

      setSosActive(true)
      setSosReplies([])

      // Subscribe to SOS replies from contacts via Supabase Realtime
      try {
        if (sosChannelRef.current) {
          await supabase.removeChannel(sosChannelRef.current)
          sosChannelRef.current = null
        }
        const channel = supabase.channel(`sos_replies_${user.id}`)
        channel.on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_replies',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (payload.new) {
            console.log('[Safety] 📩 SOS reply received:', payload.new)
            setSosReplies(prev => [payload.new, ...prev])
          }
        })
        channel.subscribe()
        sosChannelRef.current = channel
        console.log('[Safety] 📡 Subscribed to sos_replies for user:', user.id)
      } catch (channelErr) {
        console.warn('[Safety] ⚠️ Realtime subscription failed (SOS still sent):', channelErr.message)
      }

      // Retry every 3 minutes with updated GPS
      sosIntervalRef.current = setInterval(async () => {
        const gps2 = await getGPS()
        const link2 = gps2
          ? `https://maps.google.com/?q=${gps2.lat},${gps2.lng}`
          : mapLink
        const retryMsg = `SOS UPDATE: ${userName} still needs help. Map: ${link2} Live: ${liveLink}`
        sendSMS(phones, retryMsg)
      }, 3 * 60 * 1000)

      console.log('[Safety] ✅ SOS dispatched to:', phones.join(', '))
    } catch (err) {
      console.error('[Safety] ❌ Logo SOS failed:', err)
    }
  }, [sosActive, sendSMS])

  // ─── Recording ──────────────────────────────────────────────────────────────
  const recordingGpsWatchRef = useRef(null)
  const latestGpsRef         = useRef(null)
  const currentGpsRef        = useRef(null)

  // Keep currentGpsRef always in sync with currentGPS state
  useEffect(() => {
    currentGpsRef.current = currentGPS
  }, [currentGPS])

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

      // Continuously track GPS throughout the recording for maximum accuracy
      latestGpsRef.current = null
      if (navigator.geolocation) {
        recordingGpsWatchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const gps = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            latestGpsRef.current = gps
            setCurrentGPS(gps)
          },
          (err) => console.warn('[Safety] GPS watch error:', err.message),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        )
      }

      // Also grab an immediate one-shot GPS in case watchPosition is slow
      try {
        const immediateGps = await getGPS()
        if (immediateGps && !latestGpsRef.current) {
          latestGpsRef.current = immediateGps
          setCurrentGPS(immediateGps)
        }
      } catch (e) {
        console.warn('[Safety] Immediate GPS failed:', e)
      }

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

    // Stop the GPS watcher that was tracking during recording
    if (recordingGpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(recordingGpsWatchRef.current)
      recordingGpsWatchRef.current = null
    }

    // Use the latest GPS position captured during the recording (most accurate)
    // Read from ref to avoid stale closure — currentGpsRef always has the latest value
    const finalGps = latestGpsRef.current || currentGpsRef.current

    // If we still don't have GPS, do a last-ditch one-shot attempt
    let resolvedGps = finalGps
    if (!resolvedGps) {
      try {
        resolvedGps = await getGPS()
      } catch (e) {
        console.warn('[Safety] Last-ditch GPS failed:', e)
      }
    }

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
        gps_lat:          resolvedGps?.lat ?? null,
        gps_lng:          resolvedGps?.lng ?? null,
        duration_seconds: duration,
        trigger_type:     'triple_tap',
        aggression_level: 'recorded',
      })

      if (dbErr) console.error('[Safety] DB insert failed:', dbErr)
      else console.log('[Safety] Evidence saved to vault ✅', resolvedGps ? `GPS: ${resolvedGps.lat}, ${resolvedGps.lng}` : 'No GPS')

    } catch (err) {
      console.error('[Safety] stopRecording error:', err)
    }
  }, [])

  // ─── "I'm Safe" — stop everything at once ───────────────────────────────────
  // ─── Clear SOS replies (used when dismissing notifications) ─────────────────
  const clearSosReplies = useCallback(() => {
    setSosReplies([])
  }, [])

  const goSafe = useCallback(() => {
    cancelSOS()
    if (isRecordingRef.current) stopRecording(false) // discard — emergency stop
    setCurrentGPS(null)
  }, [cancelSOS, stopRecording])

  return (
    <SafetyContext.Provider value={{
      isRecording, isRecordingRef, currentGPS, safetyMode, sosActive, sosReplies,
      activateSafetyMode, startRecording, stopRecording,
      sendSOS, sendLogoSOS, sendWhatsAppSOS, cancelSOS, goSafe, clearSosReplies,
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
