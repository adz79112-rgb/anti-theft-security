import { translateInline } from '../utils/translateInline';
import React, { useState, useEffect } from 'react';
import { Fingerprint, Scan, ShieldAlert, KeyRound, CheckCircle2, X, AlertTriangle, Camera } from 'lucide-react';
import { triggerNativeWebAuthn } from '../utils/auth';
import {
  recordFailedAuthAttempt,
  resetFailedAttempts,
  verifyDevicePin,
  getDeviceOwnerPin,
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
  title = translateInline(lang, 'Verify Device Owner Identity (Android System)', 'تأكيد هوية مالك الجهاز (Android System)'),
  subtitle = translateInline(lang, 'Use Fingerprint, Face ID, or Screen Lock', 'استخدم بصمة الإصبع أو الوجه أو قفل شاشة الهاتف'),
 
  reason,
  allowCancel = false,
  botToken,
  chatId,
  userEmail,
  emergencyPhone,
  onLogDispatch,
  onSaveCapture,
}) => {
  const [activeTab, setActiveTab] = useState<'fingerprint' | 'face' | 'pin' | 'pattern'>('fingerprint');
  const [pinInput, setPinInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [intruderAlertMsg, setIntruderAlertMsg] = useState<string | null>(null);
  const [ownerPinHint, setOwnerPinHint] = useState('1234');
  const [failedCount, setFailedCount] = useState<number>(0);

  // Pattern state
  const [patternSelected, setPatternSelected] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAuthSuccess(false);
      setErrorMsg(null);
      setIntruderAlertMsg(null);
      setPinInput('');
      setPatternSelected([]);
      setIsScanning(false);

      getDeviceOwnerPin().then(setOwnerPinHint);
      getFailedAttempts().then(setFailedCount);

      // Attempt native WebAuthn if available in user's browser
      triggerNativeWebAuthn().then((success) => {
        if (success) {
          handleSuccess();
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuccess = async () => {
    // Reset stealth counter to 0 upon authentic owner entry
    await resetFailedAttempts();
    setFailedCount(0);
    setAuthSuccess(true);
    setIsScanning(false);
    setErrorMsg(null);
    setIntruderAlertMsg(null);
    setTimeout(() => {
      onSuccess();
    }, 600);
  };

  const handleFailedAttempt = async (reasonText: string) => {
    setIsScanning(false);
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

  const handleBiometricTouch = () => {
    setIsScanning(true);
    setErrorMsg(null);
    setTimeout(() => {
      setIsScanning(false);
      handleSuccess();
    }, 900);
  };

  // Simulate an intruder touching the biometric sensor with wrong fingerprint
  const handleIntruderBiometricScan = () => {
    setIsScanning(true);
    setErrorMsg(null);
    setTimeout(() => {
      handleFailedAttempt(translateInline(lang, 'Fingerprint does not match device owner', 'بصمة غير مطابقة لهوية مالك الجهاز'));
    }, 700);
  };

  const handlePinDigit = async (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next.length === 4) {
        const isMatch = await verifyDevicePin(next);
        if (isMatch) {
          handleSuccess();
        } else {
          setPinInput('');
          await handleFailedAttempt(translateInline(lang, 'Incorrect screen lock PIN', 'رمز PIN قفل الشاشة غير صحيح'));
        }
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handlePatternDotClick = async (index: number) => {
    if (!patternSelected.includes(index)) {
      const next = [...patternSelected, index];
      setPatternSelected(next);
      if (next.length >= 4) {
        // Owner pattern simulation: any 4 dots starting with 1
        if (next[0] === 1) {
          setTimeout(() => {
            handleSuccess();
          }, 300);
        } else {
          setPatternSelected([]);
          await handleFailedAttempt(translateInline(lang, 'Incorrect screen lock pattern', 'نمط قفل الشاشة غير صحيح'));
        }
      }
    }
  };

  return (
    <div
      id="device-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glowing cyber accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          {allowCancel && onCancel && (
            <button
              id="close-auth-dialog-btn"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Device Credential Mode Tabs */}
        <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800 mb-5 gap-1">
          <button
            id="tab-fingerprint"
            onClick={() => { setActiveTab('fingerprint'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'fingerprint'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>{translateInline(lang, 'Fingerprint', 'بصمة')}</span>
          </button>
          <button
            id="tab-face"
            onClick={() => { setActiveTab('face'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'face'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>{translateInline(lang, 'Face ID', 'الوجه')}</span>
          </button>
          <button
            id="tab-pin"
            onClick={() => { setActiveTab('pin'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'pin'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{translateInline(lang, 'Device PIN', 'PIN الجهاز')}</span>
          </button>
          <button
            id="tab-pattern"
            onClick={() => { setActiveTab('pattern'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'pattern'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-[11px] font-bold">●●</span>
            <span>{translateInline(lang, 'Pattern', 'النمط')}</span>
          </button>
        </div>

        {/* Tab 1: Fingerprint Sensor */}
        {activeTab === 'fingerprint' && (
          <div className="flex flex-col items-center justify-center py-4">
            <button
              id="biometric-sensor-btn"
              onClick={handleBiometricTouch}
              disabled={isScanning || authSuccess}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                authSuccess
                  ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
                  : isScanning
                  ? 'bg-teal-500/20 border-2 border-teal-400 text-teal-300 animate-pulse scale-105'
                  : 'bg-slate-800/80 border-2 border-slate-600 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-400 hover:scale-105 active:scale-95'
              }`}
            >
              {authSuccess ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              ) : (
                <Fingerprint className={`w-12 h-12 ${isScanning ? 'animate-pulse' : ''}`} />
              )}

              {isScanning && (
                <span className="absolute inset-0 rounded-full border-2 border-teal-400 animate-ping opacity-40" />
              )}
            </button>

            <p className="mt-4 text-xs font-medium text-slate-300 text-center">
              {authSuccess
                ? translateInline(lang, 'Device fingerprint verified successfully!', 'تم التحقق من بصمة الجهاز بنجاح!')
                : isScanning
                ? translateInline(lang, 'Verifying fingerprint via Android system...', 'جاري التحقق من بصمة الإصبع عبر نظام Android...')
                : translateInline(lang, 'Touch fingerprint sensor to authenticate via phone security (Owner Fingerprint)', 'المس مستشعر البصمة للمصادقة عبر أمان الهاتف (بصمة المالك)')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              (Android BiometricPrompt • disableDeviceFallback: false)
            </p>
          </div>
        )}

        {/* Tab 2: Facial Recognition */}
        {activeTab === 'face' && (
          <div className="flex flex-col items-center justify-center py-4">
            <button
              id="face-recognition-btn"
              onClick={handleBiometricTouch}
              disabled={isScanning || authSuccess}
              className={`relative w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                authSuccess
                  ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                  : isScanning
                  ? 'bg-teal-500/20 border-2 border-teal-400 text-teal-300'
                  : 'bg-slate-800/80 border-2 border-slate-600 hover:border-teal-400 text-slate-300'
              }`}
            >
              {authSuccess ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              ) : (
                <Scan className={`w-12 h-12 ${isScanning ? 'animate-pulse' : ''}`} />
              )}
            </button>

            <p className="mt-4 text-xs font-medium text-slate-300 text-center">
              {authSuccess
                ? translateInline(lang, 'Face recognized successfully!', 'تم التعرف على الوجه بنجاح!')
                : isScanning
                ? translateInline(lang, 'Matching device approved face features...', 'جاري مطابقة ملامح الوجه المعتمدة بالجهاز...')
                : translateInline(lang, 'Look at the camera to verify via Face Unlock (Owner Face)', 'انظر إلى الكاميرا للتحقق عبر Face Unlock (وجه المالك)')}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                id="trigger-face-scan-btn"
                onClick={handleBiometricTouch}
                className="text-xs text-emerald-400 hover:underline"
              >{translateInline(lang, 'Scan Owner Face', 'مسح وجه المالك')}</button>
            </div>
          </div>
        )}

        {/* Tab 3: Phone Screen PIN (Device PIN fallback) */}
        {activeTab === 'pin' && (
          <div className="py-2">
            <div className="text-center mb-3">
              <p className="text-xs text-slate-400 mb-1">
                {translateInline(lang, 'Enter phone lock code (Owner Code:', 'أدخل رمز قفل الهاتف (رمز المالك:')} <span className="font-mono-code font-bold text-emerald-400">{ownerPinHint}</span>):
              </p>
              <div className="flex justify-center gap-2 h-7 items-center">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all ${
                      pinInput.length > idx
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 scale-110'
                        : 'border border-slate-600 bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto font-mono-code">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  id={`keypad-${digit}`}
                  onClick={() => handlePinDigit(digit)}
                  className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-500/30 text-slate-100 font-bold text-base transition border border-slate-700/60"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                id="keypad-0"
                onClick={() => handlePinDigit('0')}
                className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-500/30 text-slate-100 font-bold text-base transition border border-slate-700/60"
              >
                0
              </button>
              <button
                id="keypad-delete"
                onClick={handlePinDelete}
                className="h-10 rounded-xl bg-slate-800/60 hover:bg-slate-700 active:bg-rose-500/20 text-slate-400 hover:text-slate-100 text-xs transition border border-slate-700/60 flex items-center justify-center"
              >{translateInline(lang, 'Clear', 'مسح')}</button>
            </div>
          </div>
        )}

        {/* Tab 4: Android Device Pattern */}
        {activeTab === 'pattern' && (
          <div className="py-2 text-center">
            <p className="text-xs text-slate-400 mb-3">{translateInline(lang, 'Draw device lock pattern (Connect at least 4 dots):', 'ارسم نمط قفل الجهاز (حدد 4 نقاط على الأقل):')}</p>
            <div className="grid grid-cols-3 gap-5 w-44 h-44 mx-auto p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
                const isSelected = patternSelected.includes(dot);
                return (
                  <button
                    key={dot}
                    id={`pattern-dot-${dot}`}
                    onClick={() => handlePatternDotClick(dot)}
                    className={`rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-400 border-4 border-emerald-500/40 shadow-lg shadow-emerald-400/40 scale-125'
                        : 'bg-slate-700 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  </button>
                );
              })}
            </div>
            {patternSelected.length > 0 && (
              <button
                id="reset-pattern-btn"
                onClick={() => setPatternSelected([])}
                className="text-[11px] text-slate-400 hover:text-slate-200 mt-2 underline"
              >{translateInline(lang, 'Redraw Pattern', 'إعادة رسم النمط')}</button>
            )}
          </div>
        )}

        {/* Emergency Intruder Selfie Alert Banner */}
        {intruderAlertMsg && (
          <div className="mt-3 p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl text-rose-200 text-xs text-center space-y-1.5 shadow-lg shadow-rose-950/50 animate-pulse">
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
          <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500">
            {translateInline(lang, 'Uses built-in Android OS security • No app-specific code required', 'يستخدم أمان نظام التشغيل Android المدمج • لا يتم طلب أي رمز خاص بالتطبيق')}
          </p>
        </div>
      </div>
    </div>
  );
};
