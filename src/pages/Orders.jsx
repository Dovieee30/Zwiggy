import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useSafety } from '../context/SafetyContext'
import Vault from './Vault'

const statusMap = { confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' }

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)   return `${m} min ago`
  if (m < 1440) return `${Math.floor(m / 60)} hr ago`
  return `${Math.floor(m / 1440)} days ago`
}

export default function Orders() {
  const { safetyMode } = useSafety()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (safetyMode) return; // don't load regular orders in safety mode
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: ords } = await supabase
        .from('orders')
        .select('*, restaurants(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        
      setOrders(ords || [])
      setLoading(false)
    }
    load()
  }, [safetyMode])

  if (safetyMode) {
    return <Vault />
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col gap-3 p-4 pb-24" style={{ backgroundColor: '#F2F2F2' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 skeleton h-24" />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-6" style={{ backgroundColor: '#F2F2F2' }}>
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <h1 className="text-xl font-bold mb-4" style={{ color: '#282C3F' }}>Your Orders</h1>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
            <div className="text-7xl">📦</div>
            <p className="font-bold text-xl" style={{ color: '#282C3F' }}>No orders yet</p>
            <p className="text-sm" style={{ color: '#686B78' }}>Your orders will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((d) => {
              const restaurantName = d.restaurants?.name || 'Restaurant'
              const subtitle = `₹${d.total} • ${statusMap[d.status] || d.status}`
              const time = timeSince(d.created_at)

              return (
                <div
                  key={`order-${d.id}`}
                  className="bg-white rounded-2xl px-4 py-4 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow select-none"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFF3E8' }}>
                    <span className="text-2xl">🛵</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: '#282C3F' }}>Order from {restaurantName}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#686B78' }}>{subtitle}</p>
                    <p className="text-xs mt-1 font-medium" style={{ color: '#FC8019' }}>{time}</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#ccc' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

