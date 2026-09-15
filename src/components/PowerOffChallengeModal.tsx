import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Power, CheckCircle2, Fingerprint } from 'lucide-react';
import { SecurityConfig, Language } from '../types';
import { translateInline } from '../utils/translateInline';
import { grantPowerOffBypass } from '../utils/nativeEmergencySms';
import { authenticateAsync } from '../utils/localAuthentication';

interface PowerOffChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SecurityConfig;
  lang: Language;
  onIntruderCaptured?: (imageUrl: string, lat?: number, lng?: number) => void;
}

export const PowerOffChallengeModal: React.FC<PowerOffChallengeModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);

  const handleBiometricAuth = useCallback(async () => {
    try {
      const authRes = await authenticateAsync({
        promptMessage: translateInline(
          lang,
          'Verify identity to power off',
          'قم بتأكيد هويتك لإيقاف تشغيل الهاتف'
        ),
        cancelLabel: translateInline(lang, 'Cancel', 'إلغاء'),
        disableDeviceFallback: false,
      });

      if (authRes.success) {
        setIsSuccess(true);
      }
    } catch (e) {
      console.warn('Biometric auth failed or canceled', e);
    }
  }, [lang]);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setCountdown(60);
      // Attempt biometric / device credential authentication automatically on display
      handleBiometricAuth();
    }
  }, [isOpen, handleBiometricAuth]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSuccess, countdown]);

  if (!isOpen) return null;

  return (
    <div
      id="power-off-challenge-backdrop"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-slate-950/95 backdrop-blur-xl text-white p-4 sm:p-6 overflow-y-auto"
      style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
    >
      {/* Top Header */}
      <div className="w-full max-w-md pt-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-900/40 mb-5 animate-pulse">
          <Power className="w-10 h-10 text-white" />
        </div>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-semibold mb-4">
          <Shield className="w-4 h-4" />
          <span>
            {translateInline(lang, 'Power-Off Guard Active', 'حماية منع إيقاف التشغيل مفعلة')}
          </span>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">
          {translateInline(lang, 'Authentication Required', 'مطلوب إثبات الهوية لإطفاء الهاتف')}
        </h2>
        
        <p className="text-sm text-slate-400 max-w-sm">
          {translateInline(
            lang,
            'Device power-off is locked. Verify your identity using the device screen lock (Biometrics/PIN/Pattern) to proceed.',
            'تم قفل إيقاف التشغيل. الرجاء تأكيد هويتك باستخدام قفل شاشة الهاتف (البصمة، النمط، أو الرمز) للمتابعة.'
          )}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-md flex flex-col items-center my-auto py-4">
        {isSuccess ? (
          <div className="w-full bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3 animate-bounce" />
            
            <h3 className="text-lg font-bold text-emerald-200 mb-1">
              {translateInline(lang, 'Identity Verified!', 'تم تأكيد الهوية بنجاح!')}
            </h3>
            
            <p className="text-sm text-emerald-300/90 mb-6">
              {translateInline(
                lang,
                `Device shutdown is unlocked for ${countdown} seconds. You can now power off the phone.`,
                `تم فك قفل إيقاف التشغيل لمدة ${countdown} ثانية. يمكنك الآن إطفاء الهاتف بأمان.`
              )}
            </p>
            
            <button
              id="power-dialog-trigger-btn"
              onClick={async () => {
                await grantPowerOffBypass(60);
              }}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all text-sm mb-3"
            >
              <Power className="w-5 h-5" />
              <span>{translateInline(lang, 'Open Power Menu Again', 'فتح قائمة إيقاف التشغيل مجدداً')}</span>
            </button>
            
            <button
              id="power-success-close-btn"
              onClick={onClose}
              className="text-sm text-slate-400 hover:text-white underline py-2 mt-2"
            >
              {translateInline(lang, 'Dismiss and return to app', 'إغلاق والعودة')}
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center mt-8">
            <button
              id="power-biometric-btn"
              onClick={handleBiometricAuth}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-base font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-900/50 transition-all"
            >
              <Fingerprint className="w-6 h-6" />
              <span>
                {translateInline(lang, 'Verify Identity (Native Screen Lock)', 'تأكيد الهوية (قفل الهاتف الأساسي)')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="w-full max-w-md pt-2 pb-6 flex items-center justify-between text-xs text-slate-500">
        <span>DroidGuard Power Shield v3.5</span>
        <button
          id="power-cancel-close-btn"
          onClick={onClose}
          className="text-slate-400 hover:text-white px-3 py-2 rounded-lg transition-colors bg-slate-800/50"
        >
          {translateInline(lang, 'Cancel', 'إلغاء')}
        </button>
      </div>
    </div>
  );
};
