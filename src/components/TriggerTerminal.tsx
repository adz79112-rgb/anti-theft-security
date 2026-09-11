import React, { useState } from 'react';
import { translateInline } from '../utils/translateInline';
import { Terminal, Send, CheckCircle, AlertCircle, Sparkles, PhoneCall, RefreshCw } from 'lucide-react';
import { SecurityConfig, ParsedTrigger, Language } from '../types';
import { parseTriggerMessage } from '../utils/parser';
import { getTranslation } from '../utils/translations';

interface TriggerTerminalProps {
  config: SecurityConfig;
  onExecuteTrigger: (parsed: ParsedTrigger) => void;
  lang: Language;
}



export const TriggerTerminal: React.FC<TriggerTerminalProps> = ({ config, onExecuteTrigger, lang }) => {
  const SAMPLE_SENDERS = [
    { label: translateInline(lang, 'Phone 1', 'رقم هاتف 1'), number: '+966 55 123 4567' },
    { label: translateInline(lang, 'Phone 2', 'رقم هاتف 2'), number: '+970 59 876 5432' },
    { label: translateInline(lang, 'Phone 3', 'رقم هاتف 3'), number: '+20 100 444 8888' },
    { label: translateInline(lang, 'Intl Phone', 'رقم دولي'), number: '+44 7911 123456' }
  ];
  const t = getTranslation(lang);
  const [senderNumber, setSenderNumber] = useState('+966 55 123 4567');
  const [messageInput, setMessageInput] = useState(`${config.code}.${config.secretKey}.{translateInline(lang, 'theft', 'سرقة')}`);
  const [lastParsed, setLastParsed] = useState<ParsedTrigger | null>(null);

  const handleSimulate = (msgToParse?: string, senderToUse?: string) => {
    const raw = msgToParse !== undefined ? msgToParse : messageInput;
    const activeSender = senderToUse !== undefined ? senderToUse : senderNumber;
    const result = parseTriggerMessage(raw, config, activeSender);
    setLastParsed(result);

    if (result.isValid) {
      onExecuteTrigger(result);
    }
  };

  const setQuickPreset = (presetText: string) => {
    setMessageInput(presetText);
    handleSimulate(presetText);
  };

  const handleGenerateRandomSender = () => {
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
    const newNum = `+966 5${Math.floor(Math.random() * 9)} ${randomDigits.toString().slice(0, 3)} ${randomDigits.toString().slice(3)}`;
    setSenderNumber(newNum);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">{t.simulatorTitle}</h3>
            <p className="text-xs text-slate-400">{t.simulatorDesc}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-mono-code self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Dynamic Reply Engine Active</span>
        </div>
      </div>

      {/* Simulator Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="test-sender-input" className="block text-xs font-semibold text-slate-300">
              {t.testSender}
            </label>
            <button
              onClick={handleGenerateRandomSender}
              className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-mono-code transition"
              title={translateInline(lang, 'Generate random number for test', 'توليد رقم عشوائي لاختبار الاستجابة')}
            >
              <RefreshCw className="w-3 h-3" />
              <span>{translateInline(lang, 'Random Number', 'رقم عشوائي')}</span>
            </button>
          </div>
          <div className="relative">
            <input
              id="test-sender-input"
              type="text"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              placeholder="+966 50 ..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-emerald-300 font-mono-code text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1 font-medium">
            <span>{translateInline(lang, '✓ Auto-reply will return directly to this number', '✓ الرد التلقائي سيعود مباشرة لهذا الرقم')}</span>
          </p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="test-message-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
            {t.messageInput}
          </label>
          <div className="flex gap-2">
            <input
              id="test-message-input"
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`${config.code}.${config.secretKey}.{translateInline(lang, 'theft', 'سرقة')}`}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-slate-100 font-mono-code text-sm focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              id="trigger-simulate-btn"
              onClick={() => handleSimulate()}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition active:scale-95 whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>{t.sendTestBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Senders Selector Pills */}
      <div>
        <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
          <span>{translateInline(lang, 'Choose a different sender number to test auto-reply:', 'اختر رقم مرسل مختلف لتجربة الرد التلقائي عليه:')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_SENDERS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setSenderNumber(s.number)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono-code transition flex items-center gap-1.5 ${
                senderNumber === s.number
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="font-bold text-[10px] text-slate-400">{s.label}:</span>
              <span>{s.number}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Test Presets */}
      <div>
        <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{t.quickPresets}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            id="preset-dual-track-btn"
            onClick={() => setQuickPreset(config.triggerCommand || '#TRACK')}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono-code transition flex items-center gap-1.5 font-bold"
          >
            <span className="text-[10px] text-cyan-400 font-black">{translateInline(lang, '★ Dual Path:', '★ مسار مزدوج:')}</span>
            <span>{config.triggerCommand || '#TRACK'}</span>
          </button>

          <button
            id="preset-theft-btn"
            onClick={() => setQuickPreset(`${config.code}.${config.secretKey}.{translateInline(lang, 'theft', 'سرقة')}`)}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono-code transition flex items-center gap-1.5"
          >
            <span className="text-[10px] text-rose-400 font-bold">{translateInline(lang, '1. Theft:', '1. سرقة:')}</span>
            <span>{config.code}.{config.secretKey}.{translateInline(lang, 'theft', 'سرقة')}</span>
          </button>

          <button
            id="preset-camera-btn"
            onClick={() => setQuickPreset(`${config.code}.${config.secretKey}.{translateInline(lang, 'camera', 'كاميرا')}`)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code transition flex items-center gap-1.5"
          >
            <span className="text-[10px] text-emerald-400 font-bold">{translateInline(lang, '2. Camera:', '2. كاميرا:')}</span>
            <span>{config.code}.{config.secretKey}.{translateInline(lang, 'camera', 'كاميرا')}</span>
          </button>

          <button
            id="preset-invalid-btn"
            onClick={() => setQuickPreset(`999.xyz.{translateInline(lang, 'theft', 'سرقة')}`)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono-code transition flex items-center gap-1.5"
          >
            <span className="text-[10px] text-amber-400 font-bold">{translateInline(lang, '3. Invalid Code:', '3. رمز خاطئ:')}</span>
            <span>999.xyz.{translateInline(lang, 'theft', 'سرقة')}</span>
          </button>
        </div>
      </div>

      {/* Real-time Parser Diagnostics Output */}
      {lastParsed && (
        <div
          id="parser-diagnostic-panel"
          className={`p-4 rounded-2xl border transition-all ${
            lastParsed.isValid
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {lastParsed.isValid ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-sm font-bold">
                {lastParsed.isValid
                  ? `تم التحقق بنجاح وتفعيل: [${lastParsed.action === 'theft' ? translateInline(lang, 'Theft Mode', 'وضع السرقة (Theft Mode)') : translateInline(lang, 'Camera Capture', 'كاميرا المتسلل (Camera Capture)')}]`
                  : translateInline(lang, 'Message verification failed (Security Rejection)', translateInline(lang, 'Message verification failed (Security Rejection)', 'فشل التحقق من الرسالة (Security Rejection)'))}
              </span>
            </div>
            <span className="text-[11px] font-mono-code opacity-75">{lastParsed.timestamp}</span>
          </div>

          {!lastParsed.isValid && lastParsed.errorReason && (
            <p className="text-xs text-rose-300 mr-7 mt-1 font-medium leading-relaxed">
              {translateInline(lang, 'Rejection Reason: ', 'سبب الرفض: ')}{lastParsed.errorReason}
            </p>
          )}

          {lastParsed.isValid && (
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 mt-2 mb-2 text-xs flex items-center justify-between">
              <span className="text-slate-300">{translateInline(lang, 'Auto-reply:', 'الرد التلقائي:')}</span>
              <span className="font-mono-code text-emerald-400 font-bold">
                {translateInline(lang, 'Emergency report and coordinates sent directly to the same number', 'تم إرسال بلاغ الطوارئ والإحداثيات مباشرة لنفس الرقم')} ($*{lastParsed.senderNumber})
              </span>
            </div>
          )}

          {/* Breakdown Tokens */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs font-mono-code">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              Code: <strong className={lastParsed.code === config.code ? 'text-emerald-400' : 'text-rose-400'}>{lastParsed.code || 'None'}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              Key: <strong className={lastParsed.secretKey.toLowerCase() === config.secretKey.toLowerCase() ? 'text-emerald-400' : 'text-rose-400'}>{lastParsed.secretKey || 'None'}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              Action: <strong className="text-indigo-400">{lastParsed.keyword || 'None'}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              Sender: <strong className="text-emerald-400 font-bold">{lastParsed.senderNumber}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
