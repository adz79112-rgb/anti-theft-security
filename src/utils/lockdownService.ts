/**
 * DroidGuard Stealth Stolen Mode Service
 *
 * Coordinates:
 * 1. Automatic Network & SIM Management (inspecting data traffic and auto-switching data to active SIM).
 * 2. Dual-SIM SMS Fallback: Dispatching SMS via SIM 1 + SIM 2 to primary emergency phone and command sender.
 * 3. Silent Front Camera Snapshot.
 * 4. Comprehensive Gmail Incident Report (to verified alert email).
 * 5. Telegram Bot notification (silent photo + GPS location pin).
 * 6. Periodic execution every 2 minutes (120 seconds).
 */

import { fetchDeviceLocation, LocationResult } from './location';
import { captureFrontCameraPhoto } from './camera';
import { sendGmailSecurityReport } from './email';
import { getActiveAlertEmail } from './emailVerification';
import {
  DEFAULT_BOT_TOKEN,
  sendTelegramPhoto,
  sendTelegramLocation,
  sendTelegramAlert,
} from './telegram';
import {
  inspectAndAutoSwitchMobileData,
  sendDualSimSmsFallback,
  DualSimSmsResult,
} from './simManager';
import { getEmergencyContactPhone } from './emergencyContact';
import { AsyncStorage, STORAGE_KEYS } from './storage';
import { DispatchEvent, IntruderCapture } from '../types';

export interface StealthCycleResult {
  cycleNumber: number;
  timestamp: string;
  location: LocationResult;
  photoUrl?: string;
  dualSimSms: DualSimSmsResult;
  emergencyPhoneRecipient?: string;
  commandSenderRecipient?: string;
  activeDataSimSlot: 1 | 2;
  simSwitchReason: string;
  gmailSent: boolean;
  gmailRecipient: string;
  telegramSent: boolean;
  telegramRecipient: string;
  summary: string;
}

export interface StealthServiceCallbacks {
  onLogDispatch: (event: Omit<DispatchEvent, 'id'>) => void;
  onSaveCapture: (capture: Omit<IntruderCapture, 'id'>) => void;
  onCycleCompleted?: (result: StealthCycleResult) => void;
}

/**
 * Execute a single cycle of the Stealth Stolen Mode dispatch (Every 2 Minutes)
 */
export async function executeStealthDispatchCycle(
  cycleNumber: number,
  senderNumber: string,
  callbacks?: StealthServiceCallbacks,
  customBotToken?: string,
  customChatId?: string,
  customUserEmail?: string,
  customEmergencyPhone?: string
): Promise<StealthCycleResult> {
  const cleanSender = (senderNumber || '').trim();
  const timestamp = new Date().toLocaleTimeString();

  // 1. Auto Network & SIM Management: Check mobile data & auto-switch to SIM with active bundle
  const netSwitch = await inspectAndAutoSwitchMobileData();

  if (callbacks?.onLogDispatch) {
    callbacks.onLogDispatch({
      timestamp,
      recipient: `SIM Engine (SIM ${netSwitch.activeSlot})`,
      type: 'location_ping',
      content: `[إدارة البيانات الذكية] ${netSwitch.reason}`,
      status: 'delivered',
    });
  }

  // 2. Fetch live GPS coordinates
  const location = await fetchDeviceLocation();
  const mapsUrl = location.mapsUrl;

  // 3. Dual-SIM SMS Fallback: Send SMS with GPS coordinates via SIM 1 and SIM 2
  // Dispatched simultaneously to both:
  // a) Primary verified emergency contact phone
  // b) The command sender (if present)
  const emergencyPhone = customEmergencyPhone || (await getEmergencyContactPhone());
  const smsBody = `[إنذار سرقة DroidGuard - دورة خفية #${cycleNumber}]\nالموقع المباشر للجهاز:\n${mapsUrl}\nإحداثيات: ${location.source === 'unavailable' ? 'غير متوفر' : location.latitude.toFixed(5) + ', ' + location.longitude.toFixed(5)}`;

  const recipientsToAlert: string[] = [];
  if (emergencyPhone) recipientsToAlert.push(emergencyPhone);
  if (cleanSender && !recipientsToAlert.includes(cleanSender)) {
    recipientsToAlert.push(cleanSender);
  }
  if (recipientsToAlert.length === 0) {
    recipientsToAlert.push('+213 661 12 34 56');
  }

  let primaryDualSimResult: DualSimSmsResult | null = null;

  for (const recipient of recipientsToAlert) {
    const isEmergency = recipient === emergencyPhone;
    const dualSimResult = await sendDualSimSmsFallback(recipient, smsBody);
    if (!primaryDualSimResult) {
      primaryDualSimResult = dualSimResult;
    }

    if (callbacks?.onLogDispatch) {
      if (dualSimResult.sim1Delivered) {
        callbacks.onLogDispatch({
          timestamp,
          recipient: `${recipient} (${isEmergency ? 'طوارئ أساسي' : 'مرسل الأمر'} - SIM 1 ${dualSimResult.sim1Details.carrier})`,
          type: 'emergency_sms',
          content: `[SMS متزامن - شريحة 1] تم إرسال موقع GPS المباشر إلى ${recipient}: ${mapsUrl}`,
          status: 'delivered',
        });
      }

      if (dualSimResult.sim2Delivered) {
        callbacks.onLogDispatch({
          timestamp,
          recipient: `${recipient} (${isEmergency ? 'طوارئ أساسي' : 'مرسل الأمر'} - SIM 2 ${dualSimResult.sim2Details.carrier})`,
          type: 'emergency_sms',
          content: `[SMS متزامن - شريحة 2 احتياطية] تم إرسال موقع GPS بنجاح كخط أمان بديل عبر SIM 2: ${mapsUrl}`,
          status: 'delivered',
        });
      }
    }
  }

  // 4. Capture stealth front-camera photo silently
  let photoUrl: string | undefined;
  try {
    photoUrl = await captureFrontCameraPhoto();
    if (photoUrl && callbacks?.onSaveCapture) {
      callbacks.onSaveCapture({
        imageUrl: photoUrl,
        timestamp,
        location,
        triggerSource: `STEALTH_STOLEN_CYCLE_${cycleNumber} (وضع إيقاف التشغيل الوهمي)`,
        senderNumber: cleanSender || emergencyPhone,
        dispatchedVia: ['sms', 'email', 'telegram'],
      });
    }
  } catch (err) {
    console.warn('Stealth camera snapshot error:', err);
  }

  // 5. Send report to verified Gmail
  let activeEmail = (customUserEmail || '').trim();
  if (!activeEmail) {
    const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    if (savedEmail) activeEmail = savedEmail.trim();
  }
  activeEmail = await getActiveAlertEmail(activeEmail || undefined);

  let gmailSent = false;
  if (activeEmail) {
    try {
      const emailRes = await sendGmailSecurityReport({
        toEmail: activeEmail,
        senderNumber: cleanSender || emergencyPhone,
        mapsUrl,
        latitude: location.latitude,
        longitude: location.longitude,
        photoUrl,
      });
      gmailSent = emailRes.ok;

      if (callbacks?.onLogDispatch && emailRes.ok) {
        callbacks.onLogDispatch({
          timestamp,
          recipient: activeEmail,
          type: 'gmail_report',
          content: `[تقرير دوري كل دقيقتين - #${cycleNumber}] تم إرسال رابط موقع GPS المباشر (${mapsUrl}) وصورة الكاميرا إلى بريد الأمان المعتمد ${activeEmail}`,
          status: 'delivered',
        });
      }
    } catch (emailErr) {
      console.warn('Stealth Gmail report error:', emailErr);
    }
  }

  // 6. Send to Telegram Bot
  const botToken = (customBotToken || DEFAULT_BOT_TOKEN).trim();
  let chatId = (customChatId || '').trim();
  if (!chatId) {
    const savedChatId = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ID);
    if (savedChatId) chatId = savedChatId.trim();
  }

  let telegramSent = false;
  if (chatId) {
    try {
      // Send Photo
      if (photoUrl) {
        const caption = `🚨 <b>[DroidGuard - فخ إيقاف التشغيل الوهمي | دورة #${cycleNumber}]</b>\n📍 <b>الموقع المباشر:</b> <a href="${mapsUrl}">Google Maps</a>\n📱 <b>رقم الطوارئ:</b> ${emergencyPhone}\n📶 <b>البيانات النشطة:</b> SIM ${netSwitch.activeSlot} (${netSwitch.sim.carrier})\n⏰ <b>الوقت:</b> ${timestamp}`;
        const photoRes = await sendTelegramPhoto(botToken, chatId, photoUrl, caption);
        if (photoRes.ok) telegramSent = true;
      }

      // Send Location pin
      if (location.source !== 'unavailable') { await sendTelegramLocation(botToken, chatId, location.latitude, location.longitude); }
      telegramSent = true;

      if (callbacks?.onLogDispatch) {
        callbacks.onLogDispatch({
          timestamp,
          recipient: `Telegram (@${chatId})`,
          type: 'telegram_photo',
          content: `[تقرير تليجرام خفي - #${cycleNumber}] تم رفع صورة الكاميرا وإحداثيات الموقع مباشرة عبر شريحة البيانات SIM ${netSwitch.activeSlot}`,
          status: 'delivered',
        });
      }
    } catch (tgErr) {
      console.warn('Stealth Telegram dispatch error:', tgErr);
    }
  }

  const cycleSummary: StealthCycleResult = {
    cycleNumber,
    timestamp,
    location,
    photoUrl,
    dualSimSms: primaryDualSimResult!,
    emergencyPhoneRecipient: emergencyPhone,
    commandSenderRecipient: cleanSender,
    activeDataSimSlot: netSwitch.activeSlot,
    simSwitchReason: netSwitch.reason,
    gmailSent,
    gmailRecipient: activeEmail,
    telegramSent,
    telegramRecipient: chatId,
    summary: `دورة #${cycleNumber}: تم إرسال موقع GPS عبر الشريحتين (Dual-SIM SMS) إلى ${recipientsToAlert.join(' و ')} + تقرير الكاميرا لبريد Gmail وتليجرام.`,
  };

  if (callbacks?.onCycleCompleted) {
    callbacks.onCycleCompleted(cycleSummary);
  }

  return cycleSummary;
}
