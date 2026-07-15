import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useSafety } from '../context/SafetyContext'
import { supabase } from '../supabaseClient'

export default function Navbar() {
  const { itemCount } = useCart()
  const { sendLogoSOS, safetyMode } = useSafety()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [sosStatus, setSosStatus] = useState('')
  const searchTimerRef = useRef(null)

  // ── Triple-tap on logo → SOS ──
  const logoTapRef   = useRef(0)
  const logoTimerRef = useRef(null)

  const handleLogoTap = useCallback(() => {
    if (!safetyMode) return
    logoTapRef.current += 1

    if (logoTimerRef.current) clearTimeout(logoTimerRef.current)

    if (logoTapRef.current >= 3) {
      logoTapRef.current = 0
      console.log('[Safety] 🚨 Logo triple-tap detected — sending SOS!')
      setSosStatus('Sending...')
      sendLogoSOS().then(() => {
        setSosStatus('✅ Sent!')
        setTimeout(() => setSosStatus(''), 3000)
      })
    } else {
      // If no 3rd tap within 1s, reset counter and navigate home
      logoTimerRef.current = setTimeout(() => {
        logoTapRef.current = 0
      }, 1000)
    }
  }, [safetyMode, sendLogoSOS])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('appMode')
    navigate('/login')
  }

  // ── Debounced search against Supabase ──
  useEffect(() => {
    if (!searchOpen) return

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .or(`name.ilike.%${trimmed}%,cuisine_type.ilike.%${trimmed}%`)
          .order('rating', { ascending: false })
          .limit(20)

        if (error) {
          console.error('[Search] Supabase error:', error)
          setSearchResults([])
        } else {
          setSearchResults(data || [])
        }
      } catch (err) {
        console.error('[Search] Error:', err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [query, searchOpen])

  // Reset search when overlay closes
  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
    setSearchResults([])
  }

  const handleResultClick = (id) => {
    closeSearch()
    navigate(`/restaurant/${id}`)
  }

  return (
    <>
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo — triple-tap triggers SOS */}
          <div
            onClick={handleLogoTap}
            className="flex-shrink-0 select-none cursor-pointer"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-2xl font-black" style={{ color: '#FC8019' }}>Zwiggy</span>
          </div>

          {/* Location pill (desktop) */}
          <div className="hidden md:flex items-center gap-1 cursor-pointer">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#FC8019' }}>Delivering to</span>
              <div className="flex items-center gap-0.5">
                <span className="font-bold text-sm" style={{ color: '#282C3F' }}>Mumbai</span>
                <svg className="w-4 h-4" style={{ color: '#FC8019' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Search bar (desktop) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 flex-1 max-w-md bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:border-orange-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search for restaurants or dishes...
          </button>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(true)} className="md:hidden p-2 rounded-full hover:bg-gray-100">
              <svg className="w-5 h-5" style={{ color: '#282C3F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <Link to="/cart" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" style={{ color: '#282C3F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FC8019', fontSize: '10px' }}>
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            <Link to="/profile" className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors" style={{ color: '#282C3F' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>

            <button onClick={handleSignOut} className="hidden md:block text-xs font-medium text-gray-500 hover:text-red-500 transition-colors px-2">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Full-screen search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col fade-in">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 shadow-sm">
            <button onClick={closeSearch} className="p-2 rounded-full hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              autoFocus
              type="text"
              placeholder="Search for restaurants or dishes..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 text-base outline-none"
              style={{ color: '#282C3F' }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-2 text-gray-400">✕</button>
            )}
          </div>

          {/* Search results area */}
          <div className="flex-1 overflow-y-auto">
            {!query.trim() ? (
              /* Empty state — no query yet */
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-4">
                <div className="text-7xl">🔍</div>
                <p className="font-semibold text-gray-500">Search for your favourite food</p>
                <p className="text-sm">Biryani, Pizza, Burgers and more...</p>
              </div>
            ) : searching ? (
              /* Loading state */
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-14 h-14 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              /* No results */
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <div className="text-5xl">😕</div>
                <p className="font-semibold text-gray-500">No results for "{query}"</p>
                <p className="text-sm">Try searching for a different restaurant or cuisine</p>
              </div>
            ) : (
              /* Results list */
              <div className="p-4 space-y-2">
                <p className="text-xs font-semibold mb-3" style={{ color: '#686B78' }}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </p>
                {searchResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleResultClick(r.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <img
                      src={r.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=100&fit=crop&auto=format'}
                      alt={r.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=100&fit=crop&auto=format' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: '#282C3F' }}>{r.name}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: '#686B78' }}>{r.cuisine_type}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-green-700">⭐ {r.rating?.toFixed(1) || '4.2'}</span>
                        <span className="text-xs" style={{ color: '#686B78' }}>•</span>
                        <span className="text-xs" style={{ color: '#686B78' }}>{r.delivery_time || '30-40 min'}</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#ccc' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
