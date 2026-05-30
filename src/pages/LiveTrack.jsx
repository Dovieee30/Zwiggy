import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// CSS injection for premium styling and custom animations
const pulseIconCSS = `
  .custom-pulsing-icon, .custom-safe-icon {
    background: transparent;
    border: none;
  }
  .pulse-container {
    position: relative;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pulse-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid white;
    transition: all 0.3s ease;
  }
  .pulse-dot-red {
    background-color: #ef4444;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
  }
  .pulse-dot-green {
    background-color: #10b981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
  }
  .pulse-ring {
    position: absolute;
    width: 30px;
    height: 30px;
    border: 3px solid #ef4444;
    border-radius: 50%;
    animation: pulse-animation 1.5s infinite ease-out;
    opacity: 0;
  }
  @keyframes pulse-animation {
    0% {
      transform: scale(0.4);
      opacity: 0.9;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  .slide-up { animation: slideUp 0.3s ease-out; }
  @keyframes fadeInScale {
    from { transform: scale(0.95); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
  .fade-in-scale { animation: fadeInScale 0.25s ease-out; }
`;

// Live Distress Icon (Pulsing Red)
const liveIcon = L.divIcon({
  className: 'custom-pulsing-icon',
  html: `
    <div class="pulse-container">
      <div class="pulse-ring"></div>
      <div class="pulse-dot pulse-dot-red"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

// Safe Target Icon (Static/Glowing Green)
const safeIcon = L.divIcon({
  className: 'custom-safe-icon',
  html: `
    <div class="pulse-container">
      <div class="pulse-dot pulse-dot-green"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

// Pre-set reply options for contacts
const REPLY_OPTIONS = [
  { emoji: '🚗', text: 'Coming to you',     color: '#3b82f6' },
  { emoji: '🚨', text: 'Calling police',    color: '#ef4444' },
  { emoji: '📞', text: 'Call me back',      color: '#f59e0b' },
  { emoji: '📍', text: 'Stay where you are', color: '#8b5cf6' },
  { emoji: '✅', text: 'I see you',          color: '#10b981' },
];

function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
}

export default function LiveTrack() {
  const { userId } = useParams();
  const [position, setPosition] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [contactName, setContactName] = useState('');
  const [sentReplies, setSentReplies] = useState(new Set());
  const [sending, setSending] = useState(null);
  const [allReplies, setAllReplies] = useState([]);
  const [showConfirm, setShowConfirm] = useState(null);
  const replyPanelRef = useRef(null);

  useEffect(() => {
    let channel;

    // 1. Fetch initial position
    supabase.from('live_tracking').select('*').eq('user_id', userId).single()
      .then(({ data, error }) => {
        if (data && data.lat && data.lng) {
          setPosition([data.lat, data.lng]);
          setIsActive(data.is_active);
        }
      });

    // 2. Subscribe to realtime updates for this specific user
    channel = supabase.channel(`tracking_${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'live_tracking', 
        filter: `user_id=eq.${userId}` 
      }, (payload) => {
        if (payload.new) {
          const { lat, lng, is_active } = payload.new;
          if (lat && lng) {
            setPosition([lat, lng]);
            setIsActive(is_active);
          }
        }
      })
      .subscribe();

    // 3. Fetch existing replies
    supabase.from('sos_replies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setAllReplies(data);
      });

    // 4. Subscribe to new replies (to show what others are sending)
    const replyChannel = supabase.channel(`replies_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sos_replies',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.new) {
          setAllReplies(prev => [payload.new, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(replyChannel);
    };
  }, [userId]);

  // Send a reply to the victim
  const handleReply = async (replyText) => {
    if (sentReplies.has(replyText) || sending) return;

    const name = contactName.trim() || 'Someone';
    setSending(replyText);

    try {
      const { error } = await supabase.from('sos_replies').insert({
        user_id: userId,
        contact_name: name,
        reply_text: replyText,
      });

      if (error) {
        console.error('[LiveTrack] Reply insert failed:', error);
        setSending(null);
        return;
      }

      setSentReplies(prev => new Set([...prev, replyText]));
      setShowConfirm(replyText);
      setTimeout(() => setShowConfirm(null), 3000);
    } catch (err) {
      console.error('[LiveTrack] Reply error:', err);
    }
    setSending(null);
  };

  const mapCenter = position || [28.6139, 77.2090]; // Default to New Delhi if no GPS

  return (
    <div className="h-screen w-full relative font-sans" style={{ backgroundColor: '#111827' }}>
      {/* Inject animations */}
      <style>{pulseIconCSS}</style>

      {/* Floating Header Card */}
      {!position ? (
        <div className="absolute top-6 left-0 right-0 z-[1000] mx-auto w-11/12 max-w-md bg-slate-900/90 backdrop-blur-md text-white border border-orange-500/30 shadow-2xl p-4 rounded-2xl flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            <div className="text-left">
              <p className="font-extrabold text-sm tracking-wide text-orange-400 uppercase">Acquiring GPS...</p>
              <p className="text-xs text-slate-300 font-medium">Waiting for victim's location signal</p>
            </div>
          </div>
        </div>
      ) : !isActive ? (
        <div className="absolute top-6 left-0 right-0 z-[1000] mx-auto w-11/12 max-w-md bg-slate-900/90 backdrop-blur-md text-white border border-emerald-500/30 shadow-2xl p-4 rounded-2xl flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <div className="text-left">
              <p className="font-extrabold text-sm tracking-wide text-emerald-400 uppercase">User is Safe</p>
              <p className="text-xs text-slate-300 font-medium">Live tracking has been securely deactivated</p>
            </div>
          </div>
          <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest border border-emerald-500/20">
            SECURE
          </div>
        </div>
      ) : (
        <div className="absolute top-6 left-0 right-0 z-[1000] mx-auto w-11/12 max-w-md bg-slate-900/90 backdrop-blur-md text-white border border-red-500/30 shadow-2xl p-4 rounded-2xl flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
            <div className="text-left">
              <p className="font-extrabold text-sm tracking-wide text-red-400 uppercase animate-pulse">Live tracking active</p>
              <p className="text-xs text-slate-300 font-medium">Emergency SOS broadcast is updating live</p>
            </div>
          </div>
          <div className="px-2.5 py-1 bg-red-500/20 text-red-400 text-[10px] font-black rounded-lg uppercase tracking-widest border border-red-500/20">
            SOS
          </div>
        </div>
      )}

      {/* Leaflet Map — takes 55% of screen height */}
      <div style={{ height: '55vh', width: '100%', opacity: position ? 1 : 0.5 }}>
        <MapContainer center={mapCenter} zoom={position ? 16 : 4} scrollWheelZoom={true} className="h-full w-full z-[0]">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && (
            <Marker position={position} icon={isActive ? liveIcon : safeIcon}>
              <Popup>
                <div className="text-center font-sans p-1">
                  <strong className={isActive ? "text-red-500" : "text-emerald-500"}>
                    {isActive ? "🔴 TARGET LOCATION (LIVE)" : "🟢 LAST KNOWN SECURE LOCATION"}
                  </strong>
                  <p className="text-xs text-slate-500 mt-1">Coordinates: {position[0].toFixed(5)}, {position[1].toFixed(5)}</p>
                </div>
              </Popup>
            </Marker>
          )}
          <MapUpdater position={position} />
        </MapContainer>
      </div>

      {/* Reply Panel — bottom 45% */}
      <div
        ref={replyPanelRef}
        className="absolute bottom-0 left-0 right-0 z-[1000] overflow-y-auto slide-up"
        style={{
          height: '45vh',
          backgroundColor: '#0f172a',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="px-5 pt-5 pb-6">
          {/* Handle bar */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

          <h2 className="text-white font-extrabold text-lg mb-1">Respond to SOS</h2>
          <p className="text-slate-400 text-xs mb-4">
            {isActive ? 'This person needs help. Let them know you are responding.' : 'The person has marked themselves as safe.'}
          </p>

          {/* Contact name input */}
          <div className="mb-4">
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full px-4 py-3 rounded-xl text-sm font-medium text-white placeholder-slate-500 outline-none transition-all duration-200"
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Reply buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {REPLY_OPTIONS.map((opt) => {
              const isSent = sentReplies.has(opt.text);
              const isSending = sending === opt.text;
              return (
                <button
                  key={opt.text}
                  onClick={() => handleReply(opt.text)}
                  disabled={isSent || !!sending || !isActive}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 fade-in-scale"
                  style={{
                    backgroundColor: isSent ? '#1e293b' : opt.color,
                    opacity: isSent ? 0.5 : (!isActive ? 0.4 : 1),
                    cursor: isSent || !isActive ? 'default' : 'pointer',
                    border: isSent ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    transform: isSending ? 'scale(0.95)' : 'scale(1)',
                  }}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="truncate">{isSent ? '✓ Sent' : opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Confirmation toast */}
          {showConfirm && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-center text-sm font-bold text-emerald-400 fade-in-scale"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
            >
              ✅ Your response "{showConfirm}" has been sent. They will see it instantly.
            </div>
          )}

          {/* Activity log — show all replies from all contacts */}
          {allReplies.length > 0 && (
            <div className="mt-2">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Response Log</h3>
              <div className="space-y-2">
                {allReplies.slice(0, 10).map((r, i) => (
                  <div
                    key={r.id || i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl fade-in-scale"
                    style={{ backgroundColor: '#1e293b' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: '#334155' }}>
                      {(r.contact_name || 'S')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{r.contact_name || 'Someone'}</p>
                      <p className="text-slate-400 text-xs">{r.reply_text}</p>
                    </div>
                    <span className="text-slate-500 text-[10px] flex-shrink-0">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
