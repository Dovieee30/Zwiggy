import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { SafetyProvider } from './context/SafetyContext'
import SafetyLayer from './components/SafetyLayer'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'

import Login      from './pages/Login'
import Home       from './pages/Home'
import Restaurant from './pages/Restaurant'
import Cart       from './pages/Cart'
import Orders     from './pages/Orders'
import Profile    from './pages/Profile'
import Vault           from './pages/Vault'
import SavedAddresses  from './pages/SavedAddresses'

import { supabase } from './supabaseClient'

// Pages that show Navbar + BottomNav
const SHELL_ROUTES = ['/', '/cart', '/orders', '/profile', '/addresses']

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

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Timeout fallback: if Supabase doesn't respond (e.g. bad keys), redirect to login after 3s
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
          <div className="text-3xl font-black">
            <span style={{ color: '#FC8019' }}>Zwiggy</span>
          </div>
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
  return children
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
