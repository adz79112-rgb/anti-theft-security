/**
 * DroidGuard Native Emergency SMS Bridge
 * Interacts directly with Android SmsManager via EmergencySmsPlugin.
 * Sends SMS messages silently in the background without launching default messaging apps.
 * Strictly verifies delivery via Android native SmsManager callbacks.
 */

import { registerPlugin, Capacitor } from '@capacitor/core';

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
  allGranted?: boolean;
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
 * BOTH android.permission.SEND_SMS and android.permission.READ_PHONE_STATE at the exact same time!
 */
export async function requestStartupSecurityPermissions(): Promise<SmsPermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: false, smsGranted: false, phoneGranted: false, allGranted: false };
  }

  try {
    // Request both SEND_SMS and READ_PHONE_STATE in the exact same native permission request array
    const res = await EmergencySmsPlugin.requestStartupPermissions();
    const smsGranted = Boolean(res?.smsGranted ?? res?.granted);
    const phoneGranted = Boolean(res?.phoneGranted);

    return {
      granted: smsGranted,
      smsGranted,
      phoneGranted,
      allGranted: Boolean(res?.allGranted ?? (smsGranted && phoneGranted)),
    };
  } catch (err) {
    console.warn('Failed unified startup permissions request, falling back:', err);
    try {
      const res = await EmergencySmsPlugin.requestSmsPermission();
      return {
        granted: Boolean(res?.granted || res?.smsGranted),
        smsGranted: Boolean(res?.smsGranted),
        phoneGranted: Boolean(res?.phoneGranted),
        allGranted: Boolean(res?.allGranted),
      };
    } catch (fallbackErr) {
      console.warn('Fallback SMS permission error:', fallbackErr);
      return { granted: false, smsGranted: false };
    }
  }
}

/**
 * Sends an emergency SMS directly and silently in the background via Android SmsManager.
 * Does NOT open the device's default SMS app.
 * Only returns success if confirmed by native SmsManager.
 */
export async function sendSilentBackgroundSms(
  phoneNumber: string,
  message: string,
  slot?: 1 | 2
): Promise<SmsSendResult> {
  const cleanPhone = (phoneNumber || '').trim();
  const cleanMessage = (message || '').trim();

  if (!cleanPhone) {
    return {
      success: false,
      confirmedBySmsManager: false,
      recipient: cleanPhone,
      error: 'Emergency recipient phone number is missing or empty.',
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
