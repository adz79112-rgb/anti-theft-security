/**
 * Telegram Bot API Service for DroidGuard Anti-Theft Protection
 * Dispatches real-time alerts, emergency GPS links, and front-camera snapshots.
 */

export const DEFAULT_BOT_TOKEN = '8818517549:AAF7e5ziwfasqWtm8cXjFXS_wf1kZNh-ZhI';

export interface TelegramTestResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

/**
 * Automatically retrieves the most recent user Chat ID who sent /start or any message to the bot
 */
export async function fetchLatestTelegramChatId(botToken: string = DEFAULT_BOT_TOKEN): Promise<{
  found: boolean;
  chatId?: string;
  userName?: string;
  firstName?: string;
  message: string;
}> {
  try {
    const token = (botToken || DEFAULT_BOT_TOKEN).trim();
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=20`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
      // Find the last update that has a message from a private user chat
      for (let i = data.result.length - 1; i >= 0; i--) {
        const item = data.result[i];
        const msg = item.message || item.edited_message || item.callback_query?.message;
        const chat = msg?.chat || item.callback_query?.from;
        if (chat && chat.id) {
          const idStr = String(chat.id);
          const name = chat.first_name || chat.username || 'مستخدم تليجرام';
          return {
            found: true,
            chatId: idStr,
            userName: chat.username,
            firstName: chat.first_name,
            message: `تم العثور بنجاح على حساب (${name}) بالمعرف: ${idStr}`,
          };
        }
      }
    }
    return {
      found: false,
      message: 'لم يتم العثور على رسائل حديثة بعد. يرجى فتح البوت @droidguard_alarm_bot والضغط على Start أولاً ثم النقر مجدداً.',
    };
  } catch (err) {
    return {
      found: false,
      message: err instanceof Error ? err.message : 'تعذر الاتصال بسيرفر تليجرام.',
    };
  }
}

/**
 * تجربة إرسال نص بسيط للتحقق من الاتصال
 * Simple Telegram Connection verification requested by user
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<TelegramTestResult> {
  const token = (botToken || '').trim();
  const chat = (chatId || '').trim();

  if (!token) {
    return {
      ok: false,
      message: 'يرجى إدخال رمز البوت (Bot Token) أولاً من خلال @BotFather',
    };
  }

  if (!chat) {
    return {
      ok: false,
      message: 'يرجى إدخال معرف المحادثة (Chat ID) أولاً من خلال @userinfobot',
    };
  }

  try {
    const timestamp = new Date().toLocaleTimeString('ar-SA');
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: `🚨 تجربة اتصال DroidGuard: النظام يعمل بنجاح!\n\nالوقت: ${timestamp}\nحالة الحماية: نشطة ومستعدة ✅\nتم التحقق من ربط بوت مكافحة السرقة بنجاح.`,
      }),
    });

    const result = await response.json();
    console.log('نتيجة الإرسال:', result);

    if (response.ok && result.ok) {
      return {
        ok: true,
        message: 'تم إرسال رسالة الاختبار بنجاح! تفقد حسابك على تليجرام الآن.',
        data: result,
      };
    } else {
      const desc = result.description || 'فشل الاتصال مع تليجرام';
      return {
        ok: false,
        message: `خطأ من تليجرام: ${desc}`,
        data: result,
      };
    }
  } catch (error: unknown) {
    console.error('خطأ في الاتصال:', error);
    const msg = error instanceof Error ? error.message : 'تعذر الاتصال بخوادم تليجرام';
    return {
      ok: false,
      message: `خطأ في الاتصال: ${msg}`,
    };
  }
}

/**
 * Send an urgent incident alert message to Telegram
 */
export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; description?: string }> {
  const token = (botToken || '').trim();
  const chat = (chatId || '').trim();

  if (!token || !chat) {
    return { ok: false, description: 'بيانات اعتماد تليجرام غير مكتملة' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: 'HTML',
      }),
    });
    const result = await response.json();
    return { ok: Boolean(result.ok), description: result.description };
  } catch (error: unknown) {
    console.error('Failed to send Telegram alert:', error);
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'خطأ في الاتصال',
    };
  }
}

/**
 * Send front camera intruder snapshot directly to Telegram
 */
export async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  photoDataUrl: string,
  caption?: string
): Promise<{ ok: boolean; description?: string }> {
  const token = (botToken || '').trim();
  const chat = (chatId || '').trim();

  if (!token || !chat) {
    return { ok: false, description: 'بيانات اعتماد تليجرام غير مكتملة' };
  }

  try {
    // If it's a data URL, convert to Blob for multipart upload
    if (photoDataUrl.startsWith('data:')) {
      const blobRes = await fetch(photoDataUrl);
      const blob = await blobRes.blob();

      const formData = new FormData();
      formData.append('chat_id', chat);
      formData.append('photo', blob, 'intruder_snap.jpg');
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return { ok: Boolean(result.ok), description: result.description };
    } else {
      // Direct URL fallback
      const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          photo: photoDataUrl,
          caption,
        }),
      });
      const result = await response.json();
      return { ok: Boolean(result.ok), description: result.description };
    }
  } catch (error: unknown) {
    console.error('Failed to send Telegram photo:', error);
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'خطأ في رفع الصورة',
    };
  }
}

/**
 * Send real-time GPS location pin and Google Maps link to Telegram
 */
export async function sendTelegramLocation(
  botToken: string,
  chatId: string,
  latitude: number,
  longitude: number
): Promise<{ ok: boolean; description?: string }> {
  const token = (botToken || DEFAULT_BOT_TOKEN).trim();
  const chat = (chatId || '').trim();

  if (!token || !chat) {
    return { ok: false, description: 'بيانات اعتماد تليجرام غير مكتملة' };
  }

  try {
    // 1. Send native GPS map pin
    const response = await fetch(`https://api.telegram.org/bot${token}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        latitude,
        longitude,
      }),
    });
    const result = await response.json();

    // 2. Also send explicit Google Maps link message
    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: `📍 <b>موقع GPS المباشر للهاتف:</b>\n<a href="${mapsUrl}">${mapsUrl}</a>\n(إحداثيات: ${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
        parse_mode: 'HTML',
      }),
    });

    return { ok: Boolean(result.ok), description: result.description };
  } catch (error: unknown) {
    console.error('Failed to send Telegram location:', error);
    return {
      ok: false,
      description: error instanceof Error ? error.message : 'خطأ في إرسال الموقع لتليجرام',
    };
  }
}

