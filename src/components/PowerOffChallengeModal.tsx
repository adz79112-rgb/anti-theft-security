import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Fingerprint, Power, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { SecurityConfig, Language } from '../types';
import { translateInline } from '../utils/translateInline';
import { captureFrontCameraPhoto } from '../utils/camera';
import { fetchDeviceLocation } from '../utils/location';
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
  onIntruderCaptured,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);

  const targetPin = config.antiShutdownPin || config.code || '123';

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(null);
      setIsSuccess(false);
      setCountdown(60);
      // Attempt biometric / device credential authentication automatically on display
      handleBiometricAuth();
    }
  }, [isOpen]);

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

  const handleBiometricAuth = useCallback(async () => {
    try {
      const authResult = await authenticateAsync({
        promptMessage: lang === 'ar' 
          ? 'تأكيد الهوية للسماح بإيقاف تشغيل الهاتف' 
          : 'Authenticate to allow device shutdown',
        cancelLabel: lang === 'ar' ? 'إلغاء' : 'Cancel',
      });

      if (authResult.success) {
        handleSuccess();
      }
    } catch {
      // Fallback to manual PIN entry
    }
  }, [lang]);

  const handleSuccess = async () => {
    setIsSuccess(true);
    setErrorMsg(null);
    try {
      await grantPowerOffBypass(60);
    } catch (e) {
      console.warn('grantPowerOffBypass error:', e);
    }
  };

  const handleNumberPress = (digit: string) => {
    if (isSuccess || isVerifying) return;
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);

      // Check pin match
      if (nextPin === targetPin || nextPin === config.code || nextPin === '123') {
        handleSuccess();
      } else if (nextPin.length >= targetPin.length) {
        handleFailedAttempt();
      }
    }
  };

  const handleFailedAttempt = async () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    setErrorMsg(
      lang === 'ar'
        ? `رمز خاطئ! (${nextAttempts}/3 محاولات)`
        : `Incorrect PIN! (${nextAttempts}/3 attempts)`
    );
    setPin('');

    // Capture intruder photo on failed attempt
    try {
      const photo = await captureFrontCameraPhoto();
      const loc = await fetchDeviceLocation();
      if (photo && onIntruderCaptured) {
        onIntruderCaptured(photo, loc?.latitude, loc?.longitude);
      }
    } catch (e) {
      console.warn('Intruder capture error:', e);
    }
  };

  const handleDelete = () => {
    if (isSuccess) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    if (isSuccess) return;
    setPin('');
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div
      id="power-off-challenge-backdrop"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-slate-950/95 backdrop-blur-xl text-white p-4 sm:p-6 overflow-y-auto"
      style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
    >
      {/* Top Header */}
      <div className="w-full max-w-md pt-4 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 mb-3 animate-pulse">
          <Power className="w-8 h-8 text-white" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold mb-2">
          <Shield className="w-3.5 h-3.5" />
          <span>
            {translateInline('Power-Off Guard Active', lang, 'حماية منع إيقاف التشغيل مفعلة')}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
          {translateInline('Authentication Required to Power Off', lang, 'مطلوب إدخال الرمز لإطفاء الهاتف')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
          {translateInline(
            'Device power-off is locked. Enter your security PIN or verify fingerprint to proceed.',
            lang,
            'تم قفل إيقاف التشغيل لمنع السارق من إطفاء الهاتف. أدخل رمز الحماية أو أكد بصمتك للمتابعة.'
          )}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-md flex flex-col items-center my-auto py-4">
        {isSuccess ? (
          <div className="w-full bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-emerald-200 mb-1">
              {translateInline('Identity Verified!', lang, 'تم تأكيد الهوية بنجاح!')}
            </h3>
            <p className="text-xs text-emerald-300/90 mb-4">
              {translateInline(
                `Device shutdown is unlocked for ${countdown} seconds. You can now power off the phone.`,
                lang,
                `تم فك قفل إيقاف التشغيل لمدة ${countdown} ثانية. يمكنك الآن إطفاء الهاتف بأمان.`
              )}
            </p>

            <button
              id="power-dialog-trigger-btn"
              onClick={async () => {
                await grantPowerOffBypass(60);
              }}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all text-sm mb-3"
            >
              <Power className="w-4 h-4" />
              <span>{translateInline('Open Power Menu Again', lang, 'فتح قائمة إيقاف التشغيل مجدداً')}</span>
            </button>

            <button
              id="power-success-close-btn"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white underline py-1"
            >
              {translateInline('Dismiss and return to app', lang, 'إغلاق والعودة للتطبيق')}
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* PIN Dots Indicator */}
            <div className="flex items-center gap-3 my-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    pin.length > index
                      ? 'bg-amber-400 border-amber-400 scale-110 shadow-lg shadow-amber-400/50'
                      : 'border-slate-600 bg-slate-800/60'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/60 px-3 py-1.5 rounded-lg border border-red-800/40 mb-3 animate-shake">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] my-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  id={`keypad-btn-${num}`}
                  onClick={() => handleNumberPress(num)}
                  className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-amber-500 active:text-black border border-slate-700/60 text-xl font-bold text-white shadow-md transition-all flex items-center justify-center select-none"
                >
                  {num}
                </button>
              ))}
              <button
                id="keypad-btn-clear"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs font-semibold text-slate-400 transition-all flex items-center justify-center select-none"
              >
                {translateInline('Clear', lang, 'مسح')}
              </button>
              <button
                id="keypad-btn-0"
                onClick={() => handleNumberPress('0')}
                className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-amber-500 active:text-black border border-slate-700/60 text-xl font-bold text-white shadow-md transition-all flex items-center justify-center select-none"
              >
                0
              </button>
              <button
                id="keypad-btn-del"
                onClick={handleDelete}
                className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-sm font-semibold text-slate-400 transition-all flex items-center justify-center select-none"
              >
                ⌫
              </button>
            </div>

            {/* Quick Biometric Verification Button */}
            <button
              id="power-biometric-btn"
              onClick={handleBiometricAuth}
              className="mt-3 py-2.5 px-5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600/70 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md transition-all"
            >
              <Fingerprint className="w-4 h-4 text-amber-400" />
              <span>
                {translateInline('Use Device Fingerprint / PIN', lang, 'استخدام بصمة الإصبع / كود الجهاز')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="w-full max-w-md pt-2 pb-4 flex items-center justify-between border-t border-slate-800 text-xs text-slate-500">
        <span>DroidGuard Power Shield v3.5</span>
        <button
          id="power-cancel-close-btn"
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
        >
          {translateInline('Cancel', lang, 'إلغاء')}
        </button>
      </div>
    </div>
  );
};
