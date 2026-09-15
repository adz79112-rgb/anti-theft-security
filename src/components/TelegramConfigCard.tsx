import React, { useState } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react';
import { SecurityConfig, Language } from '../types';
import {
  DEFAULT_BOT_TOKEN,
  fetchLatestTelegramChatId,
} from '../utils/telegram';
import { AsyncStorage, STORAGE_KEYS } from '../utils/storage';

interface TelegramConfigCardProps {
  config: SecurityConfig;
  onChangeConfig: (newConfig: SecurityConfig) => void;
  lang: Language;
}

export const TelegramConfigCard: React.FC<TelegramConfigCardProps> = ({
  config,
  onChangeConfig,
  lang,
}) => {
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isConfigured = Boolean(config.telegramChatId);
  const isEnabled = Boolean(config.telegramAlertsEnabled);

  const handleToggleAlerts = () => {
    onChangeConfig({
      ...config,
      telegramAlertsEnabled: !config.telegramAlertsEnabled,
    });
  };

  const handleChatIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setTestResult(null);
    AsyncStorage.setItem(STORAGE_KEYS.CHAT_ID, val);
    onChangeConfig({
      ...config,
      telegramChatId: val,
      telegramBotToken: config.telegramBotToken || DEFAULT_BOT_TOKEN,
    });
  };

  // Auto detect Chat ID from bot updates
  const handleAutoDetectChatId = async () => {
    setIsAutoDetecting(true);
    setTestResult(null);
    const token = config.telegramBotToken || DEFAULT_BOT_TOKEN;

    try {
      const detectResult = await fetchLatestTelegramChatId(token);
      if (detectResult.found && detectResult.chatId) {
        AsyncStorage.setItem(STORAGE_KEYS.CHAT_ID, detectResult.chatId);
        onChangeConfig({
          ...config,
          telegramChatId: detectResult.chatId,
          telegramAlertsEnabled: true,
          telegramBotToken: token,
        });
        setTestResult({
          ok: true,
          message: detectResult.message,
        });
      } else {
        setTestResult({
          ok: false,
          message: detectResult.message,
        });
      }
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'تعذر فحص تحديثات البوت',
      });
    } finally {
      setIsAutoDetecting(false);
    }
  };

  return (
    <div
      id="telegram-config-card"
      className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden"
    >
      {/* Decorative subtle gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                {translateInline(lang, 'Telegram Bot Instant Notifications', 'ربط تليجرام للإشعارات الفورية')}
              </h3>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  isEnabled && isConfigured
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isEnabled && isConfigured
                  ? translateInline(lang, 'Active', 'متصل ونشط')
                  : translateInline(lang, 'Inactive', 'غير مفعل')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {translateInline(
                lang,
                'Receive real-time theft alerts, GPS links, and front-cam intruder snapshots via Telegram',
                'استلام تنبيهات السرقة الحية، إحداثيات GPS المباشرة، وصور الكاميرا فوراً على هاتفك'
              )}
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3">
          <button
            id="toggle-telegram-alerts"
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={handleToggleAlerts}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 cursor-pointer ${
              isEnabled ? 'bg-sky-500' : 'bg-slate-700'
            }`}
            title={translateInline(lang, 'Toggle Telegram Alerts', 'تبديل تفعيل إشعارات تليجرام')}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                isEnabled ? 'translate-x-0' : '-translate-x-6'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Configuration Area */}
      <div className="mb-5 space-y-4">
        {/* Prominent Bot Link & Auto-Connect */}
        <div className="p-4 bg-sky-950/40 border border-sky-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-300 text-center sm:text-start leading-relaxed space-y-1">
            <p className="font-bold text-sky-300 flex items-center gap-1.5 justify-center sm:justify-start">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>{translateInline(lang, 'Step 1: Open bot & press Start', 'الخطوة 1: افتح البوت واضغط Start')}</span>
            </p>
            <p className="text-[11px] text-slate-400">
              {translateInline(
                lang,
                'Open @droidguard_alarm_bot in Telegram, press Start, then click Auto-Detect below.',
                'افتح البوت @droidguard_alarm_bot في تليجرام، اضغط Start، ثم انقر على زر الكشف التلقائي بالأسفل.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://t.me/droidguard_alarm_bot"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-sky-600/30"
            >
              <Bot className="w-4 h-4" />
              <span>@droidguard_alarm_bot</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              id="btn-auto-detect-chat-id"
              onClick={handleAutoDetectChatId}
              disabled={isAutoDetecting}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              {isAutoDetecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{translateInline(lang, 'Detecting...', 'جارٍ الكشف...')}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{translateInline(lang, 'Auto-Detect Chat ID', '⚡ كشف وربط حسابي تلقائياً')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CHAT ID Input */}
        <div className="relative">
          <label
            htmlFor="telegram-chat-id"
            className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5"
          >
            <span>{translateInline(lang, 'Chat ID (User ID)', 'معرف المحادثة (Chat ID)')}</span>
            {config.telegramChatId && (
              <span className="text-[10px] font-mono-code text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                ✓ {translateInline(lang, 'Connected', 'تم التعرف عليه')}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="telegram-chat-id"
              type="text"
              value={config.telegramChatId || ''}
              onChange={handleChatIdChange}
              placeholder="مثال: 123456789"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 pl-10 text-emerald-300 font-mono-code text-sm focus:outline-none focus:border-cyan-500 transition"
              dir="ltr"
            />
            {isEnabled && isConfigured && (
              <div className="absolute top-1/2 -translate-y-1/2 left-3 flex items-center justify-center" title="Fully Enabled & Ready">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {translateInline(
              lang,
              'Enter your Telegram ID manually or click Auto-Detect after sending any message to the bot.',
              'أدخل معرفك يدوياً أو اضغط على زر الكشف التلقائي بالأعلى بعد إرسال أي رسالة للبوت.'
            )}
          </p>
        </div>
      </div>

      {/* Status Confirmation & Active Protection Info */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {translateInline(
              lang,
              'Zero SMS cost • Instant alerts with front photo & GPS',
              'بدون تكلفة رسائل • وصول فوري للصورة وإحداثيات GPS'
            )}
          </span>
        </div>

        {config.telegramChatId && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{translateInline(lang, 'Bot Ready for Live Alerts', 'البوت جاهز لاستقبال البلاغات')}</span>
          </div>
        )}
      </div>

      {/* Detection Feedback Banner */}
      {testResult && (
        <div
          id="telegram-test-result-banner"
          className={`mt-4 p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
            testResult.ok
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {testResult.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-bold">{testResult.message}</p>
            {testResult.ok && (
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                {translateInline(
                  lang,
                  'Telegram channel verified! Live theft triggers will immediately arrive here.',
                  'تم ربط وتأكيد تليجرام بنجاح! كافة بلاغات السرقة والصور والمواقع ستصلك مباشرة.'
                )}
              </p>
            )}
            {!testResult.ok && (
              <p className="text-[11px] text-rose-400/80 mt-0.5">
                {translateInline(
                  lang,
                  'Make sure you have pressed Start (/start) in @droidguard_alarm_bot first.',
                  'تأكد أنك قمت بفتح البوت @droidguard_alarm_bot والضغط على زر (Start) أولاً في تليجرام ثم إعادة المحاولة.'
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
