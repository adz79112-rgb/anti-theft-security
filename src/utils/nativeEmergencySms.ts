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
  requestBackgroundActivityPermission(): Promise<{ success: boolean; message?: string; error?: string }>;
  openDeveloperSettings(): Promise<{ success: boolean; error?: string }>;
  openAppSettings(): Promise<{ success: boolean; error?: string }>;
  openPremiumSmsSettings(): Promise<{ success: boolean; message?: string; error?: string }>;
  checkDeviceAdminStatus(): Promise<{ isAdmin: boolean; error?: string }>;
  requestDeviceAdmin(): Promise<{ success: boolean; isAdmin?: boolean; alreadyActive?: boolean; message?: string; error?: string }>;
  openDeviceAdminSettings(): Promise<{ success: boolean; error?: string }>;
  isAccessibilityServiceEnabled(): Promise<{ isEnabled: boolean; error?: string }>;
  openAccessibilitySettings(): Promise<{ success: boolean; error?: string }>;
  lockDeviceNow(): Promise<{ success: boolean; error?: string }>;
  isDefaultSmsApp(): Promise<{ isDefault: boolean; error?: string }>;
  requestDefaultSmsApp(): Promise<{ success: boolean; isDefault?: boolean; message?: string; error?: string }>;
  getStoredSmsMessages(): Promise<{ messages: StoredSmsMessage[]; error?: string }>;
  deleteStoredSmsMessage(options: { id: string }): Promise<{ success: boolean; error?: string }>;
  clearStoredSmsMessages(): Promise<{ success: boolean; error?: string }>;
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

export async function requestSetDefaultSmsApp(): Promise<{ success: boolean; isDefault?: boolean; message?: string }> {
  if (!Capacitor.isNativePlatform()) return { success: false, message: 'Web platform does not support Default SMS app role' };
  try {
    const res = await EmergencySmsPlugin.requestDefaultSmsApp();
    return res;
  } catch (err: any) {
    console.warn('Failed to request default SMS app:', err);
    return { success: false, message: err?.message };
  }
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
