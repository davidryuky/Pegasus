
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Terminal from '../components/Terminal';
import QRCodeDisplay from '../components/QRCodeDisplay';
import HackerMap from '../components/HackerMap';
import { mqttService } from '../services/mqttService';
import { TerminalLog, DeviceInfo } from '../types';

const Dashboard: React.FC = () => {
  const [sessionId] = useState(uuidv4());
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [targetCoords, setTargetCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // Audio context for sound effects
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'connect' | 'data' | 'boot') => {
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
    }
  }, []);

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: uuidv4(),
      message,
      type,
      timestamp: new Date().toISOString()
    }]);
    
    // Play subtle data sound for every log, but heavier sound for success
    if (type === 'success' || type === 'warning') {
        playSound('data');
    }
  }, [playSound]);

  useEffect(() => {
    // Construct the URL that the phone should open
    // Using hash routing - Works perfectly on Vercel/Static hosting
    const baseUrl = window.location.href.split('#')[0];
    const scanUrl = `${baseUrl}#/scan?session=${sessionId}`;
    setTargetUrl(scanUrl);

    // Initialize audio context on first user interaction if needed, 
    // but here we just try to init it on mount (might be blocked until click, but acceptable for terminal)
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
          
          if (payload.battery) {
             addLog(`POWER_LEVEL: ${payload.battery}%`, 'info');
          }
          
          if (payload.gpu) {
             addLog(`GPU_RENDERER: ${payload.gpu}`, 'info');
          }

          if (payload.coords) {
             addLog(`GPS_TRIANGULATION: SUCCESS`, 'success');
             addLog(`LAT: ${payload.coords.latitude}`, 'warning');
             addLog(`LON: ${payload.coords.longitude}`, 'warning');
             addLog(`ACCURACY: ${payload.coords.accuracy}m`, 'info');
             
             // Update state to show map
             setTargetCoords({
               lat: payload.coords.latitude,
               lng: payload.coords.longitude
             });
             
          } else {
             addLog(`GPS_SIGNAL: NOT_DETECTED/DENIED`, 'error');
          }
          
          // Break down User Agent
          const ua = payload.userAgent;
          if (ua.includes('Android')) addLog(`OS_FAMILY: Android`, 'warning');
          if (ua.includes('iPhone')) addLog(`OS_FAMILY: iOS`, 'warning');
          
          addLog(`USER_AGENT_RAW: ${ua.substring(0, 40)}...`, 'system');
          addLog(`DATA_EXTRACTION_COMPLETE.`, 'success');
          addLog(`-----------------------------------`, 'system');
        }, 800);
      },
      () => {
        setConnected(true);
        addLog(`C2_SERVER_ONLINE. Waiting for target...`, 'success');
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
        // Ensure audio context is resumed on click if browser blocked autoplay
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      }}
    >
      {/* Left Side: Terminal */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative z-20">
        <Terminal logs={logs} connected={connected} sessionId={sessionId} />
      </div>

      {/* Right Side: QR Code OR Hacker Map */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative z-10 border-l border-gray-800">
        {targetCoords ? (
          <HackerMap lat={targetCoords.lat} lng={targetCoords.lng} />
        ) : (
          <QRCodeDisplay url={targetUrl} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
