import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import CartItem from '../components/CartItem'
import { supabase } from '../supabaseClient'

const COLORS = ['#FC8019','#E43B4F','#0F8A65','#282C3F','#6C63FF','#FFD700']

function Confetti() {
  return (
    <div className="pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}vw`,
            top: `-${Math.random() * 20 + 10}px`,
            backgroundColor: COLORS[i % COLORS.length],
            width: `${Math.random() * 8 + 6}px`,
            height: `${Math.random() * 8 + 6}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDuration: `${Math.random() * 2 + 2}s`,
            animationDelay: `${Math.random() * 1}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function Cart() {
  const navigate = useNavigate()
  const { cartItems, cartRestaurant, totalPrice, itemCount, clearCart } = useCart()
  const [placing, setPlacing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState('')

  const deliveryFee   = 25
  const platformFee   = 5
  const gst           = Math.round(totalPrice * 0.05)
  const grandTotal    = totalPrice + deliveryFee + platformFee + gst

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const placeOrder = async () => {
    if (cartItems.length === 0) return
    setPlacing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      await supabase.from('orders').insert({
        user_id:       user.id,
        restaurant_id: cartRestaurant?.id || null,
        items_json:    JSON.stringify(cartItems),
        total:         grandTotal,
        status:        'confirmed',
      })

      clearCart()
      setSuccess(true)
    } catch {
      showToast('Something went wrong. Please try again.')
    }
    setPlacing(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center fade-in" style={{ backgroundColor: '#F2F2F2' }}>
        <Confetti />
        <div className="bg-white rounded-3xl p-10 shadow-xl max-w-sm w-full scale-in relative z-10">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#0F8A65' }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" className="draw-check" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black" style={{ color: '#282C3F' }}>Order Placed! 🎉</h2>
          <p className="mt-2 text-sm" style={{ color: '#686B78' }}>
            Your food will arrive in <strong>30–45 minutes</strong>
          </p>
          <div className="mt-6 bg-orange-50 rounded-xl p-4">
            <p className="text-xs font-semibold" style={{ color: '#FC8019' }}>Grand Total Paid</p>
            <p className="text-2xl font-black mt-1" style={{ color: '#FC8019' }}>₹{grandTotal}</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="mt-6 w-full py-3.5 rounded-xl font-bold text-white"
            style={{ backgroundColor: '#FC8019' }}
          >
            Track Order →
          </button>
          <button onClick={() => navigate('/')} className="mt-3 text-sm font-medium" style={{ color: '#FC8019' }}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-6" style={{ backgroundColor: '#F2F2F2' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
          <h1 className="text-xl font-bold" style={{ color: '#282C3F' }}>Your Cart</h1>
          {cartRestaurant && (
            <p className="text-sm mt-0.5" style={{ color: '#686B78' }}>from {cartRestaurant.name}</p>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
            <div className="text-7xl">🛒</div>
            <p className="font-bold text-xl" style={{ color: '#282C3F' }}>Your cart is empty</p>
            <p className="text-sm" style={{ color: '#686B78' }}>Add items to get started</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-8 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: '#FC8019' }}
            >
              Browse Restaurants
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="bg-white mt-3 mx-3 rounded-2xl px-4 shadow-sm">
              {cartItems.map(item => <CartItem key={item.id} item={item} />)}
            </div>

            {/* Delivery tip */}
            <div className="mx-3 mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-lg">🚴</span>
              <p className="text-xs font-semibold text-green-700">
                {totalPrice >= 299 ? '🎉 Free delivery on this order!' : `Add ₹${299 - totalPrice} more for free delivery`}
              </p>
            </div>

            {/* Bill details */}
            <div className="bg-white mx-3 mt-3 rounded-2xl px-4 py-4 shadow-sm">
              <h2 className="font-bold text-base mb-3" style={{ color: '#282C3F' }}>Bill Details</h2>
              {[
                ['Item Total',           `₹${totalPrice}`],
                ['Delivery Partner Fee', `₹${deliveryFee}`],
                ['Platform Fee',         `₹${platformFee}`],
                ['GST (5%)',             `₹${gst}`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-1.5">
                  <span className="text-sm" style={{ color: '#686B78' }}>{label}</span>
                  <span className="text-sm font-medium" style={{ color: '#282C3F' }}>{val}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-200 mt-2 pt-3 flex justify-between">
                <span className="font-bold" style={{ color: '#282C3F' }}>To Pay</span>
                <span className="font-black text-lg" style={{ color: '#FC8019' }}>₹{grandTotal}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mx-3 mt-4">
              <button
                onClick={placeOrder}
                disabled={placing}
                className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg disabled:opacity-70 transition-all active:scale-95"
                style={{ backgroundColor: '#FC8019' }}
              >
                {placing ? '⏳ Placing Order...' : `Proceed to Pay ₹${grandTotal}`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-3 rounded-xl text-sm font-medium toast shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
