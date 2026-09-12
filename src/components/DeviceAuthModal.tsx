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
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl shadow-emerald-900/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100">{title}</h3>
          </div>
          {allowCancel && !authSuccess && (
            <button
              id="cancel-auth-btn"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-200 transition bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg"
            >
              <span className="sr-only">Close</span>
              &times;
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
            authSuccess 
              ? 'bg-emerald-500/20 text-emerald-400 scale-110' 
              : isAuthenticating
              ? 'bg-blue-500/20 text-blue-400 animate-pulse'
              : 'bg-slate-800 text-slate-300'
          }`}>
            {authSuccess ? (
              <CheckCircle2 className="w-10 h-10" />
            ) : isAuthenticating ? (
              <Lock className="w-10 h-10" />
            ) : (
              <ShieldAlert className="w-10 h-10" />
            )}
          </div>
          
          <h4 className="text-lg font-bold text-slate-100 mb-1">
            {authSuccess 
              ? translateInline(lang, 'Identity Verified', 'تم التحقق من الهوية')
              : isAuthenticating
              ? translateInline(lang, 'Awaiting OS Authentication...', 'بانتظار مصادقة النظام...')
              : subtitle}
          </h4>
          
          <p className="text-sm text-slate-400 mb-6">
            {reason || translateInline(lang, 'Please complete the native security prompt to access this area.', 'يرجى إكمال نافذة الأمان الخاصة بالنظام للوصول إلى هذه المنطقة.')}
          </p>

          {!isAuthenticating && !authSuccess && (
            <button
              onClick={triggerNativeAuth}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              {translateInline(lang, 'Unlock Device', 'إلغاء قفل الجهاز')}
            </button>
          )}

          {/* Emergency Intruder Selfie Alert Banner */}
          {intruderAlertMsg && (
            <div className="mt-6 p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl text-rose-200 text-xs text-center space-y-1.5 shadow-lg shadow-rose-950/50 animate-pulse w-full">
              <div className="flex items-center justify-center gap-1.5 text-rose-300 font-bold">
                <Camera className="w-4 h-4 text-rose-400" />
                <span>{translateInline(lang, 'Intruder photo captured silently', 'تم التقاط صورة المتسلل صامتاً')}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200">{intruderAlertMsg}</p>
              <div className="flex justify-center gap-2 pt-1 text-[10px] text-rose-300">
                <span className="bg-rose-900/60 px-2 py-0.5 rounded-full border border-rose-500/30">Telegram ✓</span>
                <span className="bg-rose-900/60 px-2 py-0.5 rounded-full border border-rose-500/30">Gmail ✓</span>
                <span className="bg-rose-900/60 px-2 py-0.5 rounded-full border border-rose-500/30">Dual-SMS ✓</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs text-center w-full flex flex-col items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
