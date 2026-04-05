import React, { useEffect, useState, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { SafetyProvider } from './context/SafetyContext'
import { useSafety } from './context/SafetyContext'
import SafetyLayer from './components/SafetyLayer'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'

import Login      from './pages/Login'
import Home       from './pages/Home'
import Restaurant from './pages/Restaurant'
import Cart       from './pages/Cart'
import Orders     from './pages/Orders'
import Profile    from './pages/Profile'
import Vault      from './pages/Vault'
import SavedAddresses from './pages/SavedAddresses'

import { supabase } from './supabaseClient'

// Pages that show Navbar + BottomNav
const SHELL_ROUTES = ['/', '/cart', '/orders', '/profile', '/addresses']

// ─── PIN Gate — shown on every app open after session check ─────────────────
// Uses sessionStorage so it resets on every new browser tab/open
function PinGate({ children }) {
  const { activateSafetyMode } = useSafety()
  const [cleared, setCleared]  = useState(
    () => sessionStorage.getItem('pinCleared') === 'yes'
  )
  const [pin, setPin]          = useState('')

  const handleDigit = (d) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      setTimeout(() => {
        if (next === '5678') {
          activateSafetyMode()
        } else {
          localStorage.setItem('appMode', 'normal')
        }
        sessionStorage.setItem('pinCleared', 'yes')
        setCleared(true)
      }, 300)
    }
  }

  if (cleared) return children

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F2F2F2' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm" style={{ animation: 'fadeIn 0.3s ease' }}>
        <div className="text-center mb-8">
          <div className="text-4xl font-black" style={{ color: '#FC8019' }}>Zwiggy</div>
          <p className="text-xl font-bold mt-5" style={{ color: '#282C3F' }}>Enter your PIN</p>
          <p className="text-sm mt-1" style={{ color: '#686B78' }}>Your 4-digit security PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-5 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border-2 transition-all duration-200"
              style={{
                backgroundColor: i < pin.length ? '#FC8019' : 'transparent',
                borderColor:     i < pin.length ? '#FC8019' : '#ccc',
                transform:       i < pin.length ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              onClick={() => handleDigit(String(n))}
              className="h-14 text-xl font-semibold rounded-xl transition-colors"
              style={{ backgroundColor: '#F9FAFB', color: '#282C3F' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF3E8'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
            >
              {n}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit('0')}
            className="h-14 text-xl font-semibold rounded-xl transition-colors"
            style={{ backgroundColor: '#F9FAFB', color: '#282C3F' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF3E8'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          >
            0
          </button>
          <button
            onClick={() => setPin(p => p.slice(0, -1))}
            className="h-14 text-xl rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: '#F9FAFB', color: '#282C3F' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          >
            ⌫
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#9CA3AF' }}>
          Enter PIN to continue
        </p>
      </div>
    </div>
  )
}

// ─── App Shell ───────────────────────────────────────────────────────────────
function AppShell() {
  const location = useLocation()
  const showShell = SHELL_ROUTES.includes(location.pathname) ||
    location.pathname.startsWith('/restaurant')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F2F2' }}>
      {showShell && <Navbar />}
      <SafetyLayer />
      <Routes>
        <Route path="/login"           element={<Login />} />
        <Route path="/"                element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/restaurant/:id"  element={<ProtectedRoute><Restaurant /></ProtectedRoute>} />
        <Route path="/cart"            element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/orders"          element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/profile"         element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/vault"           element={<ProtectedRoute><Vault /></ProtectedRoute>} />
        <Route path="/addresses"       element={<ProtectedRoute><SavedAddresses /></ProtectedRoute>} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
      {showShell && <BottomNav />}
    </div>
  )
}

// ─── Protected Route — checks session, then shows PIN gate ──────────────────
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    const timeout = setTimeout(() => setSession(null), 3000)
    supabase.auth.getSession()
      .then(({ data: { session } }) => { clearTimeout(timeout); setSession(session) })
      .catch(() => { clearTimeout(timeout); setSession(null) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      clearTimeout(timeout)
      setSession(s)
    })
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F2F2' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="text-3xl font-black" style={{ color: '#FC8019' }}>Zwiggy</div>
          <div className="flex gap-1.5 mt-2">
            {[0,1,2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full animate-bounce"
                style={{ backgroundColor: '#FC8019', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  // ✅ Session valid → show PIN gate before app
  return <PinGate>{children}</PinGate>
}

export default function App() {
  return (
    <BrowserRouter>
      <SafetyProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </SafetyProvider>
    </BrowserRouter>
  )
}
