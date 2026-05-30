import React, { useState, useEffect } from 'react'

// Maps real SOS reply text → fake Zwiggy-style order status messages
const DISGUISE_MAP = {
  'Coming to you':      { fake: 'Your delivery partner is on the way!',        icon: '🛵', color: '#3b82f6' },
  'Calling police':     { fake: 'Order confirmed — preparing now 🍳',          icon: '👨‍🍳', color: '#f59e0b' },
  'Call me back':       { fake: 'Restaurant is calling about your order 📞',    icon: '📞', color: '#8b5cf6' },
  'Stay where you are': { fake: 'Delivery partner is nearby — please wait 📍',  icon: '📍', color: '#10b981' },
  'I see you':          { fake: 'Your order has arrived! 🎉',                   icon: '✅', color: '#10b981' },
}

const FALLBACK = { fake: 'Order update received', icon: '📦', color: '#6b7280' }

export default function SOSNotificationBanner({ replies, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const [currentReply, setCurrentReply] = useState(null)

  useEffect(() => {
    if (replies && replies.length > 0) {
      const latest = replies[0]
      // Only show if this is a new reply (different from current)
      if (!currentReply || latest.id !== currentReply.id) {
        setCurrentReply(latest)
        setVisible(true)

        // Auto-dismiss after 10 seconds
        const timer = setTimeout(() => setVisible(false), 10000)
        return () => clearTimeout(timer)
      }
    }
  }, [replies])

  if (!visible || !currentReply) return null

  const disguise = DISGUISE_MAP[currentReply.reply_text] || FALLBACK
  const contactInitial = (currentReply.contact_name || 'D')[0].toUpperCase()

  return (
    <div
      onClick={() => setVisible(false)}
      className="cursor-pointer select-none"
      style={{
        backgroundColor: '#2d6a4f',
        animation: 'slideDown 0.4s ease-out',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Fake delivery icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          {disguise.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Fake order status message */}
          <p className="text-white text-sm font-bold truncate">
            {disguise.fake}
          </p>
          {/* Subtle real info hidden as "restaurant name" */}
          <p className="text-white/60 text-xs mt-0.5 truncate">
            from {currentReply.contact_name || 'Delivery Partner'} • just now
          </p>
        </div>

        {/* Pulsing dot indicator */}
        <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </div>
      </div>
    </div>
  )
}

// Export the disguise map for use in Orders.jsx
export { DISGUISE_MAP, FALLBACK }
