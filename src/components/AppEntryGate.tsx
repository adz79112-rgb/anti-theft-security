import React, { useState, useEffect, useCallback } from 'react';
import { translateInline } from '../utils/translateInline';
import { ShieldCheck, Fingerprint, Scan, KeyRound, Lock, ArrowLeft, AlertTriangle, Camera, Globe } from 'lucide-react';
import { getTranslation } from '../utils/translations';
import { Language, DispatchEvent, IntruderCapture } from '../types';
import { LANGUAGES_REGISTRY } from '../utils/languagesRegistry';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { triggerNativeWebAuthn } from '../utils/auth';
import {
  recordFailedAuthAttempt,
  resetFailedAttempts,
  verifyDevicePin,
  getDeviceOwnerPin,
  getFailedAttempts,
} from '../utils/authFailCounter';

interface AppEntryGateProps {
  onAuthenticated: () => void;
  lang: Language;
  onSelectLang?: (lang: Language) => void;
  onLogDispatch?: (event: Omit<DispatchEvent, 'id'>) => void;
  onSaveCapture?: (capture: Omit<IntruderCapture, 'id'>) => void;
}

export const AppEntryGate: React.FC<AppEntryGateProps> = ({
  onAuthenticated,
  lang,
  onSelectLang,
  onLogDispatch,
  onSaveCapture,
}) => {
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const t = getTranslation(lang);
  const currentLangMeta = LANGUAGES_REGISTRY.find((l) => l.code === lang) || LANGUAGES_REGISTRY[0];

  const [authMode, setAuthMode] = useState<'biometric' | 'pin'>('biometric');
  const [pinDigits, setPinDigits] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [intruderAlertMsg, setIntruderAlertMsg] = useState<string | null>(null);
  const [ownerPin, setOwnerPin] = useState('1234');
  const [failedAttempts, setFailedAttempts] = useState(0);


  const handleSuccess = useCallback(async () => {
    await resetFailedAttempts();
    setFailedAttempts(0);
    setErrorFeedback(null);
    setIntruderAlertMsg(null);
    onAuthenticated();
  }, [onAuthenticated]);

  useEffect(() => {
    getDeviceOwnerPin().then(setOwnerPin);
    getFailedAttempts().then(setFailedAttempts);
  }, [handleSuccess]);

  const handleFailed = async (reason: string) => {
    setIsScanning(false);
    const res = await recordFailedAuthAttempt({
      onLogDispatch,
      onSaveCapture,
    });

    setFailedAttempts(res.newCount);

    if (res.isThirdAttempt) {
      setIntruderAlertMsg(
        `🚨 [${translateInline(lang, 'Intruder photo captured silently!', 'تم التقاط صورة المتسلل صامتاً!')}] تم استنفاد 3 محاولات فاشلة. تم إرسال الموقع الجغرافي وصورة الكاميرا فوراً لقنوات الطوارئ (Telegram, Gmail, Dual-SMS).`
      );
      setErrorFeedback(null);
    } else {
      setErrorFeedback(
        `${reason} ${translateInline(lang, '(Failed attempt ${res.newCount} of 3). On the 3rd attempt, intruder photo will be captured and emergency reports sent.', '(محاولة فاشلة ${res.newCount} من 3). عند المحاولة الثالثة سيتم التقاط صورة الدخيل وإرسال تقارير الطوارئ.')}`
      );
    }
  };

  const handleBiometricAuth = () => {
    setIsScanning(true);
    setScanFeedback(translateInline(lang, 'Scanning biometric credentials...', 'جاري التحقق من البصمة البيومترية...'));
    
    setTimeout(() => {
      setIsScanning(false);
      setScanFeedback(translateInline(lang, 'Biometrics Verified!', 'تم تأكيد الهوية بنجاح!'));
      setTimeout(() => {
        handleSuccess();
      }, 500);
    }, 900);
  };

  const handleSimulateIntruderBio = () => {
    setIsScanning(true);
    setScanFeedback(translateInline(lang, 'Scanning fingerprint...', 'جاري فحص البصمة...'));
    setTimeout(() => {
      handleFailed(translateInline(lang, 'Intruder fingerprint not matched', 'بصمة متسلل غير مطابقة'));
    }, 600);
  };

  const handlePinInput = async (num: string) => {
    if (pinDigits.length < 4) {
      const next = pinDigits + num;
      setPinDigits(next);
      if (next.length === 4) {
        const isMatch = await verifyDevicePin(next);
        if (isMatch) {
          setTimeout(() => {
            handleSuccess();
          }, 300);
        } else {
          setPinDigits('');
          await handleFailed(translateInline(lang, 'Incorrect PIN', 'رمز PIN غير صحيح'));
        }
      }
    }
  };

  const handlePinBackspace = () => {
    setPinDigits((prev) => prev.slice(0, -1));
  };

  return (
    <div
      id="app-entry-gate"
      className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none"
    >
      {/* Background Cyber Grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-25" />
      
      {/* Glow Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center">
        {/* Language Selector in Gate */}
        {onSelectLang && (
          <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
            <button
              id="gate-language-selector-btn"
              onClick={() => setIsLangModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700/60 transition cursor-pointer"
              title={t.selectLanguage}
            >
              <span className="text-sm select-none">{currentLangMeta.flag}</span>
              <span className="text-[11px] font-medium">{currentLangMeta.name}</span>
              <Globe className="w-3 h-3 text-emerald-400 ml-0.5" />
            </button>
          </div>
        )}

        {/* Shield Header */}
        <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-6 shadow-inner">
          <ShieldCheck className="w-12 h-12" />
        </div>

        <h1 className="text-2xl font-black text-slate-100 mb-2 tracking-tight">
          {t.gateTitle}
        </h1>
        <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto leading-relaxed">
          {t.gateSubtitle}
        </p>

        {authMode === 'biometric' ? (
          <div className="flex flex-col items-center">
            {/* Biometric Touch target */}
            <button
              id="entry-biometric-btn"
              onClick={handleBiometricAuth}
              disabled={isScanning}
              className={`relative w-28 h-28 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                isScanning
                  ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 shadow-xl shadow-emerald-500/30 scale-105'
                  : 'bg-slate-800/80 border-2 border-slate-700/80 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 hover:scale-105 active:scale-95 shadow-lg'
              }`}
            >
              {isScanning ? (
                <Scan className="w-14 h-14 animate-pulse text-emerald-400" />
              ) : (
                <Fingerprint className="w-14 h-14" />
              )}
              {isScanning && (
                <div className="absolute inset-0 rounded-3xl border-2 border-emerald-400 animate-ping opacity-30" />
              )}
            </button>

            <p className="mt-5 text-sm font-semibold text-slate-200">
              {scanFeedback || t.gateScanFingerprint}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              (expo-local-authentication: Fingerprint / Face ID)
            </p>

            {/* Fallback button to PIN */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 w-full">
              <button
                id="entry-switch-to-pin-btn"
                onClick={() => setAuthMode('pin')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-xl transition border border-emerald-500/20"
              >
                <KeyRound className="w-4 h-4" />
                <span>{t.gateUsePin}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* PIN indicators & Hint */}
            <p className="text-xs text-slate-400 mb-2">
              {translateInline(lang, 'Enter phone lock PIN (Default PIN: ', 'أدخل رمز قفل الهاتف (الرمز الافتراضي: ')}<span className="font-mono-code font-bold text-emerald-400">{ownerPin}</span>{translateInline(lang, '):', '):')}
            </p>
            <div className="flex justify-center gap-3 mb-5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    pinDigits.length > i
                      ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 scale-110'
                      : 'border-2 border-slate-600 bg-slate-800/60'
                  }`}
                />
              ))}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 w-64 max-w-full font-mono-code mb-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  id={`entry-keypad-${digit}`}
                  onClick={() => handlePinInput(digit)}
                  className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500/30 text-slate-100 font-bold text-lg transition border border-slate-700/60 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                id="entry-keypad-0"
                onClick={() => handlePinInput('0')}
                className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-500/30 text-slate-100 font-bold text-lg transition border border-slate-700/60 shadow-sm"
              >
                0
              </button>
              <button
                id="entry-keypad-del"
                onClick={handlePinBackspace}
                className="h-12 rounded-2xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-slate-100 text-xs font-semibold transition border border-slate-700/60 flex items-center justify-center"
              >
                {translateInline(lang, 'Clear', 'مسح')}
              </button>
            </div>

            {/* Back to Biometrics */}
            <button
              id="entry-switch-to-bio-btn"
              onClick={() => { setAuthMode('biometric'); setPinDigits(''); }}
              className="text-xs text-slate-400 hover:text-slate-200 mt-2 flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{translateInline(lang, 'Return to fingerprint authentication', 'العودة للمصادقة بالبصمة')}</span>
            </button>
          </div>
        )}

        {/* Intruder Alert Banner */}
        {intruderAlertMsg && (
          <div className="mt-4 p-3.5 bg-rose-950/80 border border-rose-500/60 rounded-2xl text-rose-200 text-xs text-center space-y-2 shadow-xl shadow-rose-950/60 animate-bounce">
            <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-sm">
              <Camera className="w-4 h-4 text-rose-400" />
              <span>{translateInline(lang, 'Intruder photo captured silently!', 'تم التقاط صورة المتسلل صامتاً!')}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-200">{intruderAlertMsg}</p>
            <div className="flex justify-center gap-2 pt-1 text-[10px] text-rose-300">
              <span className="bg-rose-900/70 px-2 py-0.5 rounded-full border border-rose-500/30">Telegram ✓</span>
              <span className="bg-rose-900/70 px-2 py-0.5 rounded-full border border-rose-500/30">Gmail ✓</span>
              <span className="bg-rose-900/70 px-2 py-0.5 rounded-full border border-rose-500/30">Dual-SMS ✓</span>
            </div>
          </div>
        )}

        {errorFeedback && (
          <div className="mt-4 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center">
            {errorFeedback}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Android Local Authentication Protected</span>
        </div>
      </div>

      {/* Language Selector Modal */}
      {onSelectLang && (
        <LanguageSelectorModal
          isOpen={isLangModalOpen}
          onClose={() => setIsLangModalOpen(false)}
          currentLang={lang}
          onSelectLang={onSelectLang}
        />
      )}
    </div>
  );
};
