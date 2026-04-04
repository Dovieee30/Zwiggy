import React, { createContext, useContext, useState, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const SafetyContext = createContext()

export function SafetyProvider({ children }) {
  const [isRecording, setIsRecording] = useState(false)
  const [currentGPS, setCurrentGPS] = useState(null)
  const [safetyMode, setSafetyMode] = useState(
    () => localStorage.getItem('appMode') === 'safety'
  )
  const [sosActive, setSosActive] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const startTimeRef     = useRef(null)
  const sosIntervalRef   = useRef(null)

  const activateSafetyMode = useCallback(() => {
    localStorage.setItem('appMode', 'safety')
    setSafetyMode(true)
  }, [])

  const getGPS = () => new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    )
  })

  // ─── SOS ────────────────────────────────────────────────────────────────────
  const sendSOS = useCallback(async () => {
    if (sosActive) return // already running

    const gps = await getGPS()
    const mapLink = gps
      ? `https://maps.google.com/?q=${gps.lat},${gps.lng}`
      : 'Location unavailable'
    const time = new Date().toLocaleString()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: contacts } = await supabase
      .from('sos_contacts')
      .select('*')
      .eq('user_id', user.id)

    if (!contacts || contacts.length === 0) return

    const dispatchMessages = () => {
      const msg = encodeURIComponent(
        `🚨 URGENT: I need help! My location: ${mapLink} — Time: ${new Date().toLocaleString()}`
      )
      contacts.forEach(c => {
        if (c.phone) window.open(`https://wa.me/91${c.phone}?text=${msg}`, '_blank')
      })
    }

    // Send immediately
    dispatchMessages()
    setSosActive(true)

    // Retry every 3 minutes
    sosIntervalRef.current = setInterval(() => {
      dispatchMessages()
    }, 3 * 60 * 1000)
  }, [sosActive])

  const cancelSOS = useCallback(() => {
    if (sosIntervalRef.current) {
      clearInterval(sosIntervalRef.current)
      sosIntervalRef.current = null
    }
    setSosActive(false)
  }, [])

  // ─── Recording ──────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      startTimeRef.current = Date.now()
      setIsRecording(true)

      // GPS in background
      getGPS().then(setCurrentGPS)

      // Fake notification (decoy)
      if ('Notification' in window) {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('Zwiggy', {
            body: "Your order from McDonald's is confirmed! 🎉",
          })
        })
      }

      // Auto-stop at 60s
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') stopRecording(true)
      }, 60000)
    } catch {
      // Microphone not available — fail silently
    }
  }, [isRecording])

  const stopRecording = useCallback(async (save = true) => {
    const rec = mediaRecorderRef.current
    if (!rec || rec.state === 'inactive') return

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
    rec.stop()
    rec.stream?.getTracks().forEach(t => t.stop())
    setIsRecording(false)

    if (!save) return

    await new Promise(r => setTimeout(r, 600))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const fileName = `evidence_${user.id}_${Date.now()}.webm`

      const { error: uploadErr } = await supabase.storage
        .from('evidence-audio')
        .upload(fileName, blob, { contentType: 'audio/webm' })

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage
        .from('evidence-audio')
        .getPublicUrl(fileName)

      await supabase.from('evidence_vault').insert({
        user_id: user.id,
        audio_url: publicUrl,
        gps_lat: currentGPS?.lat ?? null,
        gps_lng: currentGPS?.lng ?? null,
        duration_seconds: duration,
        trigger_type: 'triple_tap',
        aggression_level: 'recorded',
      })
    } catch {
      // Silent fail
    }
  }, [currentGPS])

  return (
    <SafetyContext.Provider value={{
      isRecording, currentGPS, safetyMode, sosActive,
      activateSafetyMode, startRecording, stopRecording,
      sendSOS, cancelSOS,
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

