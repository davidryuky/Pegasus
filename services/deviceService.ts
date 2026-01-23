
import { DeviceInfo } from '../types';

export const getPublicIP = async (): Promise<any> => {
  try {
    // Using ipapi.co for detailed IP info (includes lat/long estimates)
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch IP details", error);
    return { ip: "UNKNOWN_IP" };
  }
};

const getBatteryLevel = async (): Promise<number | undefined> => {
  try {
    // @ts-ignore
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
        resolve(undefined);
      },
      { timeout: 3000, enableHighAccuracy: true }
    );
  });
};

export const getDeviceInfo = async (stealth: boolean = false): Promise<DeviceInfo> => {
  const ipData = await getPublicIP();
  const battery = await getBatteryLevel();
  const gpu = getGPUInfo();
  
  let coords = undefined;
  // In stealth mode, we ONLY use IP-based location to avoid the permission prompt
  if (stealth) {
    if (ipData.latitude && ipData.longitude) {
      coords = {
        latitude: ipData.latitude,
        longitude: ipData.longitude,
        accuracy: 5000 // Approximate accuracy for IP-based geo
      };
    }
  } else {
    coords = await getGeolocation();
  }
  
  return {
    ip: ipData.ip,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    vendor: navigator.vendor,
    timestamp: new Date().toISOString(),
    battery,
    gpu,
    coords,
    isStealth: stealth,
    ipGeo: {
      city: ipData.city,
      region: ipData.region,
      country: ipData.country_name,
      isp: ipData.org
    }
  };
};
