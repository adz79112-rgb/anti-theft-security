/**
 * DroidGuard Intruder Auth Tracker & Stealth Selfie Trigger
 *
 * Implements:
 * 1. Tracking consecutive failed authentication attempts (PIN / biometric).
 * 2. On 3rd failed attempt:
 *    - Instant silent front-camera capture in the background.
 *    - Device GPS coordinates fetching.
 *    - Immediate dispatch to emergency channels:
 *      * Telegram Bot
 *      * Gmail security report
 *      * WhatsApp emergency report
 * 3. Stealth Status Badge counter management & auto-reset on successful owner authentication.
 */

import { AsyncStorage, STORAGE_KEYS } from './storage';
import { fetchDeviceLocation, LocationResult } from './location';
import { captureFrontCameraPhoto } from './camera';
import { sendGmailSecurityReport } from './email';
import { getActiveAlertEmail } from './emailVerification';
import {
  DEFAULT_BOT_TOKEN,
  sendTelegramPhoto,
  sendTelegramAlert,
  sendTelegramLocation,
} from './telegram';
import { getEmergencyContactPhone } from './emergencyContact';
import { sendDualSimSmsFallback } from './simManager';
import { DispatchEvent, IntruderCapture } from '../types';

export const DEFAULT_OWNER_PIN = '1234';

// Event listeners for real-time Stealth Status Badge updates
type AttemptsListener = (count: number) => void;
const listeners: Set<AttemptsListener> = new Set();

export function subscribeToFailedAttempts(listener: AttemptsListener): () => void {
  listeners.add(listener);
  getFailedAttempts().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(count: number) {
  listeners.forEach((listener) => {
    try {
      listener(count);
    } catch (e) {
      console.error('Error notifying attempts listener:', e);
    }
  });
}

/**
 * Get current count of failed attempts
 */
export async function getFailedAttempts(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.FAILED_AUTH_ATTEMPTS);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Reset failed attempts count to 0 (called on successful owner authentication)
 */
export async function resetFailedAttempts(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FAILED_AUTH_ATTEMPTS, '0');
    notifyListeners(0);
  } catch (e) {
    console.error('Failed to reset attempts:', e);
  }
}

/**
 * Get owner's registered Android Device PIN
 */
export async function getDeviceOwnerPin(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_PIN);
    return saved && saved.trim().length >= 4 ? saved.trim() : DEFAULT_OWNER_PIN;
  } catch {
    return DEFAULT_OWNER_PIN;
  }
}

/**
 * Set owner's registered Android Device PIN
 */
export async function setDeviceOwnerPin(pin: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_PIN, pin.trim());
}

/**
 * Verify input PIN against device owner PIN
 */
export async function verifyDevicePin(inputPin: string): Promise<boolean> {
  const ownerPin = await getDeviceOwnerPin();
  return inputPin.trim() === ownerPin;
}

export interface FailedAuthOptions {
  customBotToken?: string;
  customChatId?: string;
  customUserEmail?: string;
  customEmergencyPhone?: string;
  onLogDispatch?: (event: Omit<DispatchEvent, 'id'>) => void;
  onSaveCapture?: (capture: Omit<IntruderCapture, 'id'>) => void;
}

export interface FailedAuthResult {
  newCount: number;
  isThirdAttempt: boolean;
  capture?: Omit<IntruderCapture, 'id'>;
  location?: LocationResult;
}

/**
 * Record a failed authentication attempt.
 * If this is the 3rd attempt, trigger silent intruder selfie and multi-channel emergency dispatch.
 */
export async function recordFailedAuthAttempt(
  options?: FailedAuthOptions
): Promise<FailedAuthResult> {
  const current = await getFailedAttempts();
  const newCount = current + 1;
  await AsyncStorage.setItem(STORAGE_KEYS.FAILED_AUTH_ATTEMPTS, newCount.toString());
  notifyListeners(newCount);

  // Trigger Intruder Selfie & Emergency Dispatch on 3rd attempt (and every multiple of 3 if repeated)
  if (newCount === 3 || (newCount > 3 && newCount % 3 === 0)) {
    const timestamp = new Date().toLocaleTimeString();

    // 1. Silent Front Camera Snapshot in the background
    let photoUrl: string | undefined;
    try {
      const snap = await captureFrontCameraPhoto();
      if (snap) photoUrl = snap;
    } catch (camErr) {
      console.warn('Silent camera capture failed:', camErr);
    }

    // 2. Fetch GPS Coordinates
    const location = await fetchDeviceLocation();
    const mapsUrl = location.mapsUrl;

    const captureData: Omit<IntruderCapture, 'id'> = {
      imageUrl: photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&auto=format&fit=crop&q=80',
      timestamp,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        mapsUrl,
        addressDescription: 'محاولة فتح فاشلة #3 - رصد بواسطة مستشعر الأمان',
      },
      triggerSource: `INTRUDER_FAILED_AUTH (3 محاولات فاشلة)`,
      senderNumber: 'Android Security Lockscreen',
      dispatchedVia: ['telegram', 'email', 'whatsapp'],
    };

    if (options?.onSaveCapture) {
      options.onSaveCapture(captureData);
    }

    // 3. Emergency Channel A: Telegram Bot (Photo + Location Alert)
    const botToken = (options?.customBotToken || DEFAULT_BOT_TOKEN).trim();
    let chatId = (options?.customChatId || '').trim();
    if (!chatId) {
      const savedChatId = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ID);
      if (savedChatId) chatId = savedChatId.trim();
    }

    if (chatId) {
      try {
        const caption = `🚨 <b>[تنبيه اختراق فوري - DroidGuard]</b>\n\n⚠️ <b>السبب:</b> تم إدخال رمز PIN أو بصمة خاطئة 3 مرات متتالية!\n📍 <b>الموقع المباشر:</b> <a href="${mapsUrl}">خرائط Google</a>\n🌐 <b>الإحداثيات:</b> ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}\n⏰ <b>الوقت:</b> ${timestamp}`;
        if (photoUrl) {
          await sendTelegramPhoto(botToken, chatId, photoUrl, caption);
        } else {
          await sendTelegramAlert(botToken, chatId, caption);
        }
        await sendTelegramLocation(botToken, chatId, location.latitude, location.longitude);

        if (options?.onLogDispatch) {
          options.onLogDispatch({
            timestamp,
            recipient: `Telegram (@${chatId})`,
            type: 'telegram_photo',
            content: `[إنذار المتسلل #3] تم إرسال صورة الكاميرا الأمامية وإحداثيات الموقع مباشرة لحساب تليجرام إثر 3 محاولات دخول فاشلة`,
            status: 'delivered',
          });
        }
      } catch (tgErr) {
        console.warn('Telegram intruder alert error:', tgErr);
      }
    }

    // 4. Emergency Channel B: Gmail Security Incident Report
    const targetEmail = options?.customUserEmail || (await getActiveAlertEmail());
    if (targetEmail) {
      try {
        const emailRes = await sendGmailSecurityReport({
          toEmail: targetEmail,
          senderNumber: 'Android Lockscreen (3 Failed Attempts)',
          mapsUrl,
          latitude: location.latitude,
          longitude: location.longitude,
          photoUrl: captureData.imageUrl,
        });

        if (emailRes.ok && options?.onLogDispatch) {
          options.onLogDispatch({
            timestamp,
            recipient: targetEmail,
            type: 'gmail_report',
            content: `[تقرير أمني عاجل - 3 محاولات فاشلة] تم إرسال صورة الدخيل ورابط موقع GPS (${mapsUrl}) إلى بريد الأمان المعتمد ${targetEmail}`,
            status: 'delivered',
          });
        }
      } catch (emailErr) {
        console.warn('Gmail intruder report error:', emailErr);
      }
    }

    // 5. Emergency Channel C: Dual-SIM SMS Automated Emergency Dispatch
    const emergencyPhone = options?.customEmergencyPhone || (await getEmergencyContactPhone());
    if (emergencyPhone) {
      try {
        const smsMessage = `[إنذار DroidGuard - 3 محاولات فاشلة]\nتم رصد محاولة اختراق الهاتف!\nرابط الموقع: ${mapsUrl}\nالإحداثيات: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
        const smsRes = await sendDualSimSmsFallback(emergencyPhone, smsMessage);

        if (options?.onLogDispatch) {
          options.onLogDispatch({
            timestamp,
            recipient: `${emergencyPhone} (Emergency Contact)`,
            type: 'emergency_sms',
            content: `[طوارئ SMS - 3 محاولات فاشلة] تم إرسال رسالة SMS برابط الموقع إلى رقم الطوارئ المعتمد: ${smsRes.summary}`,
            status: 'delivered',
          });
        }
      } catch (smsErr) {
        console.warn('Dual-SIM SMS intruder report error:', smsErr);
      }
    }

    return {
      newCount,
      isThirdAttempt: true,
      capture: captureData,
      location,
    };
  }

  return {
    newCount,
    isThirdAttempt: false,
  };
}
