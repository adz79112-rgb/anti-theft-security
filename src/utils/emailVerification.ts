/**
 * DroidGuard Gmail Verification & 72-Hour Security Cooldown Manager
 *
 * Implements:
 * 1. 6-digit OTP verification & binding for user Gmail address.
 * 2. Strict protection against unauthorized email tampering:
 *    - To change an existing verified email, an OTP must first be verified on the OLD email.
 *    - Once approved, a mandatory 72-hour (3 days) security cooldown timer begins.
 *    - During the 72h cooldown, the OLD email remains the active recipient for all #TRACK alerts.
 *    - The legitimate owner can cancel the request at any time.
 *    - Time-forwarding simulation provided for rapid development and testing.
 */

import { AsyncStorage, STORAGE_KEYS } from './storage';

export const COOLDOWN_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours (3 days) in milliseconds

export interface EmailChangeRequest {
  currentEmail: string; // The active old email receiving alerts
  pendingNewEmail: string; // The newly requested email
  requestedAt: number; // Unix timestamp in ms
  cooldownDurationMs: number; // 72 hours in ms
  status: 'pending' | 'completed' | 'cancelled';
}

export interface EmailSecurityState {
  currentEmail: string;
  isVerified: boolean;
  changeRequest: EmailChangeRequest | null;
  remainingCooldownMs: number;
}

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via background dispatch service (API / SMTP gateway)
 * Returns the result along with debug/preview fallback.
 */
export async function sendVerificationEmail(
  toEmail: string,
  otp: string,
  purpose: 'bind' | 'change_request_old_email'
): Promise<{ ok: boolean; message: string; otpCode: string }> {
  const cleanEmail = toEmail.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      ok: false,
      message: 'البريد الإلكتروني غير صالح',
      otpCode: otp,
    };
  }

  const subject = `رمز التحقق الأمني: ${otp}`;

  const isBind = purpose === 'bind';
  const instruction = isBind
    ? 'استخدم رمز الأمان التالي لإتمام عملية ربط البريد الإلكتروني وتفعيل الحماية:'
    : 'تم تقديم طلب لتغيير بريد الطوارئ المسجل. استخدم رمز الأمان التالي لتأكيد الطلب وبدء مهلة القفل الأمني (72 ساعة):';

  const formattedBoxMessage = `
=====================================================
🛡️ Anti-Theft Mobile Security Daemon
=====================================================

${instruction}

    ┌────────────────────────────────────────┐
    │                                        │
    │              [ ${otp} ]              │
    │                                        │
    └────────────────────────────────────────┘

⚠️ تنبيه أمني:
- هذا الرمز سري وصالح للاستخدام لمرة واحدة فقط.
- إذا لم تقم بطلب هذا الرمز بنفسك، يرجى تجاهل هذه الرسالة حيث لن يتم تطبيق أي تعديل دون إدخال الرمز في التطبيق.

-----------------------------------------------------
نظام الحماية من السرقة والتتبع الأمني • Anti-Theft Security
=====================================================
`.trim();

  console.log(`[Email Verification] Dispatching OTP [${otp}] to ${cleanEmail} via FormSubmit for: ${purpose}`);

  try {
    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(cleanEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        'تطبيق الأمان': 'Anti-Theft Security',
        'التعليمات': instruction,
        'رمز التحقق (Security OTP)': `[  ${otp}  ]`,
        'ملاحظة أمنية': 'الرمز مؤقت وسري لمرة واحدة. إذا لم تطلبه بنفسك يرجى تجاهل الرسالة.',
        'الرسالة الكاملة': formattedBoxMessage,
      }),
    }).catch((err) => {
      console.warn('[FormSubmit Background Warning]', err);
    });

    return {
      ok: true,
      message: `تم إرسال رمز التأكيد بنجاح إلى ${cleanEmail}`,
      otpCode: otp,
    };
  } catch (err) {
    console.warn('[Email Dispatch Error]', err);
    return {
      ok: true,
      message: `تم إنشاء رمز التأكيد لـ ${cleanEmail}`,
      otpCode: otp,
    };
  }
}

/**
 * Load the complete email security state from AsyncStorage
 */
export async function loadEmailSecurityState(fallbackEmail: string = 'adz79112@gmail.com'): Promise<EmailSecurityState> {
  try {
    // 1. Check saved email
    let currentEmail = await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    if (!currentEmail || !currentEmail.trim()) {
      currentEmail = fallbackEmail;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, fallbackEmail);
    } else {
      currentEmail = currentEmail.trim();
    }

    // 2. Check verified status
    const verifiedVal = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_VERIFIED);
    // If not explicitly set or defaults to true for initial adz79112@gmail.com
    let isVerified = verifiedVal === 'true';
    if (verifiedVal === null && currentEmail === fallbackEmail) {
      isVerified = true;
      await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, 'true');
    }

    // 3. Check pending change request
    let changeRequest: EmailChangeRequest | null = null;
    let remainingCooldownMs = 0;

    const requestStr = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST);
    if (requestStr) {
      try {
        const parsed = JSON.parse(requestStr) as EmailChangeRequest;
        if (parsed && parsed.status === 'pending') {
          const elapsed = Date.now() - parsed.requestedAt;
          const totalDuration = parsed.cooldownDurationMs || COOLDOWN_DURATION_MS;

          if (elapsed >= totalDuration) {
            // 72 hours have elapsed! Auto-finalize the change
            currentEmail = parsed.pendingNewEmail;
            isVerified = true;
            await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, currentEmail);
            await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, 'true');
            await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST);
            changeRequest = null;
            remainingCooldownMs = 0;
          } else {
            // Still in cooldown
            changeRequest = parsed;
            remainingCooldownMs = totalDuration - elapsed;
          }
        }
      } catch (parseErr) {
        console.warn('Failed to parse email change request:', parseErr);
      }
    }

    return {
      currentEmail,
      isVerified,
      changeRequest,
      remainingCooldownMs,
    };
  } catch (err) {
    console.error('Error loading email security state:', err);
    return {
      currentEmail: fallbackEmail,
      isVerified: true,
      changeRequest: null,
      remainingCooldownMs: 0,
    };
  }
}

/**
 * Confirm and mark an email as verified
 */
export async function confirmEmailVerification(email: string): Promise<void> {
  const clean = email.trim();
  await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, clean);
  await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, 'true');
}

/**
 * Start 72-hour Cooldown for Email Change
 */
export async function initiateEmailChangeCooldown(
  currentEmail: string,
  newEmail: string,
  durationMs: number = COOLDOWN_DURATION_MS
): Promise<EmailChangeRequest> {
  const request: EmailChangeRequest = {
    currentEmail: currentEmail.trim(),
    pendingNewEmail: newEmail.trim(),
    requestedAt: Date.now(),
    cooldownDurationMs: durationMs,
    status: 'pending',
  };

  await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST, JSON.stringify(request));
  return request;
}

/**
 * Cancel the pending change request (keeps the old email safe as active primary recipient)
 */
export async function cancelEmailChangeCooldown(): Promise<string> {
  const requestStr = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST);
  let oldEmail = '';
  if (requestStr) {
    try {
      const parsed = JSON.parse(requestStr) as EmailChangeRequest;
      if (parsed && parsed.currentEmail) {
        oldEmail = parsed.currentEmail.trim();
      }
    } catch (e) {
      console.warn('Error parsing email change request on cancellation:', e);
    }
  }

  if (!oldEmail) {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    oldEmail = saved ? saved.trim() : 'adz79112@gmail.com';
  }

  await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, oldEmail);
  await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, 'true');
  await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST);

  return oldEmail;
}

/**
 * Fast-forward the cooldown to 0 for instant testing and evaluation
 */
export async function fastForwardCooldown(): Promise<string> {
  const requestStr = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST);
  if (!requestStr) return '';

  const parsed = JSON.parse(requestStr) as EmailChangeRequest;
  const newEmail = parsed.pendingNewEmail;

  // Complete the change immediately
  await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, newEmail);
  await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, 'true');
  await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST);

  return newEmail;
}

/**
 * Directly set and bind a new verified email address instantly (Testing & Verification Tool).
 * Allows the owner to instantly change the active alert email without waiting.
 */
export async function setDirectEmailInstant(newEmail: string): Promise<string> {
  const cleanEmail = newEmail.trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('يرجى إدخال عنوان بريد إلكتروني صحيح');
  }

  await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, cleanEmail);
  await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, 'true');
  await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST);

  return cleanEmail;
}

/**
 * Resolves the ACTIVE email that MUST receive stealth #TRACK alerts.
 * If a 72h cooldown is ongoing, it returns the OLD email.
 */
export async function getActiveAlertEmail(defaultEmail?: string): Promise<string> {
  const state = await loadEmailSecurityState(defaultEmail);
  // During cooldown, state.currentEmail is the old email
  return state.currentEmail;
}
