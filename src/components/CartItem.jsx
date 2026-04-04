import React from 'react'
import { useCart } from '../context/CartContext'

export default function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-0">
      {/* Veg/Non-veg dot */}
      <div className={`w-4 h-4 border-2 flex-shrink-0 flex items-center justify-center rounded-sm ${item.is_veg ? 'border-green-600' : 'border-red-500'}`}>
        <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-500'}`} />
      </div>

      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: '#282C3F' }}>{item.name}</p>
        <p className="font-bold text-sm mt-0.5" style={{ color: '#282C3F' }}>
          ₹{item.price * item.quantity}
          <span className="font-normal text-xs text-gray-400 ml-1">(₹{item.price} × {item.quantity})</span>
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center border-2 rounded-lg" style={{ borderColor: '#FC8019' }}>
        <button
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
          className="w-7 h-7 font-bold text-base flex items-center justify-center hover:bg-orange-50 rounded-l-lg transition-colors"
          style={{ color: '#FC8019' }}
        >
          −
        </button>
        <span className="font-bold text-sm w-5 text-center" style={{ color: '#FC8019' }}>{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
          className="w-7 h-7 font-bold text-base flex items-center justify-center hover:bg-orange-50 rounded-r-lg transition-colors"
          style={{ color: '#FC8019' }}
        >
          +
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={() => removeItem(item.id)}
        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
      >
        <svg className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
