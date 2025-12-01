import React from 'react';
import QRCode from 'react-qr-code';
import { Scan, Smartphone } from 'lucide-react';

interface QRCodeDisplayProps {
  url: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-8 relative">
      <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
         <Scan size={200} className="text-green-900" />
      </div>

      <div className="z-10 flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white tracking-widest uppercase">Target Acquisition</h2>
          <p className="text-gray-500 font-mono text-sm">Scan to transmit biometrics & telemetry</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white p-4 rounded-lg shadow-2xl">
            <QRCode 
              value={url} 
              size={256} 
              fgColor="#000000" 
              bgColor="#FFFFFF" 
              level="H" 
            />
          </div>
          
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 -mt-2 -ml-2"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 -mt-2 -mr-2"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 -mb-2 -ml-2"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 -mb-2 -mr-2"></div>
        </div>

        <div className="flex items-center gap-3 text-green-500/80 font-mono text-xs border border-green-900/50 px-4 py-2 rounded bg-green-900/10">
          <Smartphone size={16} />
          <span>AWAITING CONNECTION...</span>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;