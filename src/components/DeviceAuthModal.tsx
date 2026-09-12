import { translateInline } from '../utils/translateInline';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Camera, Lock } from 'lucide-react';
import { authenticateAsync } from '../utils/localAuthentication';
import {
  recordFailedAuthAttempt,
  resetFailedAttempts,
  getFailedAttempts,
} from '../utils/authFailCounter';
import { DispatchEvent, IntruderCapture, Language } from '../types';

interface DeviceAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  lang?: Language;
  reason?: string;
  allowCancel?: boolean;
  botToken?: string;
  chatId?: string;
  userEmail?: string;
  emergencyPhone?: string;
  onLogDispatch?: (event: Omit<DispatchEvent, 'id'>) => void;
  onSaveCapture?: (capture: Omit<IntruderCapture, 'id'>) => void;
}

export const DeviceAuthModal: React.FC<DeviceAuthModalProps> = ({
  lang = 'ar',
  isOpen,
  onSuccess,
  onCancel,
  title = translateInline(lang, 'Verify Device Owner Identity', 'تأكيد هوية مالك الجهاز'),
  subtitle = translateInline(lang, 'Native Android Security Verification', 'التحقق الأمني الأصلي لنظام أندرويد'),
  reason,
  allowCancel = false,
  botToken,
  chatId,
  userEmail,
  emergencyPhone,
  onLogDispatch,
  onSaveCapture,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [intruderAlertMsg, setIntruderAlertMsg] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setAuthSuccess(false);
      setErrorMsg(null);
      setIntruderAlertMsg(null);
      setIsAuthenticating(false);
      getFailedAttempts().then(setFailedCount);
      
      // Auto-trigger authentication when modal opens
      triggerNativeAuth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuccess = async () => {
    // Reset stealth counter to 0 upon authentic owner entry
    await resetFailedAttempts();
    setFailedCount(0);
    setAuthSuccess(true);
    setIsAuthenticating(false);
    setErrorMsg(null);
    setIntruderAlertMsg(null);
    setTimeout(() => {
      onSuccess();
    }, 600);
  };

  const handleFailedAttempt = async (reasonText: string) => {
    setIsAuthenticating(false);
    const res = await recordFailedAuthAttempt({
      customBotToken: botToken,
      customChatId: chatId,
      customUserEmail: userEmail,
      customEmergencyPhone: emergencyPhone,
      onLogDispatch,
      onSaveCapture,
    });

    setFailedCount(res.newCount);

    if (res.isThirdAttempt) {
      setIntruderAlertMsg(
        translateInline(lang, '🚨 [Intruder photo captured silently in background!] 3 failed attempts exhausted. Camera snapshot and location coordinates sent directly to Telegram, Gmail, and Dual-SMS emergency contacts.', '🚨 [تم التقاط صورة المتسلل صامتاً في الخلفية!] تم استنفاد 3 محاولات فاشلة. تم إرسال لقطة الكاميرا وإحداثيات الموقع مباشرة إلى تليجرام، بريد Gmail، ورسائل الطوارئ Dual-SMS.')
      );
      setErrorMsg(null);
    } else {
      setErrorMsg(
        `${reasonText} ${translateInline(lang, `(Failed attempt ${res.newCount} of 3). Intruder photo will be captured and emergency reports sent on the third attempt.`, `(محاولة فاشلة ${res.newCount} من 3). سيتم التقاط صورة المتسلل وإرسال تقارير الطوارئ عند المحاولة الثالثة.`)}`
      );
    }
  };

  const triggerNativeAuth = async () => {
    if (isAuthenticating || authSuccess) return;
    
    setIsAuthenticating(true);
    setErrorMsg(null);
    
    try {
      const authRes = await authenticateAsync({
        promptMessage: reason || translateInline(lang, 'Verify your identity to continue', 'أثبت هويتك للمتابعة'),
        cancelLabel: translateInline(lang, 'Cancel', 'إلغاء'),
        fallbackLabel: translateInline(lang, 'Use PIN/Pattern', 'استخدام رمز PIN أو النمط'),
        disableDeviceFallback: false,
      });

      if (authRes.success) {
        await handleSuccess();
      } else {
        // Native auth returned false (e.g. user cancelled, or failed too many times in OS UI)
        await handleFailedAttempt(
          authRes.error || translateInline(lang, 'Authentication failed or was cancelled.', 'فشلت المصادقة أو تم إلغاؤها.')
        );
      }
    } catch (err: any) {
      // Hardware error or not supported
      await handleFailedAttempt(
        translateInline(lang, 'Authentication error: ', 'خطأ في المصادقة: ') + (err?.message || 'Unknown error')
      );
      if (onCancel) onCancel();
    }
  };

  // Completely headless: NEVER render any in-app HTML modal or dialog box.
  // The official Android OS BiometricPrompt dialog handles 100% of the UI natively.
  return null;
};
