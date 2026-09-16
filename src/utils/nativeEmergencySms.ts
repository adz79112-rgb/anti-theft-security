/**
 * DroidGuard Native Emergency SMS Bridge
 * Interacts directly with Android SmsManager via EmergencySmsPlugin.
 * Sends SMS messages silently in the background without launching default messaging apps.
 * Strictly verifies delivery via Android native SmsManager callbacks.
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import { StoredSmsMessage } from '../types';

export interface SmsSendResult {
  success: boolean;
  confirmedBySmsManager: boolean;
  recipient: string;
  partsCount?: number;
  slotUsed?: number;
  error?: string;
  resultCode?: number;
  message?: string;
}

export interface SmsPermissionResult {
  granted: boolean;
  smsGranted?: boolean;
  phoneGranted?: boolean;
  locationGranted?: boolean;
  fineLocationGranted?: boolean;
  coarseLocationGranted?: boolean;
  cameraGranted?: boolean;
  allGranted?: boolean;
  hardcodedTestNumber?: string;
}

export interface EmergencySmsPluginInterface {
  checkSmsPermission(): Promise<SmsPermissionResult>;
  requestStartupPermissions(): Promise<SmsPermissionResult>;
  requestSmsPermission(): Promise<SmsPermissionResult>;
  requestPhonePermission(): Promise<SmsPermissionResult>;
  sendDirectSms(options: {
    phoneNumber: string;
    message: string;
    slot?: number;
  }): Promise<SmsSendResult>;
  sendFallbackIntentSms(options: {
    phoneNumber: string;
    message: string;
  }): Promise<{ success: boolean; message?: string; error?: string }>;
  requestBackgroundActivityPermission(): Promise<{ success: boolean; message?: string; error?: string }>;
  openDeveloperSettings(): Promise<{ success: boolean; error?: string }>;
  openAppSettings(): Promise<{ success: boolean; error?: string }>;
  openPremiumSmsSettings(): Promise<{ success: boolean; message?: string; error?: string }>;
  checkDeviceAdminStatus(): Promise<{ isAdmin: boolean; error?: string }>;
  requestDeviceAdmin(): Promise<{ success: boolean; isAdmin?: boolean; alreadyActive?: boolean; message?: string; error?: string }>;
  openDeviceAdminSettings(): Promise<{ success: boolean; error?: string }>;
  deactivateDeviceAdmin(): Promise<{ success: boolean; isAdmin?: boolean; error?: string }>;
  isAccessibilityServiceEnabled(): Promise<{ isEnabled: boolean; error?: string }>;
  openAccessibilitySettings(): Promise<{ success: boolean; error?: string }>;
  lockDeviceNow(): Promise<{ success: boolean; error?: string }>;
  forceEnableLocation(): Promise<{ success: boolean; alreadyEnabled?: boolean; method?: string; error?: string }>;
  isDefaultSmsApp(): Promise<{ isDefault: boolean; error?: string }>;
  requestDefaultSmsRole(): Promise<{ success: boolean; isDefault?: boolean; message?: string; error?: string }>;
  requestDefaultSmsApp(): Promise<{ success: boolean; isDefault?: boolean; message?: string; error?: string }>;
  getStoredSmsMessages(): Promise<{ messages: StoredSmsMessage[]; error?: string }>;
  deleteStoredSmsMessage(options: { id: string }): Promise<{ success: boolean; error?: string }>;
  clearStoredSmsMessages(): Promise<{ success: boolean; error?: string }>;
  isLocationServiceEnabled(): Promise<{ enabled: boolean; gpsEnabled?: boolean; networkEnabled?: boolean; error?: string }>;
  openLocationSettings(): Promise<{ opened: boolean; error?: string }>;
  getDeviceBrandInfo(): Promise<DeviceBrandInfo>;
  openManufacturerAutostartSettings(): Promise<{ success: boolean; target?: string; error?: string }>;
  getFreshDeviceLocation(): Promise<{
    success: boolean;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    mapsUrl?: string;
    provider?: string;
    source?: string;
    timestamp?: string;
    error?: string;
  }>;
  setAntiShutdownProtection(options: { enabled: boolean; pin?: string }): Promise<{ success: boolean; enabled?: boolean; error?: string }>;
  getAntiShutdownStatus(): Promise<{ enabled: boolean; isBypassed?: boolean; bypassRemainingSeconds?: number; error?: string }>;
  grantPowerOffBypass(options: { seconds: number }): Promise<{ success: boolean; bypassUntil?: number; openedNativeDialog?: boolean; error?: string }>;
  triggerPowerOffChallenge(): Promise<{ success: boolean; error?: string }>;
  isBatteryOptimizationIgnored(): Promise<{ isIgnored: boolean; error?: string }>;
  requestIgnoreBatteryOptimization(): Promise<{ success: boolean; error?: string }>;
  startPersistentForegroundProtection(): Promise<{ success: boolean; isRunning?: boolean; error?: string }>;
  isPersistentForegroundProtectionActive(): Promise<{ isActive: boolean; error?: string }>;
  getLastInspectedWindow(): Promise<{
    packageName: string;
    className: string;
    buttons: string;
    timestamp: number;
    error?: string;
  }>;
  clearLastInspectedWindow(): Promise<{ success: boolean; error?: string }>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<any>;
}

export const EmergencySmsPlugin = registerPlugin<EmergencySmsPluginInterface>('EmergencySmsPlugin');

/**
 * Checks whether the native SEND_SMS & READ_PHONE_STATE permissions have been granted.
 */
export async function checkSmsPermissionStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const res = await EmergencySmsPlugin.checkSmsPermission();
    return Boolean(res?.granted || res?.smsGranted);
  } catch (err) {
    console.warn('Failed to check SMS permission:', err);
    return false;
  }
}

/**
 * Explicitly triggers the native Android runtime popup for SEND_SMS:
 * "Allow DroidGuard to send and view SMS messages"
 */
export async function requestDirectSmsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const res = await EmergencySmsPlugin.requestSmsPermission();
    return Boolean(res?.granted || res?.smsGranted);
  } catch (err) {
    console.warn('Failed to request SMS permission:', err);
    return false;
  }
}

/**
 * Triggers the default system SMS app with pre-filled message and number
 */
export async function sendFallbackIntentSms(phoneNumber: string, message: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.warn('sendFallbackIntentSms: Platform not supported.');
    return false;
  }
  
  try {
    const result = await EmergencySmsPlugin.sendFallbackIntentSms({ phoneNumber, message });
    return Boolean(result?.success);
  } catch (err) {
    console.error('Failed to trigger fallback Intent SMS:', err);
    return false;
  }
}

/**
 * Immediate startup permission request:
 * Explicitly triggers the unified native Android runtime permission array containing
 * SEND_SMS, READ_PHONE_STATE, ACCESS_FINE_LOCATION, and ACCESS_COARSE_LOCATION at the exact same time!
 * Strictly requested UPFRONT at initial owner startup to ensure total stealth during theft.
 */
export async function requestStartupSecurityPermissions(): Promise<SmsPermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: false, smsGranted: false, phoneGranted: false, locationGranted: false, allGranted: false };
  }

  try {
    // Request SEND_SMS, READ_PHONE_STATE, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, CAMERA
    const res = await EmergencySmsPlugin.requestStartupPermissions();
    const smsGranted = Boolean(res?.smsGranted ?? res?.granted);
    const phoneGranted = Boolean(res?.phoneGranted);
    const locationGranted = Boolean(res?.locationGranted || res?.fineLocationGranted || res?.coarseLocationGranted);
    const cameraGranted = Boolean(res?.cameraGranted);

    return {
      granted: smsGranted,
      smsGranted,
      phoneGranted,
      locationGranted,
      fineLocationGranted: Boolean(res?.fineLocationGranted),
      coarseLocationGranted: Boolean(res?.coarseLocationGranted),
      cameraGranted,
      allGranted: Boolean(res?.allGranted ?? (smsGranted && phoneGranted && locationGranted && cameraGranted)),
      hardcodedTestNumber: res?.hardcodedTestNumber || '0563752023',
    };
  } catch (err) {
    console.warn('Failed unified startup permissions request, falling back:', err);
    try {
      const res = await EmergencySmsPlugin.requestSmsPermission();
      return {
        granted: Boolean(res?.granted || res?.smsGranted),
        smsGranted: Boolean(res?.smsGranted),
        phoneGranted: Boolean(res?.phoneGranted),
        locationGranted: Boolean(res?.locationGranted),
        allGranted: Boolean(res?.allGranted),
        hardcodedTestNumber: '0563752023',
      };
    } catch (fallbackErr) {
      console.warn('Fallback SMS permission error:', fallbackErr);
      return { granted: false, smsGranted: false, hardcodedTestNumber: '0563752023' };
    }
  }
}

/**
 * Sanitizes phone numbers by removing all whitespace, dashes, parentheses, brackets, dots, etc.
 * Preserves leading '+' for international standard notation.
 * e.g., '+213 661 12 34 56' -> '+213661123456'
 *       '(202) 555-0123' -> '2025550123'
 */
export function sanitizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  // Strip all whitespace, dashes, parentheses, brackets, dots
  let sanitized = phoneNumber.replace(/[\s\-\(\)\[\]\.]/g, '').trim();
  if (sanitized.startsWith('+')) {
    sanitized = '+' + sanitized.slice(1).replace(/\D/g, '');
  } else {
    sanitized = sanitized.replace(/\D/g, '');
  }
  return sanitized;
}

/**
 * Sends an emergency SMS directly and silently in the background via Android SmsManager.
 * Does NOT open the device's default SMS app.
 * Only returns success if confirmed by native SmsManager.
 */
export async function requestBackgroundActivityPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await EmergencySmsPlugin.requestBackgroundActivityPermission();
    return res.success;
  } catch (err) {
    console.warn('Background activity permission prompt failed:', err);
    return false;
  }
}

export async function openDeveloperSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.openDeveloperSettings();
    return res.success;
  } catch (err) {
    console.warn('Failed to open developer settings:', err);
    return false;
  }
}

export async function openAppSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.openAppSettings();
    return res.success;
  } catch (err) {
    console.warn('Failed to open app settings:', err);
    return false;
  }
}

export async function openPremiumSmsSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.openPremiumSmsSettings();
    return res.success;
  } catch (err) {
    console.warn('Failed to open premium SMS settings:', err);
    return false;
  }
}

export async function checkDeviceAdminStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.checkDeviceAdminStatus();
    return Boolean(res?.isAdmin);
  } catch (err) {
    console.warn('Failed to check device admin status:', err);
    return false;
  }
}

export async function requestDeviceAdmin(): Promise<{ success: boolean; isAdmin?: boolean; alreadyActive?: boolean; message?: string; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Device Admin is only available on native Android.' };
  }
  try {
    return await EmergencySmsPlugin.requestDeviceAdmin();
  } catch (err: any) {
    console.warn('Failed to request device admin:', err);
    return { success: false, error: err?.message || 'Failed to launch Device Admin intent.' };
  }
}

export async function openDeviceAdminSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.openDeviceAdminSettings();
    return Boolean(res?.success);
  } catch (err) {
    console.warn('Failed to open device admin settings:', err);
    return false;
  }
}

export async function deactivateDeviceAdminAction(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await EmergencySmsPlugin.deactivateDeviceAdmin();
    return Boolean(res?.success && !res?.isAdmin);
  } catch (err) {
    console.warn('Failed to deactivate device admin:', err);
    return false;
  }
}

export async function checkAccessibilityServiceStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.isAccessibilityServiceEnabled();
    return Boolean(res?.isEnabled);
  } catch (err) {
    console.warn('Failed to check accessibility service status:', err);
    return false;
  }
}

export async function openAccessibilitySettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.openAccessibilitySettings();
    return Boolean(res?.success);
  } catch (err) {
    console.warn('Failed to open accessibility settings:', err);
    return false;
  }
}

export async function lockDeviceNow(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.lockDeviceNow();
    return Boolean(res?.success);
  } catch (err) {
    console.warn('Failed to lock device:', err);
    return false;
  }
}

export async function forceEnableLocation(): Promise<{ success: boolean; alreadyEnabled?: boolean; method?: string }> {
  if (!Capacitor.isNativePlatform()) return { success: false };
  try {
    const res = await EmergencySmsPlugin.forceEnableLocation();
    return {
      success: Boolean(res?.success),
      alreadyEnabled: Boolean(res?.alreadyEnabled),
      method: res?.method,
    };
  } catch (err) {
    console.warn('Failed to force enable location:', err);
    return { success: false };
  }
}

export async function checkIsDefaultSmsApp(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.isDefaultSmsApp();
    return Boolean(res?.isDefault);
  } catch (err) {
    console.warn('Failed to check default SMS app status:', err);
    return false;
  }
}

export async function requestDefaultSmsRole(): Promise<{ success: boolean; isDefault?: boolean; message?: string }> {
  if (!Capacitor.isNativePlatform()) return { success: false, message: 'Web platform does not support Default SMS app role' };
  try {
    const res = await EmergencySmsPlugin.requestDefaultSmsRole();
    return res;
  } catch (err: any) {
    try {
      const fallbackRes = await EmergencySmsPlugin.requestDefaultSmsApp();
      return fallbackRes;
    } catch (fallbackErr: any) {
      console.warn('Failed to request default SMS app role:', err, fallbackErr);
      return { success: false, message: err?.message || fallbackErr?.message };
    }
  }
}

export async function requestSetDefaultSmsApp(): Promise<{ success: boolean; isDefault?: boolean; message?: string }> {
  return requestDefaultSmsRole();
}

export async function fetchStoredSmsMessages(): Promise<StoredSmsMessage[]> {
  if (!Capacitor.isNativePlatform()) {
    try {
      const raw = localStorage.getItem('droidguard_sms_messages');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  try {
    const res = await EmergencySmsPlugin.getStoredSmsMessages();
    return res?.messages || [];
  } catch (err) {
    console.warn('Failed to fetch native stored SMS messages:', err);
    return [];
  }
}

export async function removeStoredSmsMessage(id: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    try {
      const raw = localStorage.getItem('droidguard_sms_messages');
      const list: StoredSmsMessage[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((m) => m.id !== id);
      localStorage.setItem('droidguard_sms_messages', JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
  try {
    const res = await EmergencySmsPlugin.deleteStoredSmsMessage({ id });
    return Boolean(res?.success);
  } catch (err) {
    console.warn('Failed to delete native stored SMS:', err);
    return false;
  }
}

export async function purgeStoredSmsMessages(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    try {
      localStorage.removeItem('droidguard_sms_messages');
      return true;
    } catch {
      return false;
    }
  }
  try {
    const res = await EmergencySmsPlugin.clearStoredSmsMessages();
    return Boolean(res?.success);
  } catch (err) {
    console.warn('Failed to clear native stored SMS:', err);
    return false;
  }
}

export async function sendSilentBackgroundSms(
  phoneNumber: string,
  message: string,
  slot?: 1 | 2
): Promise<SmsSendResult> {
  const cleanPhone = sanitizePhoneNumber(phoneNumber);
  const cleanMessage = (message || '').trim();

  if (!cleanPhone) {
    return {
      success: false,
      confirmedBySmsManager: false,
      recipient: cleanPhone,
      error: 'Emergency recipient phone number is missing, invalid or empty after sanitization.',
    };
  }

  if (!cleanMessage) {
    return {
      success: false,
      confirmedBySmsManager: false,
      recipient: cleanPhone,
      error: 'SMS message body is empty.',
    };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await EmergencySmsPlugin.sendDirectSms({
        phoneNumber: cleanPhone,
        message: cleanMessage,
        slot,
      });

      return {
        success: Boolean(result?.success && result?.confirmedBySmsManager),
        confirmedBySmsManager: Boolean(result?.confirmedBySmsManager),
        recipient: cleanPhone,
        partsCount: result?.partsCount,
        slotUsed: result?.slotUsed,
        error: result?.error,
        resultCode: result?.resultCode,
        message: result?.message,
      };
    } catch (err: any) {
      return {
        success: false,
        confirmedBySmsManager: false,
        recipient: cleanPhone,
        error: err?.message || 'Native SMS dispatch threw an unexpected exception.',
      };
    }
  }

  // Web / non-native environment: No mock success!
  return {
    success: false,
    confirmedBySmsManager: false,
    recipient: cleanPhone,
    error: 'Direct background SMS requires running on an Android device via native SmsManager. Web preview does not have cellular baseband hardware.',
  };
}

/**
 * Checks whether Android Location Services (GPS / Network location) is enabled on the device.
 */
export async function checkDeviceLocationStatus(): Promise<{ enabled: boolean; gpsEnabled: boolean; networkEnabled: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    return { enabled: true, gpsEnabled: true, networkEnabled: true };
  }
  try {
    const res = await EmergencySmsPlugin.isLocationServiceEnabled();
    return {
      enabled: Boolean(res?.enabled),
      gpsEnabled: Boolean(res?.gpsEnabled),
      networkEnabled: Boolean(res?.networkEnabled),
    };
  } catch (e) {
    console.warn('checkDeviceLocationStatus error:', e);
    return { enabled: true, gpsEnabled: true, networkEnabled: true };
  }
}

/**
 * Opens Android Location Settings screen so the user can toggle GPS on.
 */
export async function openLocationSettingsScreen(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await EmergencySmsPlugin.openLocationSettings();
    return Boolean(res?.opened);
  } catch (e) {
    console.warn('openLocationSettingsScreen error:', e);
    return false;
  }
}

/**
 * Fetches fresh location directly from Android LocationManager (GPS_PROVIDER + NETWORK_PROVIDER + PASSIVE_PROVIDER).
 */
export async function fetchNativeHardwareLocation(): Promise<{
  success: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  mapsUrl: string;
  source: string;
  provider: string;
  timestamp: string;
} | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const res = await EmergencySmsPlugin.getFreshDeviceLocation();
    if (res?.success && typeof res.latitude === 'number' && typeof res.longitude === 'number') {
      return {
        success: true,
        latitude: res.latitude,
        longitude: res.longitude,
        accuracy: res.accuracy || 10,
        mapsUrl: res.mapsUrl || `https://maps.google.com/?q=${res.latitude},${res.longitude}`,
        source: res.source || 'native_hardware',
        provider: res.provider || 'gps',
        timestamp: res.timestamp || new Date().toLocaleTimeString(),
      };
    }
  } catch (e) {
    console.warn('fetchNativeHardwareLocation error:', e);
  }
  return null;
}

export interface DeviceBrandInfo {
  manufacturer: string;
  brand: string;
  model: string;
  sdkInt: number;
  isCondor: boolean;
  isSamsung: boolean;
  isXiaomi: boolean;
  isRealmeOrOppo: boolean;
  isTranssion: boolean;
  isHuawei: boolean;
}

/**
 * Detects current device manufacturer and OEM brand (Samsung, Condor, Xiaomi, Realme/Oppo, etc.)
 */
export async function getDeviceBrandInfo(): Promise<DeviceBrandInfo> {
  if (!Capacitor.isNativePlatform()) {
    return {
      manufacturer: 'Generic Browser',
      brand: 'Web',
      model: 'Desktop/Web Preview',
      sdkInt: 34,
      isCondor: false,
      isSamsung: false,
      isXiaomi: false,
      isRealmeOrOppo: false,
      isTranssion: false,
      isHuawei: false,
    };
  }

  try {
    const res = await EmergencySmsPlugin.getDeviceBrandInfo();
    return {
      manufacturer: res.manufacturer || 'Android',
      brand: res.brand || 'Device',
      model: res.model || 'Phone',
      sdkInt: res.sdkInt || 33,
      isCondor: Boolean(res.isCondor),
      isSamsung: Boolean(res.isSamsung),
      isXiaomi: Boolean(res.isXiaomi),
      isRealmeOrOppo: Boolean(res.isRealmeOrOppo),
      isTranssion: Boolean(res.isTranssion),
      isHuawei: Boolean(res.isHuawei),
    };
  } catch (e) {
    console.warn('getDeviceBrandInfo error:', e);
    return {
      manufacturer: 'Android',
      brand: 'Device',
      model: 'Phone',
      sdkInt: 33,
      isCondor: false,
      isSamsung: false,
      isXiaomi: false,
      isRealmeOrOppo: false,
      isTranssion: false,
      isHuawei: false,
    };
  }
}

/**
 * Opens manufacturer-specific background manager or autostart screen
 * Supports: Condor DuraSpeed, Samsung Device Care, Xiaomi Autostart, Realme/OPPO Startup Manager
 */
export async function openManufacturerAutostartSettings(): Promise<{ success: boolean; target?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: true, target: 'web_mock' };
  }
  try {
    const res = await EmergencySmsPlugin.openManufacturerAutostartSettings();
    return { success: Boolean(res?.success), target: res?.target };
  } catch (e) {
    console.warn('openManufacturerAutostartSettings error:', e);
    return { success: false };
  }
}

/**
 * Configure Anti-Shutdown / Power-Off PIN protection on Android
 */
export async function setAntiShutdownProtection(enabled: boolean, pin?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem('anti_shutdown_enabled', enabled ? 'true' : 'false');
    if (pin) localStorage.setItem('anti_shutdown_pin', pin);
    return true;
  }
  try {
    const res = await EmergencySmsPlugin.setAntiShutdownProtection({ enabled, pin });
    return Boolean(res?.success);
  } catch (e) {
    console.warn('setAntiShutdownProtection error:', e);
    return false;
  }
}

/**
 * Get Anti-Shutdown status and check if temporary power off bypass is active
 */
export async function getAntiShutdownStatus(): Promise<{ enabled: boolean; isBypassed: boolean; bypassRemainingSeconds: number }> {
  if (!Capacitor.isNativePlatform()) {
    const enabled = localStorage.getItem('anti_shutdown_enabled') !== 'false';
    return { enabled, isBypassed: false, bypassRemainingSeconds: 0 };
  }
  try {
    const res = await EmergencySmsPlugin.getAntiShutdownStatus();
    return {
      enabled: Boolean(res?.enabled),
      isBypassed: Boolean(res?.isBypassed),
      bypassRemainingSeconds: Number(res?.bypassRemainingSeconds) || 0,
    };
  } catch (e) {
    console.warn('getAntiShutdownStatus error:', e);
    return { enabled: true, isBypassed: false, bypassRemainingSeconds: 0 };
  }
}

/**
 * Grant legitimate power off bypass for N seconds (default 60s) and open the native power dialog
 */
export async function grantPowerOffBypass(seconds: number = 60): Promise<{ success: boolean; openedNativeDialog?: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: true, openedNativeDialog: false };
  }
  try {
    const res = await EmergencySmsPlugin.grantPowerOffBypass({ seconds });
    return {
      success: Boolean(res?.success),
      openedNativeDialog: Boolean(res?.openedNativeDialog),
    };
  } catch (e) {
    console.warn('grantPowerOffBypass error:', e);
    return { success: false };
  }
}

/**
 * Simulate or trigger the Power-Off Lock Challenge
 */
export async function triggerPowerOffChallenge(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    window.dispatchEvent(new CustomEvent('powerOffAttemptIntercepted'));
    return true;
  }
  try {
    const res = await EmergencySmsPlugin.triggerPowerOffChallenge();
    return Boolean(res?.success);
  } catch (e) {
    console.warn('triggerPowerOffChallenge error:', e);
    window.dispatchEvent(new CustomEvent('powerOffAttemptIntercepted'));
    return false;
  }
}

/**
 * Listen for native Power-Off intercept events
 */
export function addPowerOffAttemptListener(callback: () => void): () => void {
  if (Capacitor.isNativePlatform()) {
    let handle: any = null;
    EmergencySmsPlugin.addListener('powerOffAttemptIntercepted', () => {
      callback();
    }).then((h: any) => {
      handle = h;
    }).catch((err: any) => {
      console.warn('Error adding powerOffAttemptIntercepted listener:', err);
    });

    return () => {
      if (handle && typeof handle.remove === 'function') {
        handle.remove();
      }
    };
  } else {
    const handler = () => callback();
    window.addEventListener('powerOffAttemptIntercepted', handler);
    return () => {
      window.removeEventListener('powerOffAttemptIntercepted', handler);
    };
  }
}

/**
 * Checks if DroidGuard is currently exempted from Android Battery Optimization (Doze mode)
 */
export async function checkBatteryOptimizationStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  try {
    const res = await EmergencySmsPlugin.isBatteryOptimizationIgnored();
    return Boolean(res?.isIgnored);
  } catch (err) {
    console.warn('checkBatteryOptimizationStatus error:', err);
    return false;
  }
}

/**
 * Directly requests exemption from Android Battery Optimization:
 * android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
 */
export async function requestIgnoreBatteryOptimization(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  try {
    const res = await EmergencySmsPlugin.requestIgnoreBatteryOptimization();
    return Boolean(res?.success);
  } catch (err) {
    console.warn('requestIgnoreBatteryOptimization error:', err);
    return false;
  }
}

/**
 * Starts the persistent Foreground Service with unkillable notification:
 * "DroidGuard: الحماية نشطة في الخلفية"
 */
export async function startPersistentForegroundService(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  try {
    const res = await EmergencySmsPlugin.startPersistentForegroundProtection();
    return Boolean(res?.success);
  } catch (err) {
    console.warn('startPersistentForegroundService error:', err);
    return false;
  }
}

/**
 * Checks if the persistent Foreground Service is currently running
 */
export async function checkPersistentForegroundServiceActive(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  try {
    const res = await EmergencySmsPlugin.isPersistentForegroundProtectionActive();
    return Boolean(res?.isActive);
  } catch (err) {
    console.warn('checkPersistentForegroundServiceActive error:', err);
    return false;
  }
}

/**
 * Reads the last inspected system window from SharedPreferences
 */
export async function fetchLastInspectedWindow(): Promise<{
  packageName: string;
  className: string;
  buttons: string;
  timestamp: number;
}> {
  if (!Capacitor.isNativePlatform()) {
    try {
      const raw = localStorage.getItem('last_inspected_window');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { packageName: '', className: '', buttons: '', timestamp: 0 };
  }
  try {
    const res = await EmergencySmsPlugin.getLastInspectedWindow();
    return {
      packageName: res?.packageName || '',
      className: res?.className || '',
      buttons: res?.buttons || '',
      timestamp: res?.timestamp || 0,
    };
  } catch (err) {
    console.warn('fetchLastInspectedWindow error:', err);
    return { packageName: '', className: '', buttons: '', timestamp: 0 };
  }
}

/**
 * Clears the stored last inspected window in SharedPreferences
 */
export async function clearStoredInspectedWindow(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.removeItem('last_inspected_window');
    return true;
  }
  try {
    const res = await EmergencySmsPlugin.clearLastInspectedWindow();
    return Boolean(res?.success);
  } catch (err) {
    console.warn('clearStoredInspectedWindow error:', err);
    return false;
  }
}

/**
 * Listens for live window inspection events from AutoConfirmService
 */
export function addWindowInspectedListener(
  callback: (data: { packageName: string; className: string; buttons: string; timestamp: number }) => void
) {
  if (!Capacitor.isNativePlatform()) {
    return { remove: () => {} };
  }
  try {
    return EmergencySmsPlugin.addListener('windowInspected', (data) => {
      callback({
        packageName: data?.packageName || '',
        className: data?.className || '',
        buttons: data?.buttons || '',
        timestamp: data?.timestamp || Date.now(),
      });
    });
  } catch (err) {
    console.warn('addWindowInspectedListener error:', err);
    return { remove: () => {} };
  }
}






