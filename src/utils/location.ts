import { Geolocation } from '@capacitor/geolocation';
import { AsyncStorage } from './storage';

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  mapsUrl: string;
  timestamp: string;
  source: 'gps_satellite' | 'cached_gps' | 'unavailable';
}

const STORAGE_LAST_LOCATION = '@droidguard_last_gps_location';
let latestCachedLocation: LocationResult | null = null;
let backgroundWatchId: string | null = null;

export async function initializeBackgroundGPS(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_LAST_LOCATION);
    if (raw) {
      latestCachedLocation = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== 'granted') return false;
    }

    startSilentBackgroundWatch();
    return true;
  } catch (e) {
    console.warn('[Location] Geolocation init error:', e);
    return false;
  }
}

export async function promptActivateHardwareGPS(): Promise<{ success: boolean; message: string; loc?: LocationResult }> {
  try {
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== 'granted') {
      return { success: false, message: 'تم رفض إذن الموقع الجغرافي. يرجى تفعيله من الإعدادات.' };
    }
    
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    
    const lat = parseFloat(pos.coords.latitude.toFixed(6));
    const lng = parseFloat(pos.coords.longitude.toFixed(6));
    const accuracy = Math.round(pos.coords.accuracy);
    const res: LocationResult = {
      latitude: lat,
      longitude: lng,
      accuracy,
      mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
      timestamp: new Date().toLocaleTimeString(),
      source: 'gps_satellite',
    };
    
    latestCachedLocation = res;
    await AsyncStorage.setItem(STORAGE_LAST_LOCATION, JSON.stringify(res));
    startSilentBackgroundWatch();
    
    return {
      success: true,
      message: `تم تفعيل الـ GPS بنجاح! الإحداثيات الحالية: ${lat}, ${lng} (دقة ${accuracy}م)`,
      loc: res,
    };
  } catch (err: any) {
    return { success: false, message: 'تعذر تشغيل الـ GPS: ' + err.message };
  }
}

async function startSilentBackgroundWatch() {
  if (backgroundWatchId !== null) return;

  try {
    backgroundWatchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
      async (pos, err) => {
        if (err || !pos) return;

        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);
        
        const res: LocationResult = {
          latitude: lat,
          longitude: lng,
          accuracy,
          mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
          timestamp: new Date().toLocaleTimeString(),
          source: 'gps_satellite',
        };
        
        latestCachedLocation = res;
        await AsyncStorage.setItem(STORAGE_LAST_LOCATION, JSON.stringify(res));
      }
    );
  } catch (e) {
    console.warn('[Location] Failed to start watchPosition:', e);
  }
}

export async function fetchDeviceLocation(): Promise<LocationResult> {
  const timestamp = new Date().toLocaleTimeString();

  let baseline = latestCachedLocation;
  if (!baseline) {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_LAST_LOCATION);
      if (stored) {
        baseline = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location === 'granted' || perm.coarseLocation === 'granted') {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
      
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));
      const accuracy = Math.round(pos.coords.accuracy);
      
      const res: LocationResult = {
        latitude: lat,
        longitude: lng,
        accuracy,
        mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
        timestamp,
        source: 'gps_satellite',
      };
      
      latestCachedLocation = res;
      try {
        await AsyncStorage.setItem(STORAGE_LAST_LOCATION, JSON.stringify(res));
      } catch {
        // ignore
      }
      return res;
    }
  } catch (err) {
    console.warn('[Location] High accuracy fetch failed:', err);
  }

  if (baseline) {
    return { ...baseline, timestamp, source: 'cached_gps' };
  }

  return {
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    mapsUrl: 'Location unavailable',
    timestamp,
    source: 'unavailable',
  };
}
