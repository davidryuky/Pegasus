import { DeviceInfo } from '../types';

export const getPublicIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("Failed to fetch IP", error);
    return "UNKNOWN_IP";
  }
};

const getBatteryLevel = async (): Promise<number | undefined> => {
  try {
    // @ts-ignore - Navigator.getBattery is widely supported but experimental in types
    if (navigator.getBattery) {
      // @ts-ignore
      const battery = await navigator.getBattery();
      return Math.round(battery.level * 100);
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const getGPUInfo = (): string | undefined => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const getGeolocation = (): Promise<{latitude: number, longitude: number, accuracy: number} | undefined> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.warn("Geolocation denied or failed", error);
        resolve(undefined);
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
};

export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  // Parallel execution for speed, but wait for IP as it's critical
  const ip = await getPublicIP();
  const battery = await getBatteryLevel();
  const gpu = getGPUInfo();
  const coords = await getGeolocation();
  
  return {
    ip,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    vendor: navigator.vendor,
    timestamp: new Date().toISOString(),
    battery,
    gpu,
    coords
  };
};