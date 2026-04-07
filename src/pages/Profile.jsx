import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSafety } from '../context/SafetyContext'

export default function Profile() {
  const navigate = useNavigate()
  const { sendSOS, goSafe, sosActive, safetyMode, isRecording } = useSafety()
  const [user, setUser]       = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  // Ref-based tap counter for avatar triple-tap
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setNameValue(user?.user_metadata?.full_name || user?.user_metadata?.name || '')
    })
  }, [])

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'

  const saveName = async () => {
    if (!nameValue.trim()) { setEditingName(false); return }
    await supabase.auth.updateUser({ data: { full_name: nameValue.trim() } })
    const { data: { user: updated } } = await supabase.auth.getUser()
    setUser(updated)
    setEditingName(false)
  }

  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  // Triple-tap avatar → send SOS (only in safety mode)
  const handleAvatarTap = useCallback(() => {
    if (!safetyMode) return
    tapCountRef.current += 1
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0
      sendSOS()
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 1000)
    }
  }, [safetyMode, sendSOS])

  const handleSignOut = async () => {
    goSafe() // stop everything before signing out
    sessionStorage.removeItem('pinCleared')
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

        {/* ── I'm Safe Banner — only when SOS is active ── */}
        {sosActive && (
          <div
            className="text-white px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: '#dc2626' }}
          >
            <div>
              <p className="text-sm font-black animate-pulse">🆘 SOS Active</p>
              <p className="text-xs opacity-80 mt-0.5">Sending alerts every 3 min</p>
            </div>
            <button
              onClick={goSafe}
              className="bg-white text-red-600 text-xs font-black px-4 py-2 rounded-full ml-3 flex-shrink-0 shadow-md active:scale-95 transition-transform"
            >
              ✅ I'm Safe
            </button>
          </div>
        )}

        {/* ── Recording indicator ── */}
        {isRecording && (
          <div
            className="text-white px-4 py-2 flex items-center gap-2"
            style={{ backgroundColor: '#7c3aed' }}
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <p className="text-xs font-semibold">Recording in progress…</p>
          </div>
        )}

        {/* Profile header card */}
        <div className="bg-white px-6 py-8 flex flex-col items-center gap-4">
          {/* Avatar — triple-tap (in safety mode) → send SOS */}
          <div
            onClick={handleAvatarTap}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black cursor-pointer select-none shadow-lg active:opacity-80 transition-all duration-200"
            style={{
              backgroundColor: sosActive ? '#dc2626' : '#FC8019',
            }}
          >
            {sosActive ? '🆘' : initials}
          </div>


          <div className="text-center">
            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                className="text-center font-bold text-lg border-b-2 outline-none px-2 py-1"
                style={{ color: '#282C3F', borderColor: '#FC8019' }}
                placeholder="Enter your full name"
              />
            ) : (
              <p
                onClick={() => setEditingName(true)}
                className="font-bold text-lg cursor-pointer hover:opacity-70"
                style={{ color: '#282C3F' }}
                title="Click to edit name"
              >
                {displayName} ✏️
              </p>
            )}
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
