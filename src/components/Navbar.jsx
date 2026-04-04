import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../supabaseClient'

export default function Navbar() {
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('appMode')
    navigate('/login')
  }

  return (
    <>
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <span className="text-2xl font-black" style={{ color: '#FC8019' }}>Zwiggy</span>
          </Link>

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
            <button onClick={() => setSearchOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
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
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4">
            <div className="text-7xl">🔍</div>
            <p className="font-semibold text-gray-500">Search for your favourite food</p>
            <p className="text-sm">Biryani, Pizza, Burgers and more...</p>
          </div>
        </div>
      )}
    </>
  )
}
