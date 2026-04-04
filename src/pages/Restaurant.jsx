import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import MenuItem from '../components/MenuItem'
import { useCart } from '../context/CartContext'

const FALLBACK = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=300&fit=crop&auto=format'

function HeaderSkeleton() {
  return (
    <div>
      <div className="skeleton w-full" style={{ height: '250px' }} />
      <div className="p-4 space-y-2">
        <div className="skeleton h-6 w-2/3 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded-lg" />
        <div className="skeleton h-4 w-1/3 rounded-lg" />
      </div>
    </div>
  )
}

export default function Restaurant() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cartItems, itemCount, totalPrice } = useCart()

  const [restaurant, setRestaurant] = useState(null)
  const [menuItems,  setMenuItems]  = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [{ data: rest }, { data: menu }] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', id).single(),
        supabase.from('menu_items').select('*').eq('restaurant_id', id).order('category'),
      ])
      setRestaurant(rest)
      setMenuItems(menu || [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const categories = [...new Set(menuItems.map(i => i.category))]

  if (loading) return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">
      <HeaderSkeleton />
    </div>
  )

  if (!restaurant) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-5xl">🍽️</div>
      <p className="font-bold text-lg">Restaurant not found</p>
      <button onClick={() => navigate('/')} className="font-semibold" style={{ color: '#FC8019' }}>← Go Back</button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen pb-32 fade-in">
      {/* Back button (floating) */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-20 left-4 z-30 bg-white rounded-full p-2 shadow-lg border border-gray-100"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Hero image */}
      <img
        src={restaurant.image_url || FALLBACK}
        alt={restaurant.name}
        className="w-full object-cover"
        style={{ height: '250px' }}
        onError={e => { e.target.src = FALLBACK }}
      />

      {/* Restaurant info */}
      <div className="p-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold" style={{ color: '#282C3F' }}>{restaurant.name}</h1>
        <p className="text-sm mt-1" style={{ color: '#686B78' }}>{restaurant.cuisine_type}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="flex items-center gap-1 text-sm font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">
            ⭐ {restaurant.rating?.toFixed(1) || '4.2'}
          </span>
          <span className="text-sm font-medium" style={{ color: '#686B78' }}>
            🕐 {restaurant.delivery_time || '30-40 min'}
          </span>
          <span className="text-sm" style={{ color: '#686B78' }}>
            ₹{restaurant.min_order || 200} for two
          </span>
        </div>

        {/* Free delivery banner */}
        <div className="mt-3 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
          <span className="text-lg">🏷️</span>
          <div>
            <p className="text-xs font-bold" style={{ color: '#FC8019' }}>Free delivery on orders above ₹299</p>
            <p className="text-xs" style={{ color: '#686B78' }}>{restaurant.offer_text || '40% OFF UPTO ₹80 on first order'}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#282C3F' }}>Menu</h2>

        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p>No menu items available yet</p>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat} className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-bold text-base" style={{ color: '#282C3F' }}>{cat}</h3>
                <div className="flex-1 border-b border-dashed border-gray-200" />
                <span className="text-xs text-gray-400">{menuItems.filter(i => i.category === cat).length} items</span>
              </div>
              {menuItems.filter(i => i.category === cat).map(item => (
                <MenuItem key={item.id} item={item} restaurant={restaurant} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div
          className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-30 sheet-up"
        >
          <button
            onClick={() => navigate('/cart')}
            className="w-full flex items-center justify-between text-white px-5 py-4 rounded-2xl shadow-2xl font-semibold"
            style={{ backgroundColor: '#FC8019' }}
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/30 rounded-lg px-2 py-0.5 text-sm font-bold">{itemCount}</span>
              <span className="text-sm">items | ₹{totalPrice}</span>
            </div>
            <span className="font-bold">View Cart →</span>
          </button>
        </div>
      )}
    </div>
  )
}
