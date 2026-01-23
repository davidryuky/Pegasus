
import React, { useEffect, useRef } from 'react';
import { TerminalLog } from '../types';
import { Terminal as TerminalIcon, ShieldAlert, Cpu, Activity } from 'lucide-react';

interface TerminalProps {
  logs: TerminalLog[];
  connected: boolean;
  sessionId: string;
}

const Terminal: React.FC<TerminalProps> = ({ logs, connected, sessionId }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: TerminalLog['type']) => {
    switch (type) {
      case 'error': return 'text-red-500 bg-red-900/10 px-1';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400 font-bold';
      case 'system': return 'text-blue-400';
      default: return 'text-zinc-400';
    }
  };

  const getLogIcon = (type: TerminalLog['type']) => {
     switch (type) {
      case 'error': return <ShieldAlert size={12} className="mr-2 inline" />;
      case 'success': return <Activity size={12} className="mr-2 inline" />;
      case 'system': return <Cpu size={12} className="mr-2 inline" />;
      default: return <span className="mr-2 opacity-50">&gt;</span>;
    }
  };

  return (
    <div className="h-full w-full bg-black border-r border-gray-800 flex flex-col font-mono relative overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-950 text-gray-400 p-3 border-b border-gray-900 flex items-center justify-between text-[10px] uppercase tracking-widest select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-green-600" />
          <span className="font-bold">PEGASUS_C2_TERMINAL</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span>{connected ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <span className="opacity-50">NODE: {sessionId.substring(0, 8)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 text-[11px] md:text-[12px] crt-flicker">
        <div className="text-zinc-600 mb-6 font-bold leading-tight">
          <p className="animate-pulse">&gt; Initializing PEGASUS protocol v4.0.1...</p>
          <p>&gt; Encrypted channel [MQTT/WSS] ready.</p>
          <p>&gt; Secure Node: {sessionId}</p>
          <p className="text-zinc-800">----------------------------------------</p>
        </div>

        {logs.length === 0 && (
           <div className="text-zinc-800 animate-pulse mt-4">&gt; Listening for target uplink...</div>
        )}

        {logs.map((log) => (
          <div key={log.id} className={`${getLogColor(log.type)} break-all flex items-start py-0.5`}>
            <span className="text-zinc-800 mr-2 text-[9px] whitespace-nowrap pt-[3px] font-sans">
              [{new Date(log.timestamp).toLocaleTimeString()}]
            </span>
            <div className="flex-1">
              {getLogIcon(log.type)}
              {log.message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-8" />
      </div>
      
      {/* Footer Stats */}
      <div className="p-2 bg-black text-[9px] text-zinc-700 border-t border-zinc-900 flex justify-between items-center select-none uppercase font-sans">
         <div className="flex gap-4">
            <span className="flex items-center gap-1"><Cpu size={10}/> 0.4%</span>
            <span className="flex items-center gap-1"><Activity size={10}/> 124bps</span>
         </div>
         <span className="tracking-widest opacity-20">Secure-C2-Socket</span>
      </div>
    </div>
  );
};

export default Terminal;
