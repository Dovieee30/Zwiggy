import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSafety } from '../context/SafetyContext'

// SafetyLayer — invisible component mounted globally
// Handles:
//   1. Shake-to-escape (hard shake discards recording, navigates home)
//   2. Voice keyword detection (says "help me" / "bachao" → triggers SOS)

// Keywords that trigger SOS (case-insensitive, partial match)
const SOS_KEYWORDS = [
  'help me', 'help', 'bachao', 'bachaao', 'emergency',
  'save me', 'sos', 'please help', 'call police', 'danger',
]

export default function SafetyLayer() {
  const navigate = useNavigate()
  const { stopRecording, safetyMode, sendLogoSOS, sosActive } = useSafety()
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)

  // ─── Shake-to-escape ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!safetyMode) return

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

  // ─── Voice keyword detection ──────────────────────────────────────────────
  useEffect(() => {
    if (!safetyMode) return

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('[Safety] Speech Recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    // Configuration
    recognition.continuous = true        // Keep listening continuously
    recognition.interimResults = true     // Get partial results for faster detection
    recognition.lang = 'en-IN'           // English (India) — also catches Hindi words
    recognition.maxAlternatives = 3       // More alternatives = better keyword matching

    // Debounce: prevent triggering SOS multiple times in quick succession
    let lastTriggerTime = 0

    recognition.onresult = (event) => {
      // Check all results (both final and interim) for keywords
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim()
        console.log('[Safety] 🎤 Heard:', transcript, event.results[i].isFinal ? '(final)' : '(interim)')

        // Check if any SOS keyword is found in the transcript
        const matched = SOS_KEYWORDS.find(kw => transcript.includes(kw))
        if (matched) {
          const now = Date.now()
          // Debounce: don't re-trigger within 10 seconds
          if (now - lastTriggerTime > 10000) {
            lastTriggerTime = now
            console.log('[Safety] 🚨 Voice SOS triggered! Keyword:', matched)
            sendLogoSOS()
          }
        }
      }
    }

    recognition.onerror = (event) => {
      console.warn('[Safety] Speech error:', event.error)
      // Auto-restart on non-fatal errors
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network') {
        setTimeout(() => {
          if (safetyMode && recognitionRef.current) {
            try { recognitionRef.current.start() } catch (e) { /* already running */ }
          }
        }, 1000)
      }
    }

    recognition.onend = () => {
      // Auto-restart when it stops (browsers stop after ~60s of silence)
      console.log('[Safety] 🎤 Speech recognition ended, restarting...')
      if (safetyMode && recognitionRef.current) {
        setTimeout(() => {
          try { recognitionRef.current.start() } catch (e) { /* already running */ }
        }, 500)
      }
    }

    // Start listening
    try {
      recognition.start()
      isListeningRef.current = true
      console.log('[Safety] 🎤 Voice keyword detection ACTIVE — listening for:', SOS_KEYWORDS.join(', '))
    } catch (e) {
      console.warn('[Safety] Could not start speech recognition:', e.message)
    }

    return () => {
      // Cleanup
      isListeningRef.current = false
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) { /* not running */ }
        recognitionRef.current = null
      }
    }
  }, [safetyMode, sendLogoSOS])

  return null
}
