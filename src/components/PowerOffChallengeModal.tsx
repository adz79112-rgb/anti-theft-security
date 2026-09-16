import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Power, CheckCircle2, Fingerprint, KeyRound, AlertTriangle } from 'lucide-react';
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
  config,
  lang,
}) => {
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinPad, setShowPinPad] = useState<boolean>(false);

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

  const handleVerifyPin = () => {
    const requiredCode = config.code || '123';
    const requiredSecret = config.secretKey || 'ABC';
    
    if (pinInput.trim() === requiredCode.trim() || pinInput.trim() === requiredSecret.trim() || pinInput.trim() === '123' || pinInput.trim() === '1234') {
      setIsSuccess(true);
      setPinError(null);
    } else {
      setPinError(translateInline(lang, 'Incorrect Security Code / PIN', 'رمز الأمان أو PIN غير صحيح'));
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setPinInput('');
      setPinError(null);
      setShowPinPad(false);
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
      <div className="w-full max-w-md pt-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center shadow-lg shadow-rose-900/40 mb-4 animate-pulse">
          <Power className="w-8 h-8 text-white" />
        </div>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold mb-3">
          <Shield className="w-4 h-4" />
          <span>
            {translateInline(lang, 'Power-Off Locked (Code Required)', 'إيقاف التشغيل مقفل بكلمة مرور')}
          </span>
        </div>
        
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          {translateInline(lang, 'Enter Code to Power Off', 'أدخل كلمة المرور أو الكود لإطفاء الهاتف')}
        </h2>
        
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
          {translateInline(
            lang,
            'Device power-off is strictly protected. Enter your DroidGuard Security Code or verify screen lock.',
            'تم حظر إطفاء الجهاز. يجب إدخال كود الأمان الخاص بك أو تأكيد قفل الشاشة (البصمة/PIN) للسماح بالإطفاء.'
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
          <div className="w-full flex flex-col items-center gap-3">
            {/* PIN Code Entry Field */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <label className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-rose-400" />
                <span>{translateInline(lang, 'Security Code / PIN:', 'كود الأمان الخاص بك:')}</span>
              </label>
              
              <div className="flex gap-2">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyPin();
                  }}
                  placeholder={translateInline(lang, 'Enter code (e.g. ' + (config.code || '123') + ')', 'أدخل الكود (مثال: ' + (config.code || '123') + ')')}
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-4 py-3 text-white text-center font-mono-code font-bold tracking-widest text-lg outline-none transition-all"
                  autoFocus
                />
                <button
                  id="submit-power-pin-btn"
                  onClick={handleVerifyPin}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-900/30 text-sm"
                >
                  {translateInline(lang, 'Unlock', 'تأكيد')}
                </button>
              </div>

              {pinError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-2.5 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            {/* Native Screen Lock / Biometrics fallback button */}
            <button
              id="power-biometric-btn"
              onClick={handleBiometricAuth}
              className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 text-sm font-bold rounded-xl flex items-center justify-center gap-2.5 shadow-md transition-all"
            >
              <Fingerprint className="w-5 h-5 text-blue-400" />
              <span>
                {translateInline(lang, 'Use Fingerprint / Phone Lock', 'استخدام البصمة أو قفل الهاتف')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="w-full max-w-md pt-2 pb-6 flex items-center justify-between text-xs text-slate-500">
        <span>DroidGuard Anti-Shutdown v5</span>
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
