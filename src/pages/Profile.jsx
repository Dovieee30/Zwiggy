import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSafety } from '../context/SafetyContext'

export default function Profile() {
  const navigate = useNavigate()
  const { sendSOS, goSafe, sosActive, safetyMode, isRecording } = useSafety()
  const [user, setUser] = useState(null)

  // Edit Profile state
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Ref-based tap counter for avatar triple-tap
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setEditName(user?.user_metadata?.full_name || user?.user_metadata?.name || '')
      setEditPhone(user?.user_metadata?.phone || user?.phone || '')
    })
  }, [])

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const saveProfile = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: editName.trim(),
          phone: editPhone.trim(),
        },
      })
      const { data: { user: updated } } = await supabase.auth.getUser()
      setUser(updated)
      setSaveMsg('✅ Profile updated!')
      setTimeout(() => { setSaveMsg(''); setShowEdit(false) }, 1500)
    } catch (err) {
      setSaveMsg('❌ Failed to save')
    }
    setSaving(false)
  }

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
    goSafe()
    sessionStorage.removeItem('pinCleared')
    await supabase.auth.signOut()
    localStorage.removeItem('appMode')
    navigate('/login')
  }

  const menuItems = [
    { label: 'Edit Profile',    icon: '✏️', action: () => setShowEdit(true) },
    { label: 'My Orders',       icon: '📦', action: () => navigate('/orders') },
    { label: 'Saved Addresses', icon: '📍', action: () => navigate('/addresses') },
    { label: 'Payment Methods', icon: '💳', action: () => {} },
    { label: 'Help & Support',  icon: '🆘', action: () => {} },
    { label: 'Log Out',         icon: '🚪', action: handleSignOut, danger: true },
  ]

  // ─── Edit Profile Overlay (Swiggy-style) ───────────────────────────────────
  if (showEdit) {
    return (
      <div className="min-h-screen pb-24 md:pb-6" style={{ backgroundColor: '#F2F2F2' }}>
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
            <button onClick={() => setShowEdit(false)} className="p-2 rounded-full hover:bg-gray-100">
              <svg className="w-5 h-5" style={{ color: '#282C3F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold" style={{ color: '#282C3F' }}>Edit Profile</h1>
          </div>

          {/* Avatar section */}
          <div className="bg-white mt-2 px-6 py-8 flex flex-col items-center gap-3">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg"
              style={{ backgroundColor: '#FC8019' }}
            >
              {initials}
            </div>
            <p className="text-xs" style={{ color: '#686B78' }}>Tap avatar to change</p>
          </div>

          {/* Form fields */}
          <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm p-5 space-y-5">
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: '#93959F' }}>
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full border-b-2 pb-2 text-base font-medium outline-none transition-colors focus:border-orange-400"
                style={{ color: '#282C3F', borderColor: '#e5e7eb' }}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: '#93959F' }}>
                Phone Number
              </label>
              <div className="flex items-center gap-2">
                <span className="text-base font-medium" style={{ color: '#282C3F' }}>+91</span>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  maxLength={10}
                  className="flex-1 border-b-2 pb-2 text-base font-medium outline-none transition-colors focus:border-orange-400"
                  style={{ color: '#282C3F', borderColor: '#e5e7eb' }}
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide block mb-2" style={{ color: '#93959F' }}>
                Email
              </label>
              <p className="text-base font-medium pb-2 border-b-2" style={{ color: '#93959F', borderColor: '#e5e7eb' }}>
                {user?.email}
              </p>
              <p className="text-xs mt-1" style={{ color: '#b5b8c0' }}>Email cannot be changed</p>
            </div>
          </div>

          {/* Save button */}
          <div className="mx-4 mt-6">
            <button
              onClick={saveProfile}
              disabled={saving || !editName.trim()}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: '#FC8019' }}
            >
              {saving ? '⏳ Saving...' : 'Save Changes'}
            </button>
            {saveMsg && (
              <p className="text-center text-sm font-semibold mt-3" style={{ color: saveMsg.includes('✅') ? '#2d6a4f' : '#dc2626' }}>
                {saveMsg}
              </p>
            )}
          </div>

          <p className="text-center text-xs mt-4 px-6" style={{ color: '#b5b8c0' }}>
            Your name will be used in SOS alerts sent to trusted contacts.
          </p>
        </div>
      </div>
    )
  }

  // ─── Main Profile View ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 md:pb-6" style={{ backgroundColor: '#F2F2F2' }}>
      <div className="max-w-md mx-auto">

        {/* ── I'm Safe Banner — only when SOS is active ── */}
        {sosActive && (
          <div className="text-white px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#dc2626' }}>
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
          <div className="text-white px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#7c3aed' }}>
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
            style={{ backgroundColor: sosActive ? '#dc2626' : '#FC8019' }}
          >
            {sosActive ? '🆘' : initials}
          </div>

          <div className="text-center">
            <p className="font-bold text-lg" style={{ color: '#282C3F' }}>{displayName}</p>
            <p className="text-sm" style={{ color: '#686B78' }}>{user?.email}</p>
            {user?.user_metadata?.phone && (
              <p className="text-sm" style={{ color: '#686B78' }}>+91 {user.user_metadata.phone}</p>
            )}
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
