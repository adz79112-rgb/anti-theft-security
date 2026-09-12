import React, { useState, useEffect, useRef, useCallback } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  Fingerprint,
  CheckCircle2,
  Shield,
  EyeOff,
  Activity,
  Send,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Language, DispatchEvent, IntruderCapture } from '../types';
import {
  executeStealthDispatchCycle,
  StealthCycleResult,
} from '../utils/lockdownService';
import { getNetworkAndSimState, NetworkManagementState } from '../utils/simManager';
import { authenticateAsync } from '../utils/localAuthentication';
import { recordFailedAuthAttempt } from '../utils/authFailCounter';

interface LockdownScreenProps {
  isOpen: boolean;
  onDismiss: (summary: string) => void;
  triggerSender: string;
  lang: Language;
  onLogDispatch: (event: Omit<DispatchEvent, 'id'>) => void;
  onSaveCapture: (capture: Omit<IntruderCapture, 'id'>) => void;
  telegramBotToken?: string;
  telegramChatId?: string;
  userEmail?: string;
  emergencyPhone?: string;
}

const CYCLE_DURATION_SECONDS = 120; // 2 minutes

export const LockdownScreen: React.FC<LockdownScreenProps> = ({
  isOpen,
  onDismiss,
  triggerSender,
  lang,
  onLogDispatch,
  onSaveCapture,
  telegramBotToken,
  telegramChatId,
  userEmail,
  emergencyPhone,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(CYCLE_DURATION_SECONDS);
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [, setCycleHistory] = useState<StealthCycleResult[]>([]);
  const [, setNetworkState] = useState<NetworkManagementState | null>(null);

  // Stealth screen controls - purely black by default
  const [isScreenAwake, setIsScreenAwake] = useState<boolean>(false);
  const [tapSequenceCount, setTapSequenceCount] = useState<number>(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  // Native System Biometric & Screen Lock state
  const [isScanningFingerprint, setIsScanningFingerprint] = useState<boolean>(false);
  const [unlockSuccess, setUnlockSuccess] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Technical debug HUD
  const [showTelemetryHud, setShowTelemetryHud] = useState<boolean>(false);

  const cycleRef = useRef<number>(1);
  cycleRef.current = currentCycle;

  const secondsRemainingRef = useRef<number>(secondsRemaining);
  secondsRemainingRef.current = secondsRemaining;

  const runCycleRef = useRef<((cycleNum: number) => void) | null>(null);

  // Strict 5-Tap Debounce and Timing Refs
  const tapCountRef = useRef<number>(0);
  const lastTapTimestampRef = useRef<number>(0);
  const tapResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Successful Unlock Callback
  const handleUnlockSuccess = useCallback(
    (methodLabel: string) => {
      setUnlockSuccess(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }

      setTimeout(() => {
        const totalCycles = cycleRef.current;
        const msg =
          lang === 'ar'
            ? `تم التحقق بنجاح عبر قفل النظام وبصمة الجهاز الرسمية (${methodLabel}). تم إرسال ${totalCycles} دورة تتبع أمنية إلى بريدك وتلغرام.`
            : `Device verified and unlocked via Android System Lock (${methodLabel}). Dispatched ${totalCycles} stealth cycles.`;

        onDismiss(msg);
      }, 700);
    },
    [lang, onDismiss]
  );

  // Direct Android OS Biometric & Screen Lock verification handler
  const handleNativeAuth = useCallback(async () => {
    if (isScanningFingerprint) return;
    setIsScanningFingerprint(true);
    setAuthError(null);

    // Initial haptic pulse for sensor touch
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      const authRes = await authenticateAsync({
        promptMessage: translateInline(
          lang,
          'Confirm owner identity to unlock device',
          'أثبت هويتك كمالك للجهاز لإلغاء القفل'
        ),
        cancelLabel: translateInline(lang, 'Cancel', 'إلغاء'),
        fallbackLabel: translateInline(lang, 'Use PIN/Pattern', 'استخدام رمز PIN أو النمط'),
        disableDeviceFallback: false,
      });

      setIsScanningFingerprint(false);

      if (authRes.success) {
        handleUnlockSuccess(
          translateInline(lang, 'Android Biometrics / PIN', 'بصمة أو رمز PIN النظام الأصلي')
        );
      } else {
        const isLockout = authRes.error && (
          authRes.error.toLowerCase().includes('lockout') ||
          authRes.error.toLowerCase().includes('too many')
        );

        if (isLockout) {
          setAuthError(
            translateInline(
              lang,
              `⚠️ Biometric sensor locked: ${authRes.error}. Please use your device PIN/Pattern.`,
              `⚠️ تم قفل مستشعر البصمة: ${authRes.error}. يرجى استخدام رمز PIN أو نمط الهاتف.`
            )
          );
        } else {
          setAuthError(
            translateInline(
              lang,
              `Authentication failed. ${authRes.error ? '(' + authRes.error + ')' : ''}`,
              `فشلت المصادقة. ${authRes.error ? '(' + authRes.error + ')' : ''}`
            )
          );
        }

        // Record failed attempt and trigger alerts asynchronously in the background
        recordFailedAuthAttempt({
          customBotToken: telegramBotToken,
          customChatId: telegramChatId,
          customUserEmail: userEmail,
          customEmergencyPhone: emergencyPhone,
          onLogDispatch,
          onSaveCapture,
        }).then((failRes) => {
          if (failRes.isThirdAttempt) {
            setAuthError(
              translateInline(
                lang,
                '🚨 Intruder photo captured and emergency alerts dispatched!',
                '🚨 تم التقاط صورة المتسلل صامتاً! تم إرسال البلاغات للطوارئ.'
              )
            );
          } else {
            setAuthError(
              translateInline(
                lang,
                `Authentication failed (${failRes.newCount} of 3 attempts). ${authRes.error ? '(' + authRes.error + ')' : ''}`,
                `فشلت المصادقة (${failRes.newCount} من 3 محاولات). ${authRes.error ? '(' + authRes.error + ')' : ''}`
              )
            );
          }
        }).catch((err) => {
          console.warn('Failed recording auth attempt:', err);
        });
      }
    } catch (err: any) {
      console.warn('Native biometric error in LockdownScreen:', err);
      setAuthError(
        translateInline(
          lang,
          `Authentication stopped: ${err?.message || 'Please try again or use PIN'}`,
          `توقفت المصادقة: ${err?.message || 'يرجى المحاولة مجدداً أو استخدام رمز PIN'}`
        )
      );
    } finally {
      setIsScanningFingerprint(false);
    }
  }, [
    isScanningFingerprint,
    lang,
    handleUnlockSuccess,
    telegramBotToken,
    telegramChatId,
    userEmail,
    emergencyPhone,
    onLogDispatch,
    onSaveCapture,
  ]);

  // Handle Black Screen Tap with EXACT 5-Tap verification
  const handlePointerOrTouchTap = useCallback(
    (e: React.SyntheticEvent) => {
      if (isScreenAwake) return;

      const now = Date.now();
      // Strict debounce: ignore any event that arrives within 220ms
      if (now - lastTapTimestampRef.current < 220) {
        return;
      }
      lastTapTimestampRef.current = now;

      // If already in 5-second countdown and user taps again:
      if (tapCountRef.current === 5) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        tapCountRef.current = 0;
        setTapSequenceCount(0);
        setSilenceCountdown(null);
        setIsScreenAwake(true);
        return;
      }

      tapCountRef.current += 1;
      const count = tapCountRef.current;
      setTapSequenceCount(count);

      if (tapResetTimerRef.current) {
        clearTimeout(tapResetTimerRef.current);
        tapResetTimerRef.current = null;
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35);
      }

      if (count === 5) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([70, 40, 90]);
        }

        setSilenceCountdown(5);
        let secondsLeft = 5;

        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
          secondsLeft -= 1;
          setSilenceCountdown(secondsLeft);
          if (secondsLeft <= 0) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          }
        }, 1000);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
          setTapSequenceCount(0);
          setSilenceCountdown(null);
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setIsScreenAwake(true);
        }, 5000);
      } else {
        tapResetTimerRef.current = setTimeout(() => {
          tapCountRef.current = 0;
          setTapSequenceCount(0);
          setSilenceCountdown(null);
        }, 2200);
      }
    },
    [isScreenAwake]
  );

  // Run a single dispatch cycle
  const runCycle = useCallback(
    async (cycleNum: number) => {
      setIsDispatching(true);
      try {
        const result = await executeStealthDispatchCycle(
          cycleNum,
          triggerSender,
          {
            onLogDispatch,
            onSaveCapture,
          },
          telegramBotToken,
          telegramChatId,
          userEmail,
          emergencyPhone
        );
        setCycleHistory((prev) => [result, ...prev]);

        const netState = await getNetworkAndSimState();
        setNetworkState(netState);
      } catch (err) {
        console.warn('Stealth cycle dispatch error:', err);
      } finally {
        setIsDispatching(false);
      }
    },
    [triggerSender, onLogDispatch, onSaveCapture, telegramBotToken, telegramChatId, userEmail, emergencyPhone]
  );

  useEffect(() => {
    runCycleRef.current = runCycle;
  }, [runCycle]);

  // On open: run cycle #1 immediately and start the 2-minute periodic interval
  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(CYCLE_DURATION_SECONDS);
      setCurrentCycle(1);
      setCycleHistory([]);
      setShowTelemetryHud(false);
      setIsScreenAwake(false);
      setTapSequenceCount(0);
      setSilenceCountdown(null);
      setUnlockSuccess(false);
      setAuthError(null);
      return;
    }

    if (runCycleRef.current) runCycleRef.current(1);

    const interval = setInterval(() => {
      if (secondsRemainingRef.current <= 1) {
        const nextCycle = cycleRef.current + 1;
        setCurrentCycle(nextCycle);
        setSecondsRemaining(CYCLE_DURATION_SECONDS);
        if (runCycleRef.current) runCycleRef.current(nextCycle);
      } else {
        setSecondsRemaining((prev) => prev - 1);
      }
    }, 1000);

    window.history.pushState({ stealthLocked: true }, '');
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState({ stealthLocked: true }, '');
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', handlePopState);
      if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="stealth-stolen-mode-screen"
      className="fixed inset-0 z-50 bg-black text-slate-100 flex flex-col justify-between overflow-hidden select-none"
      onPointerDown={handlePointerOrTouchTap}
    >
      {/* 
        =======================================================================
        STATE A: PURE PITCH-BLACK SCREEN (Fake Power-Off Trap)
        =======================================================================
      */}
      {!isScreenAwake ? (
        <div className="w-full h-full flex flex-col items-center justify-between p-6 pointer-events-none">
          <div className="h-10" />

          {/* Center Feedback strictly for the owner */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {tapSequenceCount > 0 && tapSequenceCount < 5 && (
              <div className="px-3 py-1 rounded-full bg-slate-950/40 text-slate-700 text-[10px] font-mono-code animate-pulse opacity-40">
                • {tapSequenceCount} / 5 •
              </div>
            )}

            {tapSequenceCount === 5 && silenceCountdown !== null && (
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono-code text-center shadow-2xl animate-pulse space-y-1">
                <p className="font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{translateInline(lang, '5/5 Taps Verified!', 'تم تسجيل 5 نقرات بنجاح!')}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  {translateInline(
                    lang,
                    `Wait ${silenceCountdown}s without touching to open Android Lock...`,
                    `توقف عن لمس الشاشة ${silenceCountdown} ثوانٍ لفتح قفل أندرويد...`
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="h-10" />
        </div>
      ) : (
        /* 
          =======================================================================
          STATE B: OFFICIAL ANDROID SYSTEM SCREEN LOCK & BIOMETRIC AUTH
          =======================================================================
        */
        <div
          id="stealth-android-system-auth-screen"
          className="w-full h-full flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white animate-fade-in pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="flex items-start justify-between pt-2 sm:pt-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono-code">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {translateInline(
                    lang,
                    '5-Tap Owner Gesture Confirmed',
                    'تم تأكيد إيماءة الـ 5 نقرات للمالك'
                  )}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-sans">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Back to pitch black */}
            <button
              type="button"
              id="btn-return-black-screen"
              onClick={() => {
                setIsScreenAwake(false);
                setAuthError(null);
                setShowTelemetryHud(false);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{translateInline(lang, 'Turn Off Screen', 'إطفاء الشاشة')}</span>
            </button>
          </div>

          {/* Center Official Android Biometric / Screen Lock Sheet */}
          <div className="max-w-sm mx-auto w-full space-y-4 my-auto">
            {unlockSuccess ? (
              <div className="p-6 rounded-3xl bg-emerald-950/90 border border-emerald-500 text-center space-y-3 shadow-2xl animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">
                  {translateInline(lang, 'Identity Verified!', 'تم تأكيد هوية مالك الهاتف بنجاح!')}
                </h3>
                <p className="text-xs text-emerald-300">
                  {translateInline(
                    lang,
                    'Restoring device dashboard and closing stealth mode...',
                    'جارٍ إلغاء وضع السرقة واستعادة شاشة هاتفك بالكامل...'
                  )}
                </p>
              </div>
            ) : (
              /* Main Interactive Fingerprint & OS Lock Interface */
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 text-center space-y-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-center gap-2 text-cyan-400">
                  <Shield className="w-5 h-5" />
                  <span className="text-xs font-bold tracking-wide uppercase">
                    {translateInline(lang, 'Android System Security', 'نظام أمان أندرويد الأصلي')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">
                    {translateInline(lang, 'Verify it’s you', 'تأكيد هوية المالك')}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {translateInline(
                      lang,
                      'Authenticate via Android Biometrics, Fingerprint, Face or device PIN.',
                      'المصادقة عبر أمان أندرويد: البصمة، الوجه، أو رمز PIN / النمط الخاص بالجهاز.'
                    )}
                  </p>
                </div>

                {/* Fingerprint Sensor Trigger Button (directly invokes Android BiometricPrompt) */}
                <div className="flex flex-col items-center justify-center py-2">
                  <button
                    type="button"
                    id="btn-trigger-android-biometrics"
                    onClick={handleNativeAuth}
                    disabled={isScanningFingerprint}
                    className={`relative w-28 h-28 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer select-none active:scale-95 ${
                      isScanningFingerprint
                        ? 'bg-cyan-500/30 border-cyan-300 scale-105 shadow-2xl shadow-cyan-400/60 ring-4 ring-cyan-400/30'
                        : 'bg-slate-950 border-cyan-500/60 hover:border-cyan-400 hover:bg-slate-900 shadow-xl'
                    }`}
                  >
                    <div
                      className={`absolute inset-0 rounded-full border border-cyan-400/40 pointer-events-none ${
                        isScanningFingerprint ? 'animate-ping' : 'animate-pulse'
                      }`}
                    />
                    {isScanningFingerprint ? (
                      <Loader2 className="w-14 h-14 text-cyan-300 animate-spin" />
                    ) : (
                      <Fingerprint className="w-14 h-14 text-cyan-400" />
                    )}
                  </button>

                  <span className="text-xs text-cyan-300/90 font-medium mt-3 flex items-center gap-1.5">
                    {isScanningFingerprint ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                        <span>{translateInline(lang, 'Awaiting OS Authentication...', 'بانتظار مصادقة نظام Android الأصلي...')}</span>
                      </>
                    ) : (
                      <span>{translateInline(lang, 'Touch sensor to verify & unlock', 'المس المستشعر للتحقق عبر أمان الهاتف')}</span>
                    )}
                  </span>
                </div>

                {/* Direct Android Screen Lock / PIN button */}
                <button
                  type="button"
                  id="btn-use-device-screen-lock"
                  onClick={handleNativeAuth}
                  disabled={isScanningFingerprint}
                  className="w-full py-3 px-4 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {translateInline(
                      lang,
                      'Unlock with Device Biometrics / PIN / Pattern',
                      'إلغاء القفل ببصمة / PIN / نمط نظام الهاتف الأصلي'
                    )}
                  </span>
                </button>

                {authError && (
                  <p className="text-rose-400 text-xs font-medium bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl">
                    {authError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar: Telemetry Log for Owner */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              id="btn-toggle-stealth-telemetry"
              onClick={() => setShowTelemetryHud((prev) => !prev)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>
                {showTelemetryHud
                  ? translateInline(lang, 'Hide Telemetry Log', 'إخفاء سجل البث')
                  : translateInline(lang, 'View Real-Time Telemetry Log', 'عرض سجل البث (Gmail & Telegram)')}
              </span>
            </button>

            <span className="text-[11px] text-slate-500 font-mono-code">
              Cycle #{currentCycle} • Next in {Math.floor(secondsRemaining / 60)}:
              {(secondsRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Telemetry Log Panel */}
          {showTelemetryHud && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono-code space-y-2 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>{translateInline(lang, 'Active Dispatch Status:', 'حالة الإرسال النشطة:')}</span>
                <span className="text-emerald-400">
                  {isDispatching ? 'Transmitting...' : 'Standby (Active)'}
                </span>
              </div>
              <div className="space-y-1 text-slate-400">
                <p>• Verified Gmail: {userEmail || 'adz79112@gmail.com'} (✓ Dispatched)</p>
                <p>• Telegram: {telegramChatId ? `@${telegramChatId}` : 'Configured via Bot'} (✓ Active)</p>
                <p>• Dual-SIM SMS: {emergencyPhone || translateInline(lang, 'Not configured (Configure in SMS tab)', 'غير محدد (يرجى الضبط في تبويب SMS)')} (SIM 1 + SIM 2)</p>
              </div>
              <button
                type="button"
                id="btn-force-stealth-cycle"
                onClick={() => {
                  const next = currentCycle + 1;
                  setCurrentCycle(next);
                  setSecondsRemaining(CYCLE_DURATION_SECONDS);
                  runCycle(next);
                }}
                disabled={isDispatching}
                className="w-full py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{translateInline(lang, 'Dispatch Snapshot Now', 'إرسال لقطة فورية الآن')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
