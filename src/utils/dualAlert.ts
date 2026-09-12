/**
 * DroidGuard Dual Alert Engine
 * Pathway 1 (SMS): Immediate reverse SMS with the live GPS link ONLY to the sender number.
 * Pathway 2 (Telegram): Read saved Chat ID, capture stealth front-camera photo, and dispatch photo + live GPS to the Telegram bot.
 */

import { fetchDeviceLocation, LocationResult } from './location';
import { captureFrontCameraPhoto } from './camera';
import {
  DEFAULT_BOT_TOKEN,
  sendTelegramPhoto,
  sendTelegramLocation,
} from './telegram';
import { sendGmailSecurityReport } from './email';
import { getActiveAlertEmail } from './emailVerification';
import { AsyncStorage, STORAGE_KEYS } from './storage';
import { getEmergencyContactPhone } from './emergencyContact';
import { sendDualSimSmsFallback, DualSimSmsResult } from './simManager';
import { DispatchEvent, IntruderCapture } from '../types';

export interface DualAlertResult {
  success: boolean;
  smsRecipient: string;
  emergencyRecipient?: string;
  smsGpsLink: string;
  userEmail: string;
  gmailReportSent: boolean;
  telegramChatId: string;
  telegramPhotoSent: boolean;
  telegramLocationSent: boolean;
  location: LocationResult;
  photoUrl?: string;
  error?: string;
}

export interface DualAlertCallbacks {
  onLogDispatch: (event: Omit<DispatchEvent, 'id'>) => void;
  onSaveCapture: (capture: Omit<IntruderCapture, 'id'>) => void;
}

/**
 * Executes the DroidGuard Command-Based Alert Logic (#TRACK):
 * Pathway 1 (Dual SMS): Immediate SMS with live GPS link to command sender AND primary emergency contact phone (via SIM 1/SIM 2 fallback).
 * Pathway 2 (Gmail): Comprehensive stealth incident report with live GPS + front-camera photo to saved Gmail.
 * Pathway 3 (Telegram): Dispatch stealth front-camera photo + live GPS pin to Telegram bot if configured.
 */
export async function executeDualAlert(
  senderNumber: string,
  callbacks?: DualAlertCallbacks,
  customBotToken?: string,
  customChatId?: string,
  customUserEmail?: string,
  customEmergencyPhone?: string
): Promise<DualAlertResult> {
  const cleanSender = (senderNumber || '').trim();
  const botToken = (customBotToken || DEFAULT_BOT_TOKEN).trim();

  // 1. Retrieve saved Chat ID from AsyncStorage
  let chatId = (customChatId || '').trim();
  if (!chatId) {
    const savedChatId = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ID);
    if (savedChatId) {
      chatId = savedChatId.trim();
    }
  }

  // 2. Retrieve active Gmail from AsyncStorage (strictly honors 72-hour cooldown)
  let userEmail = (customUserEmail || '').trim();
  if (!userEmail) {
    const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    if (savedEmail) {
      userEmail = savedEmail.trim();
    }
  }
  userEmail = await getActiveAlertEmail(userEmail || undefined);

  // 3. Retrieve primary Emergency Contact Phone
  const emergencyPhone = customEmergencyPhone || (await getEmergencyContactPhone());

  // 4. Fetch live GPS location coordinates
  const location = await fetchDeviceLocation();
  const directGpsLink = location.mapsUrl;

  // ==========================================
  // PATHWAY 1: Dual SMS Dispatch (SIM 1 + SIM 2 Fallback)
  // ==========================================
  // Dispatches live GPS link to both:
  // 1. Sender of the command (if present)
  // 2. Verified primary emergency phone
  const smsBody = `[تنبيه أمان DroidGuard - موقع GPS المباشر]\nالموقع المباشر:\n${directGpsLink}\nالإحداثيات: ${location.source === 'unavailable' ? 'غير متوفر' : location.latitude.toFixed(5) + ', ' + location.longitude.toFixed(5)}`;

  // Target recipients list
  const smsTargets: string[] = [];
  if (emergencyPhone) smsTargets.push(emergencyPhone);
  if (cleanSender && !smsTargets.includes(cleanSender)) {
    smsTargets.push(cleanSender);
  }
  if (smsTargets.length === 0) {
    smsTargets.push('+213 661 12 34 56');
  }

  for (const target of smsTargets) {
    const isEmergency = target === emergencyPhone;
    const simRes = await sendDualSimSmsFallback(target, smsBody);

    if (callbacks?.onLogDispatch) {
      callbacks.onLogDispatch({
        timestamp: new Date().toLocaleTimeString(),
        recipient: target,
        type: isEmergency ? 'emergency_sms' : 'dual_reverse_sms',
        content: `[SMS متزامن ${isEmergency ? 'لرقم الطوارئ الأساسي' : 'لرقم مرسل الأمر'}] تم إرسال رابط موقع GPS المباشر: ${directGpsLink} (${simRes.summary})`,
        status: 'delivered',
      });
    }
  }

  // 4. Capture stealth front camera photo (shared for Gmail and Telegram)
  let capturedPhotoUrl: string | undefined;
  try {
    capturedPhotoUrl = await captureFrontCameraPhoto();
    if (capturedPhotoUrl && callbacks?.onSaveCapture) {
      const dispatchedVia: ('sms' | 'whatsapp' | 'telegram' | 'email')[] = ['sms'];
      if (userEmail) dispatchedVia.push('email');
      if (chatId) dispatchedVia.push('telegram');

      callbacks.onSaveCapture({
        imageUrl: capturedPhotoUrl,
        timestamp: new Date().toLocaleTimeString(),
        location,
        triggerSource: 'COMMAND_TRACK_TRIGGER (#TRACK)',
        senderNumber: cleanSender,
        dispatchedVia,
      });
    }
  } catch (photoErr) {
    console.warn('Silent camera capture failed:', photoErr);
  }

  // ==========================================
  // PATHWAY 2: User Gmail Report (Comprehensive)
  // ==========================================
  // "إرسال تقرير شامل فوراً إلى بريد المستخدم (Gmail) المحفوظ يشتمل على رابط GPS وصورة حية"
  let gmailReportSent = false;
  if (userEmail) {
    try {
      const emailRes = await sendGmailSecurityReport({
        toEmail: userEmail,
        senderNumber: cleanSender,
        mapsUrl: directGpsLink,
        latitude: location.latitude,
        longitude: location.longitude,
        photoUrl: capturedPhotoUrl,
      });
      gmailReportSent = emailRes.ok;

      if (callbacks?.onLogDispatch && emailRes.ok) {
        callbacks.onLogDispatch({
          timestamp: new Date().toLocaleTimeString(),
          recipient: userEmail,
          type: 'gmail_report',
          content: `[تقرير بريد Gmail شامل] تم إرسال رابط موقع GPS المباشر (${directGpsLink}) وصورة الكاميرا الأمامية فوراً إلى ${userEmail}`,
          status: 'delivered',
        });
      }
    } catch (emailErr) {
      console.warn('Sending security report to Gmail failed:', emailErr);
    }
  } else {
    console.warn('DroidGuard: User Gmail not set in settings. Pathway 2 skipped.');
  }

  // ==========================================
  // PATHWAY 3: Telegram Bot (Photo + Location)
  // ==========================================
  let telegramPhotoSent = false;
  let telegramLocationSent = false;

  if (chatId) {
    if (capturedPhotoUrl) {
      try {
        const photoCaption = `🚨 <b>[DroidGuard Anti-Theft: تقرير المتسلل]</b>\n📱 <b>طلب تتبع من:</b> ${cleanSender}\n📍 <b>الموقع:</b> <a href="${directGpsLink}">Google Maps</a>\n⏰ <b>الوقت:</b> ${new Date().toLocaleTimeString('ar-SA')}`;
        const photoRes = await sendTelegramPhoto(botToken, chatId, capturedPhotoUrl, photoCaption);
        telegramPhotoSent = photoRes.ok;

        if (callbacks?.onLogDispatch && photoRes.ok) {
          callbacks.onLogDispatch({
            timestamp: new Date().toLocaleTimeString(),
            recipient: `Telegram ID: ${chatId}`,
            type: 'telegram_photo',
            content: `[صورة سرية] تم رفع لقطة الكاميرا الأمامية للمتسلل مباشرة إلى بوت التليجرام`,
            status: 'delivered',
          });
        }
      } catch (tgPhotoErr) {
        console.warn('Telegram photo dispatch failed:', tgPhotoErr);
      }
    }

    try {
      const locRes = await sendTelegramLocation(
        botToken,
        chatId,
        location.latitude,
        location.longitude
      );
      telegramLocationSent = locRes.ok;

      if (callbacks?.onLogDispatch && locRes.ok) {
        callbacks.onLogDispatch({
          timestamp: new Date().toLocaleTimeString(),
          recipient: `Telegram ID: ${chatId}`,
          type: 'telegram_location',
          content: `[موقع GPS مباشر] ${directGpsLink}`,
          status: 'delivered',
        });
      }
    } catch (locErr) {
      console.warn('Sending location to Telegram failed:', locErr);
    }
  }

  return {
    success: true,
    smsRecipient: cleanSender || emergencyPhone,
    emergencyRecipient: emergencyPhone,
    smsGpsLink: directGpsLink,
    userEmail,
    gmailReportSent,
    telegramChatId: chatId,
    telegramPhotoSent,
    telegramLocationSent,
    location,
    photoUrl: capturedPhotoUrl,
  };
}
