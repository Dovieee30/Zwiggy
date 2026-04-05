import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import RestaurantCard from '../components/RestaurantCard'
import { useSafety } from '../context/SafetyContext'

const CATEGORIES = [
  { label: 'Biryani',      emoji: '🍚' },
  { label: 'Pizza',        emoji: '🍕' },
  { label: 'Burgers',      emoji: '🍔' },
  { label: 'Chinese',      emoji: '🥡' },
  { label: 'Desserts',     emoji: '🍰' },
  { label: 'Healthy',      emoji: '🥗' },
  { label: 'Chicken',      emoji: '🍗' },
  { label: 'South Indian', emoji: '🫙' },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      <div className="skeleton" style={{ height: '160px' }} />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded-lg" />
        <div className="skeleton h-3 w-1/2 rounded-lg" />
        <div className="skeleton h-3 w-2/3 rounded-lg" />
      </div>
    </div>
  )
}

export default function Home() {
  const { safetyMode, isRecording, isRecordingRef, startRecording, stopRecording } = useSafety()
  const [restaurants, setRestaurants] = useState([])
  const [filtered,    setFiltered]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [active,      setActive]      = useState(null)

  // ── Ref-based tap counter (no setState, no stale closures) ──
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)

  useEffect(() => { fetchRestaurants() }, [])

  const fetchRestaurants = async () => {
    setLoading(true)
    const { data } = await supabase.from('restaurants').select('*').order('rating', { ascending: false })
    setRestaurants(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  const handleFilter = (cat) => {
    if (active === cat) { setActive(null); setFiltered(restaurants); return }
    setActive(cat)
    setFiltered(restaurants.filter(r => r.cuisine_type?.toLowerCase().includes(cat.toLowerCase())))
  }

  // Triple-tap: pure ref logic — no setState, side effects fire directly
  const handleTap = useCallback(() => {
    if (!safetyMode) return

    tapCountRef.current += 1

    // Clear any pending reset timer
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)

    if (tapCountRef.current >= 3) {
      // ✅ Fire here — NOT inside a setState updater
      tapCountRef.current = 0
      if (isRecordingRef.current) {
        stopRecording()
      } else {
        startRecording()
      }
    } else {
      // Reset count if no 3rd tap within 1 second
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0
      }, 1000)
    }
  }, [safetyMode, isRecordingRef, startRecording, stopRecording])

  return (
    <div className="pb-24 md:pb-6 min-h-screen" style={{ backgroundColor: '#F2F2F2' }} onClick={handleTap}>
      {/* Promo Banner */}
      <div className="text-white text-center py-2.5 px-4 text-sm font-semibold" style={{ backgroundColor: '#FC8019' }}>
        🎉 50% OFF on first 3 orders | Use code: <span className="font-black bg-white px-1.5 rounded" style={{ color: '#FC8019' }}>WELCOME50</span>
      </div>

      {/* Recording status — disguised as delivery tracker */}
      {isRecording && (
        <div className="text-white text-center py-2 px-4 text-xs font-medium flex items-center justify-center gap-2" style={{ backgroundColor: '#2d6a4f' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Your order is being prepared… tracking live
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-4">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={(e) => { e.stopPropagation(); handleFilter(cat.label); }} // prevent triggering background tap
              className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl font-medium text-xs transition-all duration-200 border"
              style={{
                backgroundColor: active === cat.label ? '#FC8019' : 'white',
                color:           active === cat.label ? 'white'    : '#282C3F',
                borderColor:     active === cat.label ? '#FC8019'  : '#e5e7eb',
                boxShadow:       active === cat.label ? '0 4px 12px rgba(252,128,25,0.3)' : 'none',
              }}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span className="whitespace-nowrap">{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="border-b border-gray-300 my-4" />

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold" style={{ color: '#282C3F' }}>
            {active ? `${active} Restaurants` : 'Restaurants Near You'}
          </h1>
          <span className="text-sm font-medium" style={{ color: '#686B78' }}>
            {loading ? '—' : `${filtered.length} places`}
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4" onClick={(e) => e.stopPropagation()}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 fade-in">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="font-bold text-lg" style={{ color: '#282C3F' }}>No restaurants found</p>
            <p className="text-sm mt-1" style={{ color: '#686B78' }}>Try a different category</p>
            <button onClick={(e) => { e.stopPropagation(); handleFilter(active); }} className="mt-4 font-semibold text-sm" style={{ color: '#FC8019' }}>
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 fade-in" onClick={(e) => e.stopPropagation()}>
            {filtered.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}
