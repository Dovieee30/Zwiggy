import React from 'react'
import { useCart } from '../context/CartContext'

const FALLBACK = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop&auto=format'

export default function MenuItem({ item, restaurant }) {
  const { cartItems, addItem, updateQuantity } = useCart()
  const cartItem = cartItems.find(i => i.id === item.id)
  const qty = cartItem?.quantity || 0

  return (
    <div className="flex items-start gap-3 py-4 border-b border-gray-100 last:border-0">
      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Veg/Non-veg indicator */}
        <div className={`inline-flex w-4 h-4 border-2 items-center justify-center rounded-sm mb-1.5 ${item.is_veg ? 'border-green-600' : 'border-red-500'}`}>
          <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-500'}`} />
        </div>
        <h4 className="font-semibold text-sm leading-tight" style={{ color: '#282C3F' }}>{item.name}</h4>
        <p className="font-bold text-sm mt-1" style={{ color: '#282C3F' }}>₹{item.price}</p>
        {item.description && (
          <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: '#686B78' }}>
            {item.description}
          </p>
        )}
      </div>

      {/* Image + ADD button */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <img
          src={item.image_url || FALLBACK}
          alt={item.name}
          className="w-20 h-20 object-cover rounded-xl shadow-sm"
          onError={e => { e.target.src = FALLBACK }}
        />

        {qty === 0 ? (
          <button
            onClick={() => addItem(item, restaurant)}
            className="border-2 font-bold text-xs px-5 py-1.5 rounded-lg transition-all hover:bg-orange-50 active:scale-95 shadow-sm"
            style={{ borderColor: '#FC8019', color: '#FC8019', backgroundColor: 'white' }}
          >
            ADD
          </button>
        ) : (
          <div className="flex items-center border-2 rounded-lg shadow-sm" style={{ borderColor: '#FC8019' }}>
            <button
              onClick={() => updateQuantity(item.id, qty - 1)}
              className="w-7 h-7 font-bold text-base flex items-center justify-center hover:bg-orange-50 rounded-l-lg transition-colors"
              style={{ color: '#FC8019' }}
            >
              −
            </button>
            <span className="font-bold text-sm w-5 text-center" style={{ color: '#FC8019' }}>{qty}</span>
            <button
              onClick={() => addItem(item, restaurant)}
              className="w-7 h-7 font-bold text-base flex items-center justify-center hover:bg-orange-50 rounded-r-lg transition-colors"
              style={{ color: '#FC8019' }}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
