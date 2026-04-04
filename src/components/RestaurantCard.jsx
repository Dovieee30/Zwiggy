import React from 'react'
import { useNavigate } from 'react-router-dom'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=200&fit=crop&auto=format'

export default function RestaurantCard({ restaurant }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/restaurant/${restaurant.id}`)}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
    >
      <div className="relative overflow-hidden">
        <img
          src={restaurant.image_url || FALLBACK_IMG}
          alt={restaurant.name}
          className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{ height: '160px' }}
          onError={e => { e.target.src = FALLBACK_IMG }}
        />
        {/* Offer badge */}
        <div className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md" style={{ backgroundColor: '#FC8019' }}>
          {restaurant.offer_text || '40% OFF UPTO ₹80'}
        </div>
        {/* Delivery time overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent flex items-end px-3 pb-2">
          <span className="text-white text-xs font-semibold">{restaurant.delivery_time || '30-40 min'}</span>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-bold text-sm leading-tight truncate" style={{ color: '#282C3F' }}>
          {restaurant.name}
        </h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#686B78' }}>
          {restaurant.cuisine_type}
        </p>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
            ⭐ {restaurant.rating?.toFixed(1) || '4.2'}
          </span>
          <span className="text-xs" style={{ color: '#686B78' }}>•</span>
          <span className="text-xs" style={{ color: '#686B78' }}>₹{restaurant.min_order || 200} for two</span>
        </div>
      </div>
    </div>
  )
}
