import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSafety } from '../context/SafetyContext'

// SafetyLayer — invisible component mounted globally
// ONLY handles shake-to-escape. Triple-tap recording is handled per-page in Home.jsx
// to avoid firing on every click across all pages.

export default function SafetyLayer() {
  const navigate = useNavigate()
  const { stopRecording, safetyMode } = useSafety()

  useEffect(() => {
    if (!safetyMode) return

    // Shake-to-escape: hard shake discards recording and goes to home
    const handleMotion = (e) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const force = Math.max(Math.abs(a.x || 0), Math.abs(a.y || 0), Math.abs(a.z || 0))
      if (force > 25) {
        stopRecording(false) // discard — emergency escape
        navigate('/')
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [safetyMode, stopRecording, navigate])

  return null
}
