import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSafety } from '../context/SafetyContext'

export default function Vault({ onBack }) {
  const navigate  = useNavigate()
  const { currentGPS } = useSafety()

  const [evidence,  setEvidence]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sosStatus, setSosStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    const { data: ev } = await supabase
      .from('evidence_vault')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setEvidence(ev || [])
    setLoading(false)
  }

  const generatePDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.setTextColor(40, 44, 63)
    doc.text('Evidence Report', 20, 20)

    doc.setFontSize(11)
    doc.setTextColor(104, 107, 120)
    doc.text(`Generated for legal use — ${new Date().toLocaleString()}`, 20, 30)

    doc.setFontSize(10)
    doc.setTextColor(40, 44, 63)

    let y = 45
    evidence.forEach((ev, i) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.setTextColor(252, 128, 25)
      doc.text(`Recording ${i + 1}`, 20, y)
      y += 7
      doc.setFontSize(9)
      doc.setTextColor(40, 44, 63)
      doc.text(`Date:     ${new Date(ev.created_at).toLocaleString()}`, 25, y); y += 6
      doc.text(`Duration: ${ev.duration_seconds}s`, 25, y); y += 6
      doc.text(`GPS:      ${ev.gps_lat ? `${ev.gps_lat}, ${ev.gps_lng}` : 'Not captured'}`, 25, y); y += 6
      doc.text(`Type:     ${ev.trigger_type}`, 25, y); y += 6
      doc.text(`Audio:    ${ev.audio_url ? 'Recorded' : 'Not available'}`, 25, y); y += 10
      doc.line(20, y, 190, y); y += 8
    })

    doc.save('evidence_report.pdf')
  }

  const sendSOS = async () => {
    let lat = currentGPS?.lat
    let lng = currentGPS?.lng

    if (!lat && navigator.geolocation) {
      await new Promise(res => navigator.geolocation.getCurrentPosition(
        p => { lat = p.coords.latitude; lng = p.coords.longitude; res() },
        res, { timeout: 5000 }
      ))
    }

    const mapLink = lat ? `https://maps.google.com/?q=${lat},${lng}` : 'Location unavailable'

    // Fetch user info for personalized message
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Someone'

    const msg = encodeURIComponent(
      `URGENT: ${userName} needs help!\nLocation: ${mapLink}\nTime: ${new Date().toLocaleString()}`
    )

    // Fetch contacts on-the-fly for SOS
    const { data: contacts } = await supabase.from('sos_contacts').select('*').eq('user_id', user.id)

    if (!contacts || contacts.length === 0) { setSosStatus('No contacts saved!'); return }

    contacts.forEach(c => {
      if (c.phone) window.open(`https://wa.me/91${c.phone}?text=${msg}`, '_blank')
    })

    setSosStatus(`✅ SOS sent to ${contacts.length} contact${contacts.length > 1 ? 's' : ''}!`)
    setTimeout(() => setSosStatus(''), 5000)
  }

  const deleteEvidence = async (id) => {
    await supabase.from('evidence_vault').delete().eq('id', id)
    setEvidence(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#1a1a2e' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3" style={{ backgroundColor: '#16213e' }}>
        <button onClick={() => onBack ? onBack() : navigate('/profile')} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Evidence Vault 🔒</h1>
          <p className="text-xs text-gray-400">{evidence.length} recording{evidence.length !== 1 ? 's' : ''} stored</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={loadData}
            className="text-xs font-bold px-3 py-2 rounded-xl text-white bg-white/10 hover:bg-white/20"
          >
            ↻ Refresh
          </button>
          <button onClick={generatePDF} className="text-xs font-bold px-3 py-2 rounded-xl text-white" style={{ backgroundColor: '#FC8019' }}>
            PDF Report
          </button>
        </div>
      </div>

      {/* SOS Button */}
      <div className="mx-4 mt-4">
        <button
          onClick={sendSOS}
          className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg bg-red-600 hover:bg-red-700 transition-colors"
        >
          🆘 SEND SOS TO ALL CONTACTS
        </button>
        {sosStatus && (
          <p className="text-center text-sm font-semibold mt-2" style={{ color: '#FC8019' }}>{sosStatus}</p>
        )}
      </div>

      {/* Evidence list */}
      <div className="mx-4 mt-5">
        <h2 className="text-white font-bold mb-3">Recordings</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton rounded-2xl h-24 bg-white/10" />)}
          </div>
        ) : evidence.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🎙️</p>
            <p className="font-semibold text-white mb-1">No recordings yet</p>
            <p className="text-sm">Go to Home screen → triple-tap 3 times to start recording.</p>
            <p className="text-xs mt-2 opacity-60">Then triple-tap again to stop &amp; save.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {evidence.map(ev => (
              <div key={ev.id} className="rounded-2xl p-4" style={{ backgroundColor: '#16213e' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{new Date(ev.created_at).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/50" style={{ color: '#FC8019' }}>
                        {ev.duration_seconds}s
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">
                        {ev.aggression_level}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => deleteEvidence(ev.id)} className="text-red-400 hover:text-red-300 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {ev.audio_url ? (
                  <audio controls src={ev.audio_url} className="w-full mt-3 rounded-xl" style={{ accentColor: '#FC8019' }} />
                ) : (
                  <p className="text-xs text-yellow-500 mt-2">⚠️ Audio upload failed — recording metadata only</p>
                )}

                {ev.gps_lat && ev.gps_lng ? (
                  <a
                    href={`https://maps.google.com/?q=${ev.gps_lat},${ev.gps_lng}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 mt-2 text-blue-400 text-xs font-semibold"
                  >
                    📍 {Number(ev.gps_lat).toFixed(4)}, {Number(ev.gps_lng).toFixed(4)} — Open in Maps
                  </a>
                ) : (
                  <p className="text-xs text-gray-600 mt-2">📍 Location not captured</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
