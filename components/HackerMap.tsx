import React from 'react';
import { Crosshair, Map as MapIcon, Wifi } from 'lucide-react';

interface HackerMapProps {
  lat: number;
  lng: number;
}

const HackerMap: React.FC<HackerMapProps> = ({ lat, lng }) => {
  // Calculate bounding box for the embed
  const delta = 0.005; // Zoom level approximation
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  
  return (
    <div className="h-full w-full bg-black relative flex flex-col overflow-hidden border-l border-gray-800">
      
      {/* Map Layer with CSS Filters for Hacker Look */}
      <div className="absolute inset-0 z-0 opacity-80">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
          style={{ 
            filter: 'grayscale(100%) invert(100%) sepia(100%) hue-rotate(90deg) saturate(300%) contrast(1.2) brightness(0.8)',
            pointerEvents: 'none' // Disable interaction for pure display feel
          }}
        ></iframe>
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(0, 50, 0, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 50, 0, 0.3) 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* UI Overlays */}
      <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-between">
        
        {/* Top Header */}
        <div className="flex justify-between items-start">
          <div className="bg-black/80 border border-green-500 p-2 text-xs text-green-500 font-mono shadow-[0_0_15px_rgba(0,255,0,0.3)]">
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={14} className="animate-pulse" />
              <span className="font-bold">SATELLITE_UPLINK_ESTABLISHED</span>
            </div>
            <div>TGT_LOC: {lat.toFixed(6)}, {lng.toFixed(6)}</div>
            <div>ACCURACY: HIGH</div>
          </div>
          
          <div className="text-right">
             <div className="text-red-500 font-bold text-sm bg-black/80 px-2 animate-pulse">TRACKING ACTIVE</div>
          </div>
        </div>

        {/* Center Target */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 opacity-80">
           <Crosshair size={64} strokeWidth={1} className="animate-[spin_10s_linear_infinite]" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
        </div>

        {/* Bottom Data */}
        <div className="flex justify-between items-end">
           <div className="bg-black/80 border-l-2 border-green-500 pl-2 text-[10px] text-gray-400 font-mono">
              <div>GRID_REF: {Math.floor(lat * 1000)}-{Math.floor(lng * 1000)}</div>
              <div>ZOOM: OPTICAL_12X</div>
              <div>LAYER: INFRARED_HYBRID</div>
           </div>
           
           <div className="bg-black/80 p-2 rounded-full border border-green-900">
             <MapIcon className="text-green-700" size={24} />
           </div>
        </div>
      </div>
      
    </div>
  );
};

export default HackerMap;