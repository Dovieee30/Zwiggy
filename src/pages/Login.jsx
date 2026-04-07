import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/')
    })
  }, [navigate])

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
    }

    // Clear pinCleared so PinGate in App.jsx shows the PIN once
    sessionStorage.removeItem('pinCleared')
    setLoading(false)
    navigate('/')
  }

  // Login / Signup Screen
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F2F2F2' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl font-black">
            <span style={{ color: '#FC8019' }}>Zwiggy</span>
          </div>
          <p className="text-sm mt-2 font-medium" style={{ color: '#686B78' }}>Order food. Fast. Reliable.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl border overflow-hidden mb-6" style={{ borderColor: '#FC8019' }}>
          {['login', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className="flex-1 py-2.5 font-bold text-sm capitalize transition-all"
              style={{ backgroundColor: mode === m ? '#FC8019' : 'white', color: mode === m ? 'white' : '#FC8019' }}
            >
              {m === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={{ color: '#282C3F' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="your@email.com"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition-colors"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="text-sm font-semibold block mb-1.5" style={{ color: '#282C3F' }}>Full Name</label>
              <input
                type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                placeholder="Your full name"
                className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition-colors"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-semibold block mb-1.5" style={{ color: '#282C3F' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Enter password"
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition-colors"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="text-sm font-semibold block mb-1.5" style={{ color: '#282C3F' }}>Confirm Password</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                placeholder="Confirm password"
                className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition-colors"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-60 active:scale-95 mt-2"
            style={{ backgroundColor: '#FC8019' }}
          >
            {loading ? '⏳ Please wait...' : mode === 'login' ? 'Login →' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: '#686B78' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
