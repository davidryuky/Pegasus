
import React, { useEffect, useRef } from 'react';
import { TerminalLog } from '../types';
import { Terminal as TerminalIcon, ShieldAlert, Cpu, Globe, Activity, ExternalLink } from 'lucide-react';

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
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400 font-bold';
      case 'system': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const getLogIcon = (type: TerminalLog['type']) => {
     switch (type) {
      case 'error': return <ShieldAlert size={14} className="mr-2 inline" />;
      case 'success': return <Activity size={14} className="mr-2 inline" />;
      case 'system': return <Cpu size={14} className="mr-2 inline" />;
      default: return <span className="mr-2">&gt;</span>;
    }
  };

  return (
    <div className="h-full w-full bg-black border-r border-gray-800 flex flex-col font-mono text-sm md:text-base relative overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 text-gray-400 p-2 border-b border-gray-800 flex items-center justify-between text-xs uppercase tracking-wider select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-green-500" />
          <span>PEGASUS_C2_TERMINAL</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={connected ? "text-green-500 animate-pulse" : "text-red-500"}>
            {connected ? "ONLINE" : "OFFLINE"}
          </span>
          <span>SID: {sessionId.substring(0, 8)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono crt-flicker">
        <div className="text-gray-500 mb-4 text-xs">
          <p>Initializing PEGASUS protocol v4.0.1...</p>
          <p>Listening on encrypted channel [MQTT/WSS]...</p>
          <p>Waiting for incoming telemetry...</p>
          <p>----------------------------------------</p>
        </div>

        {logs.map((log) => (
          <div key={log.id} className={`${getLogColor(log.type)} break-all flex items-start`}>
            <span className="text-gray-600 mr-2 text-xs whitespace-nowrap pt-[2px]">
              [{new Date(log.timestamp).toLocaleTimeString()}]
            </span>
            <div>
              {getLogIcon(log.type)}
              {log.message}
              {log.link && (
                <div className="mt-1 ml-4">
                  <a 
                    href={log.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-xs text-blue-400 underline decoration-blue-500/50 hover:text-white hover:bg-blue-900/50 px-1 rounded transition-colors"
                  >
                    <ExternalLink size={10} />
                    OPEN_EXTERNAL_MAP_LINK
                  </a>
                  <div className="text-[10px] text-gray-600 mt-0.5 font-mono select-all">
                    {log.link}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
        
        {/* Blinking Cursor */}
        <div className="mt-2 flex items-center text-green-500">
           <span className="animate-pulse">_</span>
        </div>
      </div>
      
      {/* Footer Stat line */}
      <div className="p-1 bg-black text-xs text-gray-600 border-t border-gray-900 flex justify-between items-center select-none">
         <div className="flex gap-4">
            <span>MEM: 64TB OK</span>
            <span>CPU: 4%</span>
            <span>NET: SECURE</span>
         </div>
         <span className="text-gray-800 hover:text-green-900 transition-colors font-bold tracking-widest opacity-50 hover:opacity-100">
            DEV: DAVI.DESIGN
         </span>
      </div>
    </div>
  );
};

export default Terminal;
