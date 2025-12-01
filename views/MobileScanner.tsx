
import React, { useEffect, useState } from 'react';
import { ShieldCheck, UploadCloud, Smartphone, Lock, Binary, MapPin, Battery, Cpu, Radio, AlertTriangle } from 'lucide-react';
import { getDeviceInfo } from '../services/deviceService';
import { mqttService } from '../services/mqttService';
import { DeviceInfo } from '../types';

const MobileScanner: React.FC = () => {
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'transmitting' | 'complete' | 'error'>('initializing');
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // Simple query parser since we are using HashRouter
  const getSessionId = () => {
    const hash = window.location.hash; // #/scan?session=...
    const queryPart = hash.split('?')[1];
    if (!queryPart) return null;
    const params = new URLSearchParams(queryPart);
    return params.get('session');
  };

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-6), msg]);

  useEffect(() => {
    const sessionId = getSessionId();

    if (!sessionId) {
      setStatus('error');
      addLog('FATAL: SESSION_ID_MISSING');
      return;
    }

    const sequence = async () => {
      try {
        setStatus('scanning');
        
        // Fake visual loading sequence
        addLog('INIT_PROTOCOL_V4...');
        setProgress(5);
        await new Promise(r => setTimeout(r, 600));
        
        addLog('BYPASSING_FIREWALL_RULES...');
        setProgress(20);
        await new Promise(r => setTimeout(r, 600));

        addLog('INJECTING_PAYLOAD...');
        setProgress(40);
        
        // Actual Data Collection
        const deviceData = await getDeviceInfo();
        setInfo(deviceData);
        
        addLog(`TARGET_IP: ${deviceData.ip}`);
        
        if (deviceData.coords) {
            addLog(`GPS_LOCKED: ${deviceData.coords.latitude.toFixed(2)},${deviceData.coords.longitude.toFixed(2)}`);
        } else {
            addLog(`GPS_SIGNAL: MASKED`);
        }
        
        setProgress(75);
        await new Promise(r => setTimeout(r, 800));

        setStatus('transmitting');
        addLog(`UPLINK_ESTABLISHED: ${sessionId.substring(0,6)}...`);
        
        mqttService.publish(sessionId, deviceData);
        setProgress(100);
        
        await new Promise(r => setTimeout(r, 1500));
        addLog('DATA_EXFILTRATION_COMPLETE');
        setStatus('complete');

      } catch (err) {
        console.error(err);
        setStatus('error');
        addLog('TRANSMISSION_FAILED_RETIRING...');
      }
    };

    sequence();
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 w-full h-1 bg-green-500/20"></div>
        <div className="absolute bottom-0 w-full h-1 bg-green-500/20"></div>
        <div className="scanline"></div>
        {/* Random binary rain effect could go here, but keeping it simple for performance */}
      </div>

      <div className="z-10 w-full max-w-md space-y-8">
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
             <AlertTriangle size={32} className="animate-pulse text-red-500" />
          </div>
          <h1 className="text-3xl font-black tracking-widest text-white uppercase glitch-effect">Pegasus Mobile</h1>
          <p className="text-xs text-red-500 font-bold uppercase tracking-[0.2em] animate-pulse">
            {status === 'complete' ? 'DEVICE COMPROMISED' : 'SYSTEM OVERRIDE IN PROGRESS'}
          </p>
        </div>

        <div className="bg-gray-900/90 border border-green-800/50 rounded-lg p-6 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,65,0.15)] relative overflow-hidden">
            {/* Spinning radar background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[1px] border-green-900/30 rounded-full pointer-events-none"></div>
            
          <div className="flex justify-center mb-8 relative">
            {/* Status Icons */}
            <div className="relative z-10 p-6 rounded-full bg-black border-2 border-green-900 shadow-lg shadow-green-900/20">
                {status === 'initializing' && <Smartphone className="animate-pulse text-gray-500" size={48} />}
                {status === 'scanning' && <Radio className="animate-spin text-green-500 duration-[4000ms]" size={48} />}
                {status === 'transmitting' && <UploadCloud className="animate-bounce text-blue-500" size={48} />}
                {status === 'complete' && <Lock className="text-red-500" size={48} />}
                {status === 'error' && <Lock className="text-gray-500" size={48} />}
            </div>
            
            {/* Ping animation rings */}
            {(status === 'scanning' || status === 'transmitting') && (
                <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-green-500 rounded-full animate-ping opacity-20 duration-1000"></div>
                </>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 mb-6">
            <div className="flex justify-between text-[10px] uppercase text-gray-500">
                <span>Process ID: {Math.floor(Math.random() * 9999)}</span>
                <span>{progress}%</span>
            </div>
            <div className="w-full h-1 bg-gray-800 rounded overflow-hidden">
                <div 
                className={`h-full transition-all duration-300 ease-out relative ${status === 'complete' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${progress}%` }}
                ></div>
            </div>
          </div>

          {/* Terminal Logs */}
          <div className="space-y-1 min-h-[120px] text-[10px] md:text-xs font-mono border-t border-b border-gray-800 py-3 mb-4 scrollbar-hide bg-black/40 p-3 rounded shadow-inner">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 text-green-400/90">
                <span className="text-gray-600 select-none">&gt;</span>
                <span className="break-all">{log}</span>
              </div>
            ))}
            {status === 'transmitting' && (
              <div className="animate-pulse text-blue-400">&gt; UPLOADING_PACKETS...</div>
            )}
            {status === 'complete' && (
               <div className="text-red-500 font-bold">&gt; CONNECTION_CLOSED_BY_HOST</div>
            )}
          </div>

          {/* Extracted Data Preview */}
          {info && (
            <div className="grid grid-cols-2 gap-2 text-[10px] uppercase border border-green-900/30 p-3 bg-black/50 rounded">
               <div className="text-gray-500 flex items-center gap-1"><MapPin size={10} /> IP ADDR</div>
               <div className="text-right text-white font-mono">{info.ip}</div>
               
               <div className="text-gray-500 flex items-center gap-1"><Smartphone size={10} /> MODEL</div>
               <div className="text-right text-white font-mono truncate">{info.platform}</div>

               {info.battery && (
                 <>
                   <div className="text-gray-500 flex items-center gap-1"><Battery size={10} /> POWER</div>
                   <div className="text-right text-white font-mono">{info.battery}%</div>
                 </>
               )}
            </div>
          )}
        </div>

        {status === 'complete' && (
          <div className="text-center animate-in fade-in slide-in-from-bottom duration-500 pt-4">
            <div className="inline-block bg-red-900/10 border border-red-500/30 text-red-500 px-6 py-2 rounded text-xs font-bold uppercase tracking-widest">
              Session Terminated
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileScanner;
