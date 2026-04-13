import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
        <p className="text-gray-500 font-medium">Acquiring live location stream...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {!isActive && (
        <div className="absolute top-4 left-0 right-0 z-[1000] mx-auto w-11/12 max-w-md bg-white border-l-4 border-green-500 shadow-md p-4 rounded text-center">
          <p className="text-green-700 font-bold mb-1">Target is Safe</p>
          <p className="text-xs text-gray-500">Live tracking has been deactivated by the user.</p>
        </div>
      )}
      
      {isActive && (
        <div className="absolute top-4 left-0 right-0 z-[1000] mx-auto w-11/12 max-w-md bg-white border-l-4 border-red-600 shadow-md p-4 rounded flex items-center justify-between">
          <div className="text-left">
            <p className="text-red-600 font-bold mb-0.5">Live Tracking Active</p>
            <p className="text-xs text-gray-500">Location is updating in real-time.</p>
          </div>
          <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse mr-2"></div>
        </div>
      )}

      <MapContainer center={position} zoom={16} scrollWheelZoom={true} className="h-full w-full z-[0]">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            {isActive ? "User is here (Live)" : "Last known location"}
          </Popup>
        </Marker>
        <MapUpdater position={position} />
      </MapContainer>
    </div>
  );
}
