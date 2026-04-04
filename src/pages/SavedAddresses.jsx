import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSafety } from '../context/SafetyContext'

// ─── Fake addresses shown by default ────────────────────────────────────────
const FAKE_ADDRESSES = [
  {
    id: 1,
    tag: 'Home',
    icon: '🏠',
    line1: '42, Sunflower Apartments',
    line2: 'Koramangala, Bengaluru — 560034',
  },
  {
    id: 2,
    tag: 'Work',
    icon: '🏢',
    line1: '14th Floor, Embassy Tech Village',
    line2: 'Outer Ring Road, Bengaluru — 560103',
  },
]

export default function SavedAddresses() {
  const navigate = useNavigate()
  const { safetyMode } = useSafety()

  // Triple-tap state
  const [tapCount, setTapCount] = useState(0)
  const [showContacts, setShowContacts] = useState(false)

  // Trusted contacts state
  const [contacts, setContacts]       = useState([])
  const [loadingC, setLoadingC]       = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [newContact, setNewContact]   = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving]           = useState(false)

  // Reset tap count after 1s
  useEffect(() => {
    if (tapCount > 0) {
      const t = setTimeout(() => setTapCount(0), 1000)
      return () => clearTimeout(t)
    }
  }, [tapCount])

  // Load trusted contacts when vault panel opens
  useEffect(() => {
    if (showContacts) loadContacts()
  }, [showContacts])

  const handleHeadingTap = () => {
    if (!safetyMode) return
    setTapCount(prev => {
      const next = prev + 1
      if (next === 3) {
        setShowContacts(v => !v)
        return 0
      }
      return next
    })
  }

  const loadContacts = async () => {
    setLoadingC(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingC(false); return }
    const { data } = await supabase
      .from('sos_contacts')
      .select('*')
      .eq('user_id', user.id)
    setContacts(data || [])
    setLoadingC(false)
  }

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data } = await supabase
      .from('sos_contacts')
      .insert({ ...newContact, user_id: user.id })
      .select()
      .single()
    if (data) {
      setContacts(prev => [...prev, data])
      setNewContact({ name: '', phone: '', email: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const removeContact = async (id) => {
    await supabase.from('sos_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  // ─── Trusted Contacts Panel ────────────────────────────────────────────────
  if (showContacts) {
    return (
      <div className="min-h-screen pb-10" style={{ backgroundColor: '#1a1a2e' }}>
        {/* Header */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-3" style={{ backgroundColor: '#16213e' }}>
          <button onClick={() => setShowContacts(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-black text-white">Trusted Contacts 🔒</h1>
            <p className="text-xs text-gray-400">People who will receive your SOS alert</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="ml-auto text-xs font-bold px-3 py-2 rounded-xl text-white"
            style={{ backgroundColor: '#FC8019' }}
          >
            + Add
          </button>
        </div>

        <div className="mx-4 mt-4 space-y-3">
          {/* Add contact form */}
          {showForm && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#16213e' }}>
              <p className="text-white font-bold text-sm mb-3">New Trusted Contact</p>
              {[
                { key: 'name',  placeholder: 'Full Name',         type: 'text' },
                { key: 'phone', placeholder: 'Phone (10 digits)',  type: 'tel' },
                { key: 'email', placeholder: 'Email (optional)',   type: 'email' },
              ].map(f => (
                <input
                  key={f.key}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={newContact[f.key]}
                  onChange={e => setNewContact(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full mb-2 px-3 py-2.5 rounded-xl text-sm bg-white/10 text-white placeholder-gray-500 outline-none border border-white/5 focus:border-orange-500/50"
                />
              ))}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={addContact}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-60"
                  style={{ backgroundColor: '#FC8019' }}
                >
                  {saving ? 'Saving…' : 'Save Contact'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setNewContact({ name: '', phone: '', email: '' }) }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-gray-400 bg-white/10 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Contact list */}
          {loadingC ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton rounded-2xl h-16 bg-white/10" />
            ))
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-sm">No trusted contacts yet.</p>
              <p className="text-xs mt-1 opacity-70">Tap "+ Add" to add someone who'll receive your SOS.</p>
            </div>
          ) : (
            contacts.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: '#16213e' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: '#FC8019' }}
                >
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-gray-400 text-xs">{c.phone}{c.email ? ` • ${c.email}` : ''}</p>
                </div>
                <button
                  onClick={() => removeContact(c.id)}
                  className="text-red-400 hover:text-red-300 p-1 text-lg"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // ─── Normal Saved Addresses View ──────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 md:pb-6" style={{ backgroundColor: '#F2F2F2' }}>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-100">
          <svg className="w-5 h-5" style={{ color: '#282C3F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {/* Triple-tap heading to reveal contacts (safety mode only) */}
        <h1
          className="text-lg font-bold select-none cursor-default"
          style={{ color: '#282C3F' }}
          onClick={handleHeadingTap}
        >
          Saved Addresses
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {FAKE_ADDRESSES.map(addr => (
          <div
            key={addr.id}
            className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
              style={{ backgroundColor: '#FFF3E8' }}
            >
              {addr.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: '#282C3F' }}>{addr.tag}</p>
              <p className="text-xs mt-0.5" style={{ color: '#686B78' }}>{addr.line1}</p>
              <p className="text-xs" style={{ color: '#686B78' }}>{addr.line2}</p>
            </div>
            <svg className="w-4 h-4 mt-1 flex-shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}

        {/* Add new address button */}
        <button
          className="w-full bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4 border-2 border-dashed hover:bg-orange-50 transition-colors"
          style={{ borderColor: '#FC8019' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
            style={{ backgroundColor: '#FFF3E8' }}
          >
            ➕
          </div>
          <p className="font-bold text-sm" style={{ color: '#FC8019' }}>Add New Address</p>
        </button>
      </div>
    </div>
  )
}
