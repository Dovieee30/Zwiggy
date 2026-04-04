import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const DECOY_NAMES = ['Behrouz Biryani','Burger King','Pizza Hut','Domino\'s','KFC','McDonald\'s','Subway','Barbeque Nation']
const statusMap   = { confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' }

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)   return `${m} min ago`
  if (m < 1440) return `${Math.floor(m / 60)} hr ago`
  return `${Math.floor(m / 1440)} days ago`
}

export default function Orders() {
  const [orders,    setOrders]    = useState([])
  const [evidence,  setEvidence]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [sheet,     setSheet]     = useState(null)   // evidence record to show in bottom sheet
  const pressTimer  = useRef(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: ords }, { data: evid }] = await Promise.all([
        supabase.from('orders').select('*, restaurants(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('evidence_vault').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      setOrders(ords || [])
      setEvidence(evid || [])
      setLoading(false)
    }
    load()
  }, [])

  // Combine and shuffle them visually
  const combined = [
    ...(orders.map(o => ({ type: 'order', data: o }))),
    ...(evidence.map(e => ({
      type: 'evidence',
      data: {
        ...e,
        _decoyName: DECOY_NAMES[parseInt(e.id?.slice(-2), 16) % DECOY_NAMES.length] || 'Biryani House',
        _refCode: e.id?.slice(-4).toUpperCase() || 'XXXX',
      }
    }))),
  ].sort((a, b) => new Date(b.data.created_at) - new Date(a.data.created_at))

  const startLongPress = useCallback((item) => {
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(200)
      setSheet(item.data)
    }, 1500)
  }, [])

  const cancelLongPress = useCallback(() => {
    clearTimeout(pressTimer.current)
  }, [])

  const deleteEvidence = async (id) => {
    await supabase.from('evidence_vault').delete().eq('id', id)
    setEvidence(prev => prev.filter(e => e.id !== id))
    setSheet(null)
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col gap-3 p-4 pb-24" style={{ backgroundColor: '#F2F2F2' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 skeleton h-24" />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-6" style={{ backgroundColor: '#F2F2F2' }}>
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <h1 className="text-xl font-bold mb-4" style={{ color: '#282C3F' }}>Your Orders</h1>

        {combined.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
            <div className="text-7xl">📦</div>
            <p className="font-bold text-xl" style={{ color: '#282C3F' }}>No orders yet</p>
            <p className="text-sm" style={{ color: '#686B78' }}>Your orders will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {combined.map((item, idx) => {
              const isEv = item.type === 'evidence'
              const d    = item.data

              const restaurantName = isEv
                ? d._decoyName
                : (d.restaurants?.name || 'Restaurant')

              const subtitle = isEv
                ? `Ref #${d._refCode} • Completed`
                : `₹${d.total} • ${statusMap[d.status] || d.status}`

              const time = timeSince(d.created_at)

              return (
                <div
                  key={`${item.type}-${d.id}`}
                  onMouseDown={() => isEv && startLongPress(item)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => isEv && startLongPress(item)}
                  onTouchEnd={cancelLongPress}
                  className="bg-white rounded-2xl px-4 py-4 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow select-none"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFF3E8' }}>
                    <span className="text-2xl">{isEv ? '🍱' : '🛵'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: '#282C3F' }}>Order from {restaurantName}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#686B78' }}>{subtitle}</p>
                    <p className="text-xs mt-1 font-medium" style={{ color: '#FC8019' }}>{time}</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#ccc' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Evidence bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheet(null)} />
          <div className="relative bg-white rounded-t-3xl p-6 sheet-up max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="font-bold text-lg mb-4" style={{ color: '#282C3F' }}>Recording Details</h3>

            {/* Audio player */}
            {sheet.audio_url && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">AUDIO RECORDING</p>
                <audio controls src={sheet.audio_url} className="w-full rounded-xl" />
              </div>
            )}

            {/* GPS */}
            {sheet.gps_lat && sheet.gps_lng && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">LOCATION</p>
                <a
                  href={`https://maps.google.com/?q=${sheet.gps_lat},${sheet.gps_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm font-semibold text-blue-600"
                >
                  📍 Open in Google Maps
                </a>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Duration</p>
                <p className="font-bold" style={{ color: '#282C3F' }}>{sheet.duration_seconds}s</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Status</p>
                <p className="font-bold" style={{ color: '#FC8019' }}>{sheet.aggression_level}</p>
              </div>
            </div>

            <button
              onClick={() => deleteEvidence(sheet.id)}
              className="w-full py-3 rounded-xl font-bold text-white bg-red-500"
            >
              🗑 Delete Recording
            </button>
            <button onClick={() => setSheet(null)} className="w-full py-3 mt-2 rounded-xl font-semibold text-gray-500 bg-gray-100">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
