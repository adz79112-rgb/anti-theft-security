import React, { useState, useEffect } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Bot,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Smartphone,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { SecurityConfig, Language, IntruderCapture, DispatchEvent } from '../types';
import { AsyncStorage, STORAGE_KEYS } from '../utils/storage';
import { DEFAULT_BOT_TOKEN } from '../utils/telegram';
import { GmailSecurityCard } from './GmailSecurityCard';

interface CyberpunkConsoleProps {
  config: SecurityConfig;
  onChangeConfig: (newConfig: SecurityConfig) => void;
  lang: Language;
  onLogDispatch: (event: Omit<DispatchEvent, 'id'>) => void;
  onSaveCapture: (capture: Omit<IntruderCapture, 'id'>) => void;
}

export const CyberpunkConsole: React.FC<CyberpunkConsoleProps> = ({
  config,
  onChangeConfig,
  lang,
  onLogDispatch,
  onSaveCapture,
}) => {
  const [chatId, setChatId] = useState<string>(config.telegramChatId || '');
  const [userEmail, setUserEmail] = useState<string>(config.userEmail || 'adz79112@gmail.com');
  const [isSavedInStorage, setIsSavedInStorage] = useState(false);
  const [isEmailSavedInStorage, setIsEmailSavedInStorage] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load Chat ID & Email from AsyncStorage on initial mount
  useEffect(() => {
    async function loadSavedData() {
      try {
        const savedChatId = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ID);
        if (savedChatId && savedChatId.trim()) {
          setChatId(savedChatId.trim());
          setIsSavedInStorage(true);
        }

        const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
        if (savedEmail && savedEmail.trim()) {
          setUserEmail(savedEmail.trim());
          setIsEmailSavedInStorage(true);
        } else {
          // Default provided email
          const defaultMail = 'adz79112@gmail.com';
          setUserEmail(defaultMail);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, defaultMail);
          setIsEmailSavedInStorage(true);
        }
      } catch (err) {
        console.warn('Failed to load credentials from AsyncStorage', err);
      }
    }
    loadSavedData();
  }, []);

  // Handle Chat ID change & persist to AsyncStorage
  const handleChatIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setChatId(val);

    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_ID, val);
    setIsSavedInStorage(Boolean(val));

    onChangeConfig({
      ...config,
      telegramChatId: val,
      telegramBotToken: config.telegramBotToken || DEFAULT_BOT_TOKEN,
      telegramAlertsEnabled: Boolean(val),
    });
  };

  // Handle Gmail change & persist to AsyncStorage
  const handleEmailChanged = (newActiveEmail: string) => {
    setUserEmail(newActiveEmail);
    setIsEmailSavedInStorage(Boolean(newActiveEmail));

    onChangeConfig({
      ...config,
      userEmail: newActiveEmail,
    });
  };

  // Toggle master protection
  const handleToggleProtection = () => {
    const nextState = !config.isProtectionActive;
    onChangeConfig({
      ...config,
      isProtectionActive: nextState,
    });
  };

  const handleCopyTriggerCode = () => {
    const code = config.triggerCommand || '#TRACK';
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isArmed = config.isProtectionActive;
  const triggerCommand = config.triggerCommand || '#TRACK';

  return (
    <div
      id="cyberpunk-control-console"
      className="relative rounded-3xl bg-slate-950 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 p-5 sm:p-7 overflow-hidden font-sans"
    >
      {/* High-tech Cyberpunk Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#00f0ff15_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff15_1px,transparent_1px)] bg-[size:24px_24px]"
      />

      {/* Futuristic Corner Brackets */}
      <div className="absolute top-2 left-2 text-[10px] font-mono-code text-cyan-500/40 select-none">
        [COMMAND_DRIVEN_v3.0]
      </div>
      <div className="absolute top-2 right-2 text-[10px] font-mono-code text-cyan-500/40 select-none">
        [NO_AUTOMATIC_NOISE]
      </div>
      <div className="absolute bottom-2 left-2 text-[10px] font-mono-code text-cyan-500/30 select-none">
        [GPS_LOCK: STANDBY]
      </div>
      <div className="absolute bottom-2 right-2 text-[10px] font-mono-code text-cyan-500/30 select-none">
        [ASYNC_STORAGE: SYNCED]
      </div>

      {/* Cyberpunk Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 shadow-inner">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-code text-cyan-400 tracking-wider uppercase font-bold">
                DROIDGUARD COMMAND CORE
              </span>
              <span
                className={`text-[10px] font-mono-code px-2 py-0.5 rounded border uppercase font-bold ${
                  isArmed
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 animate-pulse'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                }`}
              >
                {isArmed ? 'ARMED • COMMANDS ONLY' : 'STANDBY'}
              </span>
              <span
                id="cyberpunk-anti-uninstall-active-badge"
                className="text-[10px] font-mono-code px-2 py-0.5 rounded border uppercase font-bold bg-emerald-950/80 text-emerald-300 border-emerald-500/50 flex items-center gap-1 shadow-sm shadow-emerald-950/40"
              >
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Anti-Uninstall Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {translateInline(lang, 'Stealth Command-Based Alert Daemon (Zero noisy automatic alarms)', 'نظام أمني خفي يعمل بالأوامر السرية حصراً (بدون إنذارات تلقائية عشوائية)')}
            </p>
          </div>
        </div>

        {/* Trigger Secret Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
          <span className="text-[11px] font-mono-code text-slate-400">
            {translateInline(lang, 'Trigger Command:', 'الأمر السري:')}
          </span>
          <span className="text-xs font-mono-code font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
            {triggerCommand}
          </span>
          <button
            id="copy-trigger-code-btn"
            onClick={handleCopyTriggerCode}
            className="text-slate-400 hover:text-cyan-300 transition p-1"
            title={translateInline(lang, 'Copy Code', 'نسخ الكود')}
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Zero Automatic Alert Notice Bar */}
      <div className="mb-6 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200/90 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>
          {translateInline(lang, '✓ All automated ambient alarms cancelled. DroidGuard responds strictly to secret trigger commands (#TRACK).', '✓ تم إلغاء كافة الإنذارات التلقائية (مثل إدخال الرمز الخاطئ أو فتح الشاشة). النظام يستجيب فقط عند استلام الأمر السري (#TRACK) لضمان الخصوصية والسرية التامة.')}
        </span>
      </div>

      {/* Main Grid: Master Shield Button (Left) & Settings Inputs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* 1. CYBERPUNK MASTER SHIELD BUTTON (زر الحماية) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900/50 border border-slate-800 rounded-3xl relative overflow-hidden h-full">
          {/* Circular Radar Scan Line */}
          {isArmed && (
            <div className="absolute w-56 h-56 rounded-full border border-cyan-500/20 animate-ping opacity-25 pointer-events-none" />
          )}

          <div className="relative my-4">
            {/* Outer Glow Halo */}
            <div
              className={`absolute -inset-4 rounded-full blur-xl transition-all duration-700 pointer-events-none ${
                isArmed ? 'bg-cyan-500/30' : 'bg-rose-500/20'
              }`}
            />

            {/* Main Interactive Cyberpunk Shield Button */}
            <button
              id="cyberpunk-master-shield-btn"
              type="button"
              onClick={handleToggleProtection}
              className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 relative z-10 border-4 focus:outline-none cursor-pointer shadow-2xl active:scale-95 ${
                isArmed
                  ? 'bg-gradient-to-br from-cyan-950 via-slate-900 to-emerald-950 border-cyan-400 text-cyan-300 shadow-cyan-500/40 hover:border-cyan-300'
                  : 'bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950 border-rose-500/60 text-rose-400 shadow-rose-950 hover:border-rose-400'
              }`}
            >
              {isArmed ? (
                <>
                  <ShieldCheck className="w-12 h-12 text-cyan-300 drop-shadow-[0_0_12px_#00f0ff] animate-pulse mb-1" />
                  <span className="text-[11px] font-mono-code font-black tracking-wider uppercase text-cyan-200">
                    {translateInline(lang, 'ARMED', 'الحماية نشطة')}
                  </span>
                  <span className="text-[9px] font-mono-code text-cyan-400/80">
                    {translateInline(lang, 'CLICK TO DISARM', 'انقر للتعطيل')}
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-12 h-12 text-rose-400 drop-shadow-[0_0_10px_#f43f5e] mb-1" />
                  <span className="text-[11px] font-mono-code font-black tracking-wider uppercase text-rose-300">
                    {translateInline(lang, 'STANDBY', 'الحماية متوقفة')}
                  </span>
                  <span className="text-[9px] font-mono-code text-rose-400/80">
                    {translateInline(lang, 'CLICK TO ARM', 'انقر للتفعيل')}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-3">
            <p className="text-xs font-mono-code text-slate-300 font-semibold">
              {isArmed
                ? translateInline(lang, 'Listener active waiting for #TRACK command', 'المستمع النشط ينتظر الأمر السري (#TRACK)')
                : translateInline(lang, 'Surveillance daemon paused', 'النظام في وضع السكون المؤقت')}
            </p>
            <p className="text-[10px] font-mono-code text-slate-500 mt-1">
              {isArmed
                ? 'Command-Driven • Silent Response Ready'
                : 'Activate to enable SMS / Command listener'}
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. SETTINGS & CHANNELS CONFIG (Gmail + Telegram + Bot) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* USER GMAIL VERIFICATION & 72-HOUR COOLDOWN PROTECTION */}
          <GmailSecurityCard
            lang={lang}
            currentEmail={userEmail}
            onEmailChanged={handleEmailChanged}
          />

          {/* TELEGRAM CHAT ID INPUT (Saved in AsyncStorage) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="cyberpunk-chat-id-input"
                className="text-xs font-mono-code font-bold text-cyan-300 flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>{translateInline(lang, 'Telegram Chat ID (Optional):', 'معرّف تليجرام (Telegram Chat ID) - اختياري:')}</span>
              </label>

              <div className="flex items-center gap-2">
                {isSavedInStorage && (
                  <span className="text-[10px] font-mono-code text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>AsyncStorage</span>
                  </span>
                )}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-sky-400 hover:text-sky-300 transition flex items-center gap-1"
                >
                  <span>@userinfobot</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            <div className="relative">
              <input
                id="cyberpunk-chat-id-input"
                type="text"
                value={chatId}
                onChange={handleChatIdChange}
                placeholder={translateInline(lang, 'Enter Telegram Chat ID', 'أدخل Chat ID لحسابك (مثال: 987654321)')}
                className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-2.5 text-sm font-mono-code text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {translateInline(lang, '🤖 Sends the same photo & GPS pin to Telegram if configured.', '🤖 إرسال نفس التقرير والصورة إلى حساب التليجرام إذا كان مفاداً في الإعدادات.')}
            </p>
          </div>

          {/* Bot Token Information (Default constant) */}
          <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  {translateInline(lang, 'Default Bot Token', 'الموثق الافتراضي (BOT TOKEN)')}
                </span>
                <span className="text-[11px] font-mono-code text-sky-400/90 block">
                  8818517549:AAF7e5ziw...Nh-ZhI
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono-code bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              VERIFIED BOT ✅
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
