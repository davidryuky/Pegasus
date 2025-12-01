import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Scan, Smartphone, Copy, Check, Link as LinkIcon } from 'lucide-react';

interface QRCodeDisplayProps {
  url: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-8 relative">
      <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
         <Scan size={200} className="text-green-900" />
      </div>

      <div className="z-10 flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-700 w-full max-w-sm">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white tracking-widest uppercase">Target Acquisition</h2>
          <p className="text-gray-500 font-mono text-sm">Scan to transmit biometrics & telemetry</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white p-4 rounded-lg shadow-2xl">
            <QRCode 
              value={url} 
              size={200} 
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

        {/* Copy Link Section */}
        <div className="w-full space-y-2">
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 bg-gray-900/80 border border-gray-700 rounded px-3 py-3 font-mono text-xs text-gray-400 flex items-center gap-2 group hover:border-green-800 transition-colors overflow-hidden">
               <LinkIcon size={12} className="text-green-600 shrink-0" />
               <span className="truncate select-all">{url}</span>
            </div>
            <button
              onClick={copyToClipboard}
              className={`p-3 border rounded transition-all duration-200 active:scale-95 ${
                copied 
                  ? 'bg-green-900/30 border-green-500 text-green-400' 
                  : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400'
              }`}
              title="Copy Payload URL"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <div className="text-center h-4">
             {copied && (
               <span className="text-[10px] text-green-500 font-mono uppercase tracking-widest animate-pulse">
                  &gt;&gt; PAYLOAD URL COPIED TO CLIPBOARD
               </span>
             )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-green-500/80 font-mono text-xs border border-green-900/50 px-4 py-2 rounded bg-green-900/10 mt-2">
          <Smartphone size={16} />
          <span>AWAITING CONNECTION...</span>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;