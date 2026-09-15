import React, { useState, useEffect } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  Mail,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  KeyRound,
  CheckCircle2,
  RotateCcw,
  FastForward,
  XCircle,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Language, DispatchEvent } from '../types';
import {
  generateOTP,
  sendVerificationEmail,
  loadEmailSecurityState,
  confirmEmailVerification,
  initiateEmailChangeCooldown,
  cancelEmailChangeCooldown,
  fastForwardCooldown,
  setDirectEmailInstant,
  EmailChangeRequest,
  COOLDOWN_DURATION_MS,
} from '../utils/emailVerification';
import { AsyncStorage, STORAGE_KEYS } from '../utils/storage';

interface GmailSecurityCardProps {
  lang: Language;
  currentEmail?: string;
  onEmailChanged?: (newActiveEmail: string) => void;
  className?: string;
  onSecurityLog?: (event: Omit<DispatchEvent, 'id'>) => void;
}

export const GmailSecurityCard: React.FC<GmailSecurityCardProps> = ({
  lang,
  currentEmail = 'adz79112@gmail.com',
  onEmailChanged,
  className = '',
  onSecurityLog,
}) => {
  // Security state
  const [activeEmail, setActiveEmail] = useState<string>(currentEmail || 'adz79112@gmail.com');
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [changeRequest, setChangeRequest] = useState<EmailChangeRequest | null>(null);
  const [remainingCooldownMs, setRemainingCooldownMs] = useState<number>(0);

  // Verification flow state (Initial bind)
  const [isVerifyingInitial, setIsVerifyingInitial] = useState(false);
  const [initialInputEmail, setInitialInputEmail] = useState(currentEmail || 'adz79112@gmail.com');
  const [initialOtpCode, setInitialOtpCode] = useState('');
  const [initialUserEnteredOtp, setInitialUserEnteredOtp] = useState('');
  const [initialOtpSent, setInitialOtpSent] = useState(false);
  const [isSendingInitialOtp, setIsSendingInitialOtp] = useState(false);
  const [initialOtpError, setInitialOtpError] = useState<string | null>(null);
  const [initialSuccessMessage, setInitialSuccessMessage] = useState<string | null>(null);

  // Change request flow state (Modifying verified email)
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeStep, setChangeStep] = useState<'request_otp' | 'enter_otp_and_new_email'>('request_otp');
  const [changeOtpCode, setChangeOtpCode] = useState('');
  const [changeUserEnteredOtp, setChangeUserEnteredOtp] = useState('');
  const [newRequestedEmail, setNewRequestedEmail] = useState('');
  const [isSendingChangeOtp, setIsSendingChangeOtp] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  // Helper UI states
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Load state on mount
  const refreshSecurityState = async () => {
    const state = await loadEmailSecurityState(currentEmail || 'adz79112@gmail.com');
    setActiveEmail(state.currentEmail);
    setIsVerified(state.isVerified);
    setChangeRequest(state.changeRequest);
    setRemainingCooldownMs(state.remainingCooldownMs);
    onEmailChanged?.(state.currentEmail);
  };

  useEffect(() => {
    refreshSecurityState();
  }, [currentEmail]);

  // Real-time Countdown Timer for 72-Hour Cooldown
  useEffect(() => {
    if (!changeRequest || changeRequest.status !== 'pending') {
      return;
    }

    const interval = setInterval(async () => {
      const elapsed = Date.now() - changeRequest.requestedAt;
      const total = changeRequest.cooldownDurationMs || COOLDOWN_DURATION_MS;
      const left = Math.max(0, total - elapsed);

      setRemainingCooldownMs(left);

      if (left <= 0) {
        clearInterval(interval);
        // Cooldown has naturally expired! Refresh to auto-finalize
        await refreshSecurityState();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [changeRequest]);

  // Format milliseconds into human readable Days, Hours, Minutes, Seconds
  const formatRemainingTime = (ms: number) => {
    if (ms <= 0) return translateInline(lang, '00:00:00 (Completed)', '00:00:00 (اكتملت المهلة)');
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (lang === 'ar') {
      if (days > 0) {
        return `${translateInline(lang, '${days} days and ${pad(hours)}:${pad(minutes)}:${pad(seconds)}', '${days} يوم و ${pad(hours)}:${pad(minutes)}:${pad(seconds)}')}`;
      }
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    } else {
      if (days > 0) {
        return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
      }
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
  };

  // -------------------------------------------------------------
  // 1. INITIAL BIND / VERIFICATION FLOW
  // -------------------------------------------------------------
  const handleStartInitialVerification = async () => {
    const emailToVerify = initialInputEmail.trim();
    if (!emailToVerify || !emailToVerify.includes('@')) {
      setInitialOtpError(
        translateInline(lang, 'Please enter a valid email address!', 'يرجى إدخال عنوان بريد إلكتروني صالح!')
      );
      return;
    }

    setIsSendingInitialOtp(true);
    setInitialOtpError(null);

    const otp = generateOTP();
    setInitialOtpCode(otp);

    const result = await sendVerificationEmail(emailToVerify, otp, 'bind');
    setIsSendingInitialOtp(false);

    if (result.ok) {
      setInitialOtpSent(true);
      setIsVerifyingInitial(true);
      setInitialSuccessMessage(
        lang === 'ar'
          ? `${translateInline(lang, 'OTP sent to ${emailToVerify}', 'تم إرسال رمز التأكيد (OTP) إلى ${emailToVerify}')}`
          : `Verification code (OTP) dispatched to ${emailToVerify}`
      );
    } else {
      setInitialOtpError(result.message);
    }
  };

  const handleConfirmInitialOtp = async () => {
    setInitialOtpError(null);
    if (!initialUserEnteredOtp.trim()) {
      setInitialOtpError(translateInline(lang, 'Please enter the OTP!', 'يرجى إدخال رمز التأكيد!'));
      return;
    }

    if (initialUserEnteredOtp.trim() !== initialOtpCode.trim()) {
      setInitialOtpError(
        translateInline(lang, 'Invalid OTP code! Please check the code.', 'رمز التأكيد غير صحيح! يرجى التأكد من الرمز المدخل.')
      );
      return;
    }

    // Success! Bind email
    await confirmEmailVerification(initialInputEmail.trim());
    await refreshSecurityState();
    setIsVerifyingInitial(false);
    setInitialOtpSent(false);
    setInitialUserEnteredOtp('');
    setInitialSuccessMessage(
      translateInline(lang, '✓ Email verified & bound successfully!', '✓ تم تأكيد وربط البريد الإلكتروني بنجاح!')
    );

    setTimeout(() => {
      setInitialSuccessMessage(null);
    }, 4000);
  };

  // -------------------------------------------------------------
  // 2. CHANGE REQUEST & 72-HOUR COOLDOWN FLOW
  // -------------------------------------------------------------
  const handleOpenChangeModal = () => {
    setIsChangeModalOpen(true);
    setChangeStep('request_otp');
    setChangeError(null);
    setChangeUserEnteredOtp('');
    setNewRequestedEmail('');
  };

  const handleSendChangeOtpToOldEmail = async () => {
    setIsSendingChangeOtp(true);
    setChangeError(null);

    const otp = generateOTP();
    setChangeOtpCode(otp);

    const result = await sendVerificationEmail(activeEmail, otp, 'change_request_old_email');
    setIsSendingChangeOtp(false);

    if (result.ok) {
      setChangeStep('enter_otp_and_new_email');
    } else {
      setChangeError(result.message);
    }
  };

  const handleConfirmChangeAndStartCooldown = async () => {
    setChangeError(null);

    if (!changeUserEnteredOtp.trim()) {
      setChangeError(translateInline(lang, 'Please enter the OTP sent to old email!', 'يرجى إدخال رمز التأكيد المرسل للبريد القديم!'));
      return;
    }

    if (changeUserEnteredOtp.trim() !== changeOtpCode.trim()) {
      setChangeError(
        translateInline(lang, 'Invalid OTP! Cannot initiate change without old email approval.', 'رمز التأكيد غير صحيح! لا يمكن بدء طلب التغيير بدون موافقة البريد الحالي.')
      );
      return;
    }

    const cleanNew = newRequestedEmail.trim();
    if (!cleanNew || !cleanNew.includes('@')) {
      setChangeError(
        translateInline(lang, 'Please enter a valid new email address!', 'يرجى إدخال عنوان البريد الإلكتروني الجديد الصالح!')
      );
      return;
    }

    if (cleanNew.toLowerCase() === activeEmail.toLowerCase()) {
      setChangeError(
        translateInline(lang, 'New email is identical to current active email!', 'البريد الجديد هو نفس البريد الحالي بالفعل!')
      );
      return;
    }

    // Start 72-hour Cooldown
    await initiateEmailChangeCooldown(activeEmail, cleanNew);
    await refreshSecurityState();
    setIsChangeModalOpen(false);
  };

  // Cancel Change Request (retains old email)
  const handleCancelCooldown = async () => {
    // 1. Identify the legitimate old email
    const oldEmail = (changeRequest?.currentEmail || activeEmail || 'adz79112@gmail.com').trim();

    // 2. Immediately update state so the yellow 72-hour lock box disappears instantly
    setChangeRequest(null);
    setRemainingCooldownMs(0);
    setActiveEmail(oldEmail);
    setIsVerified(true);
    onEmailChanged?.(oldEmail);

    // 3. Clear pending change request and countdown from AsyncStorage & preserve old email
    await cancelEmailChangeCooldown();
    await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, oldEmail);
    await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_VERIFIED, 'true');
    await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL_CHANGE_REQUEST);

    // 4. Show clear instant feedback notice
    setInitialSuccessMessage(
      lang === 'ar'
        ? `${translateInline(lang, '✓ Change request cancelled immediately. Kept (${oldEmail}) as active and verified DroidGuard alerts email.', '✓ تم إلغاء طلب التغيير فوراً والاحتفاظ بالبريد (${oldEmail}) كبريد نشط ومعتمد لتنبيهات DroidGuard.')}`
        : `✓ Change request cancelled! Retained (${oldEmail}) as active verified recipient for DroidGuard.`
    );
    setTimeout(() => {
      setInitialSuccessMessage(null);
    }, 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-mono-code font-bold text-red-300 block">
              {translateInline(lang, 'Emergency User Gmail (Stealth Reports)', 'بريد الطوارئ (Gmail) للتقارير الشاملة')}
            </span>
            <span className="text-[10px] text-slate-400 hidden">
              {translateInline(lang, 'Receives live GPS link & stealth photos on #TRACK command', 'يستقبل رابط GPS وصور الكاميرا الأمامية عند استلام الأمر (#TRACK)')}
            </span>
          </div>
        </div>

        {/* Verification & 72h Cooldown Badges */}
        <div className="flex items-center gap-2">
          {/* 72h Cooldown Badge */}
          <span className="text-[10px] font-mono-code text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{translateInline(lang, '72h Lock Protected', 'محمي بقفل 72 ساعة')}</span>
          </span>

          {/* Verified Badge */}
          {isVerified ? (
            <span className="text-[10px] font-mono-code text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{translateInline(lang, 'Verified & Bound', 'Verified / تم الربط')}</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono-code text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>{translateInline(lang, 'Unverified', 'غير موثق')}</span>
            </span>
          )}
        </div>
      </div>

      {/* SUCCESS NOTIFICATION BANNER */}
      {initialSuccessMessage && (
        <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{initialSuccessMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. ACTIVE 72-HOUR COOLDOWN WARNING & COUNTDOWN BANNER */}
      {/* ======================================================== */}
      {changeRequest && changeRequest.status === 'pending' && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-2 border-amber-500/40 shadow-lg space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span>
                {translateInline(lang, '⚠️ Email Change Request Pending (72-Hour Security Cooldown)', '⚠️ طلب تغيير البريد قيد الانتظار الأمني (فترة الحظر 72 ساعة)')}
              </span>
            </div>
            <span className="text-[10px] font-mono-code text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              {formatRemainingTime(remainingCooldownMs)}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {translateInline(lang, 'During this 72-hour period, the OLD email remains active for all DroidGuard alerts and intruder photos, protecting against unauthorized theft redirects.', 'خلال هذه الفترة الأمنية، يظل البريد القديم هو البريد النشط الفعّال لكافة تنبيهات DroidGuard وصور المتسلل، وذلك لمنع أي سارق من تحويل مسار التنبيهات.')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono-code">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">
                {translateInline(lang, 'Current Active Recipient:', 'البريد النشط حالياً (يستقبل التقارير):')}
              </span>
              <span className="text-emerald-400 font-bold break-all">{changeRequest.currentEmail}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/30">
              <span className="text-amber-400 block text-[10px]">
                {translateInline(lang, 'Pending New Email:', 'البريد الجديد المطلوب (قيد الانتظار):')}
              </span>
              <span className="text-slate-300 font-bold break-all">{changeRequest.pendingNewEmail}</span>
            </div>
          </div>

          {/* Action buttons during cooldown */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <button
              type="button"
              id="btn-cancel-email-change"
              onClick={handleCancelCooldown}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-mono-code flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{translateInline(lang, 'Cancel Request & Keep Old Email', 'إلغاء طلب التغيير فوراً والاحتفاظ بالبريد القديم')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CURRENT EMAIL DISPLAY & CHANGE TRIGGER */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono-code text-slate-300 font-semibold flex items-center gap-1.5">
            {isVerified ? (
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Mail className="w-3.5 h-3.5 text-red-400" />
            )}
            <span>
              {isVerified
                ? translateInline(lang, 'Verified & Bound Email Address:', 'عنوان البريد الموثق والمربوط بالنظام:')
                : translateInline(lang, 'Enter Email Address for Verification:', 'أدخل البريد الإلكتروني للربط والتأكيد:')}
            </span>
          </label>

          <div className="flex items-center gap-3">
            {isVerified && !changeRequest && (
              <button
                type="button"
                onClick={handleOpenChangeModal}
                className="text-[11px] font-mono-code text-amber-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer underline underline-offset-4"
              >
                <KeyRound className="w-3 h-3" />
                <span>{translateInline(lang, 'Request Email Change', 'طلب تغيير البريد')}</span>
              </button>
            )}
          </div>
        </div>

        {/* The Email Input Bar */}
        <div className="relative flex items-center">
          <input
            type="email"
            value={isVerified ? activeEmail : initialInputEmail}
            onChange={(e) => {
              if (!isVerified) {
                setInitialInputEmail(e.target.value);
              }
            }}
            readOnly={isVerified}
            placeholder="adz79112@gmail.com"
            className={`w-full rounded-2xl px-4 py-3 pl-10 text-sm font-mono-code transition focus:outline-none ${
              isVerified
                ? 'bg-slate-950/80 border border-emerald-500/30 text-emerald-300 cursor-not-allowed select-all'
                : 'bg-slate-950 border border-red-500/40 text-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-400'
            }`}
            dir="ltr"
          />

          {isVerified && (
            <div className="absolute top-1/2 -translate-y-1/2 left-3 flex items-center justify-center" title="Fully Enabled & Ready">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
          )}

          {isVerified && (
            <div className="absolute right-3 rtl:left-3 rtl:right-auto flex items-center gap-1 text-[11px] font-mono-code text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{translateInline(lang, 'Locked', 'مربوط ومحمي')}</span>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. INITIAL BIND BUTTON & OTP VERIFICATION FORM */}
        {/* ======================================================== */}
        {!isVerified && (
          <div className="pt-2 space-y-3">
            {!isVerifyingInitial ? (
              <button
                type="button"
                id="btn-bind-gmail"
                onClick={handleStartInitialVerification}
                disabled={isSendingInitialOtp}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-mono-code font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 transition cursor-pointer disabled:opacity-50"
              >
                {isSendingInitialOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{translateInline(lang, 'Sending Verification Code...', 'جاري إرسال رمز التحقق...')}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{translateInline(lang, 'Confirm & Bind Email', 'تأكيد وربط البريد الإلكتروني')}</span>
                  </>
                )}
              </button>
            ) : (
              /* OTP Entry Box */
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-red-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-red-400" />
                    <span>{translateInline(lang, 'Enter 6-Digit OTP Code:', 'أدخل رمز التأكيد (OTP من 6 أرقام):')}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono-code">
                    {translateInline(lang, 'Sent to:', 'أرسل إلى:')} {initialInputEmail}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={initialUserEnteredOtp}
                    onChange={(e) => setInitialUserEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-center text-lg font-mono-code text-emerald-300 tracking-widest focus:outline-none focus:border-red-400 transition"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmInitialOtp}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono-code text-xs font-bold transition shrink-0 cursor-pointer shadow-md shadow-emerald-950/50"
                  >
                    {translateInline(lang, 'Confirm', 'تأكيد')}
                  </button>
                </div>

                {initialOtpError && (
                  <p className="text-[11px] text-rose-400 font-mono-code flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>{initialOtpError}</span>
                  </p>
                )}

                <div className="flex justify-between items-center text-[10px] pt-1">
                  <button
                    type="button"
                    onClick={handleStartInitialVerification}
                    disabled={isSendingInitialOtp}
                    className="text-slate-400 hover:text-slate-200 transition underline cursor-pointer"
                  >
                    {translateInline(lang, 'Resend Code', 'إعادة إرسال الرمز')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVerifyingInitial(false)}
                    className="text-rose-400 hover:text-rose-300 transition cursor-pointer"
                  >
                    {translateInline(lang, 'Cancel', 'إلغاء')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL / DIALOG: SECURE EMAIL CHANGE & 72-HOUR LOCK */}
      {/* ======================================================== */}
      {isChangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>
                  {translateInline(lang, 'Security Protocol: Request Change of Verified Email', 'إجراء أمني: طلب تغيير بريد التنبيهات الموثق')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
              {translateInline(lang, '🛡️ To prevent theft tampering, immediate change is forbidden. You must approve using an OTP sent to your old email, followed by a mandatory 72-hour security cooldown.', '🛡️ لحماية جهازك من السرقة والعبث، لا يمكن تغيير البريد فورياً. يتطلب ذلك رمز تأكيد من البريد القديم الحالي، ثم تبدأ فترة حظر أمني لمدة 3 أيام (72 ساعة) يظل فيها البريد الحالي مستقبلاً لكافة البلاغات.')}
            </div>

            {/* STEP 1: SEND OTP TO CURRENT OLD EMAIL */}
            {changeStep === 'request_otp' && (
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[11px]">
                    {translateInline(lang, 'Current registered email receiving OTP:', 'البريد الحالي المسجل الذي سيستلم رمز الموافقة:')}
                  </span>
                  <span className="text-emerald-400 font-mono-code font-bold text-sm">{activeEmail}</span>
                </div>

                <button
                  type="button"
                  onClick={handleSendChangeOtpToOldEmail}
                  disabled={isSendingChangeOtp}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-mono-code font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition cursor-pointer disabled:opacity-50"
                >
                  {isSendingChangeOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{translateInline(lang, 'Sending Approval OTP...', 'جاري إرسال رمز الموافقة...')}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>
                        {translateInline(lang, 'Send Approval OTP to Current Email', 'إرسال رمز التأكيد (OTP) إلى البريد الحالي')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: ENTER OTP & NEW EMAIL */}
            {changeStep === 'enter_otp_and_new_email' && (
              <div className="space-y-4 py-2">
                {/* OTP Input */}
                <div>
                  <label className="block text-xs font-mono-code text-slate-300 mb-1.5">
                    {translateInline(lang, '1. Enter approval OTP from old email:', '1. أدخل رمز التأكيد الوارد لبريدك الحالي:')}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={changeUserEnteredOtp}
                    onChange={(e) => setChangeUserEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-base font-mono-code text-amber-300 tracking-widest focus:outline-none focus:border-amber-400 transition"
                    dir="ltr"
                  />
                </div>

                {/* New Email Input */}
                <div>
                  <label className="block text-xs font-mono-code text-slate-300 mb-1.5">
                    {translateInline(lang, '2. Enter requested new Gmail address:', '2. أدخل عنوان بريد Gmail الجديد المطلوب:')}
                  </label>
                  <input
                    type="email"
                    value={newRequestedEmail}
                    onChange={(e) => setNewRequestedEmail(e.target.value)}
                    placeholder="new.email@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono-code text-red-200 focus:outline-none focus:border-amber-400 transition"
                    dir="ltr"
                  />
                </div>

                {changeError && (
                  <p className="text-xs text-rose-400 font-mono-code flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{changeError}</span>
                  </p>
                )}

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p className="text-amber-300 font-semibold">
                    {translateInline(lang, 'What happens after approval?', 'ماذا سيحدث بعد التأكيد؟')}
                  </p>
                  <p>
                    {translateInline(lang, '• A 72-hour (3-day) countdown begins.', '• سيبدأ عداد تنازلي لمدة 72 ساعة (3 أيام).')}
                  </p>
                  <p>
                    {translateInline(lang, '• The old email continues receiving all stealth alerts and photos on #TRACK.', '• يستمر البريد القديم في استلام كل تقارير وصور السارق في حال إرسال #TRACK.')}
                  </p>
                  <p>
                    {translateInline(lang, '• You can cancel the request at any time.', '• يمكنك إلغاء الطلب في أي لحظة من الواجهة.')}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setChangeStep('request_otp')}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition cursor-pointer"
                  >
                    {translateInline(lang, 'Back', 'رجوع')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmChangeAndStartCooldown}
                    className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-mono-code font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40 transition cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{translateInline(lang, 'Start 72h Cooldown', 'بدء فترة القفل (72 ساعة)')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
