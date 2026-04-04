import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSafety } from '../context/SafetyContext'

export default function SafetyLayer() {
  const navigate = useNavigate()
  const { isRecording, startRecording, stopRecording, safetyMode } = useSafety()
  const tapTimesRef = useRef([])
  const isRecordingRef = useRef(isRecording)

  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])

  useEffect(() => {
    if (!safetyMode) return

    // ── Feature 1: Triple-tap detection ──────────────────────────
    const handleTap = () => {
      const now = Date.now()
      tapTimesRef.current = tapTimesRef.current.filter(t => now - t < 800)
      tapTimesRef.current.push(now)

      if (tapTimesRef.current.length >= 3) {
        tapTimesRef.current = []
        if (navigator.vibrate) navigator.vibrate(100)
        if (isRecordingRef.current) {
          stopRecording(true)
        } else {
          startRecording()
        }
      }
    }

    // ── Feature 2: Shake-to-escape ────────────────────────────────
    const handleMotion = (e) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const force = Math.max(Math.abs(a.x || 0), Math.abs(a.y || 0), Math.abs(a.z || 0))
      if (force > 25) {
        stopRecording(false) // discard — emergency escape
        navigate('/')
      }
    }

    document.addEventListener('click', handleTap)
    document.addEventListener('touchend', handleTap)
    window.addEventListener('devicemotion', handleMotion)

    return () => {
      document.removeEventListener('click', handleTap)
      document.removeEventListener('touchend', handleTap)
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [safetyMode, startRecording, stopRecording, navigate])

  return null // Invisible — renders nothing
}
