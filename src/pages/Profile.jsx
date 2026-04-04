import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSafety } from '../context/SafetyContext'

export default function Profile() {
  const navigate = useNavigate()
  const { sendSOS, cancelSOS, sosActive, safetyMode } = useSafety()
  const [user, setUser] = useState(null)
  const [tapCount, setTapCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  // Reset tap count after 1 second of no taps
  useEffect(() => {
    if (tapCount > 0) {
      const t = setTimeout(() => setTapCount(0), 1000)
      return () => clearTimeout(t)
    }
  }, [tapCount])

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  const handleAvatarTap = () => {
    if (!safetyMode) return
    setTapCount(prev => {
      const next = prev + 1
      if (next === 3) {
        sendSOS()
        return 0
      }
      return next
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('appMode')
    navigate('/login')
  }

  const menuItems = [
    { label: 'My Orders',       icon: '📦', action: () => navigate('/orders') },
    { label: 'Saved Addresses', icon: '📍', action: () => navigate('/addresses') },
    { label: 'Payment Methods', icon: '💳', action: () => {} },
    { label: 'Help & Support',  icon: '🆘', action: () => {} },
    { label: 'Log Out',         icon: '🚪', action: handleSignOut, danger: true },
  ]

  return (
    <div className="min-h-screen pb-24 md:pb-6" style={{ backgroundColor: '#F2F2F2' }}>
      <div className="max-w-md mx-auto">

        {/* SOS Active Banner — visible only when SOS is running */}
        {sosActive && (
          <div className="bg-red-600 text-white text-center py-3 px-4 flex items-center justify-between">
            <span className="text-sm font-bold animate-pulse">🆘 SOS Active — retrying every 3 min</span>
            <button
              onClick={cancelSOS}
              className="bg-white text-red-600 text-xs font-black px-3 py-1 rounded-full ml-3 flex-shrink-0"
            >
              I'm Safe ✓
            </button>
          </div>
        )}

        {/* Profile header card */}
        <div className="bg-white px-6 py-8 flex flex-col items-center gap-4">
          {/* Avatar — triple-tap (in safety mode) → send SOS */}
          <div
            onClick={handleAvatarTap}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black cursor-pointer select-none shadow-lg active:opacity-80 transition-opacity"
            style={{ backgroundColor: sosActive ? '#dc2626' : '#FC8019' }}
          >
            {sosActive ? '🆘' : initials}
          </div>
          <div className="text-center">
            <p className="font-bold text-lg" style={{ color: '#282C3F' }}>
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-sm" style={{ color: '#686B78' }}>{user?.email}</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-700">Account Active</span>
          </div>
        </div>

        {/* Zwiggy Wallet */}
        <div className="mx-4 mt-4 rounded-2xl p-4 text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #FC8019 0%, #ff6b00 100%)' }}>
          <p className="text-xs font-semibold opacity-80">ZWIGGY WALLET</p>
          <p className="text-3xl font-black mt-1">₹0.00</p>
          <p className="text-xs opacity-80 mt-1">Add money to get cashback offers</p>
        </div>

        {/* Menu list */}
        <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, idx) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors ${idx < menuItems.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <span className="text-xl w-7 flex-shrink-0 text-center">{item.icon}</span>
              <span className={`flex-1 font-medium text-sm ${item.danger ? 'text-red-500' : ''}`} style={!item.danger ? { color: '#282C3F' } : {}}>
                {item.label}
              </span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Version 1.0.0 • Zwiggy</p>
      </div>
    </div>
  )
}

