import React, { useEffect, useState } from 'react';
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!position) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: '#111827' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-slate-400 font-medium">Acquiring live secure location stream...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative font-sans">
      {/* Inject animations */}
      <style>{pulseIconCSS}</style>

      {/* Floating Header Card */}
      {!isActive ? (
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

      {/* Leaflet Map */}
      <MapContainer center={position} zoom={16} scrollWheelZoom={true} className="h-full w-full z-[0]">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
        <MapUpdater position={position} />
      </MapContainer>
    </div>
  );
}
