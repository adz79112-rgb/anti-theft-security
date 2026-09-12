import React from 'react';
import { translateInline } from '../utils/translateInline';
import { Send, CheckCircle2, Clock, Bot, MessageSquare, AlertTriangle, XCircle } from 'lucide-react';
import { DispatchEvent, Language } from '../types';
import { getTranslation } from '../utils/translations';

interface DispatchHistoryProps {
  logs: DispatchEvent[];
  onClearLogs: () => void;
  lang: Language;
}

export const DispatchHistory: React.FC<DispatchHistoryProps> = ({ logs, onClearLogs, lang }) => {
  const t = getTranslation(lang);

  const getDispatchBadge = (type: DispatchEvent['type']) => {
    switch (type) {
      case 'telegram_alert':
        return {
          label: translateInline(lang, 'Telegram: Alert', 'تليجرام: إنذار طوارئ'),
          className: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
          isTelegram: true,
        };
      case 'telegram_photo':
        return {
          label: translateInline(lang, 'Telegram: Photo', 'تليجرام: صورة المتسلل'),
          className: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
          isTelegram: true,
        };
      case 'telegram_location':
        return {
          label: translateInline(lang, 'Telegram: GPS Location', 'تليجرام: إحداثيات GPS'),
          className: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
          isTelegram: true,
        };
      case 'dual_reverse_sms':
        return {
          label: translateInline(lang, 'Pathway 1: Reverse GPS SMS', 'مسار أول: SMS عكسي (GPS فقط)'),
          className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold',
          isTelegram: false,
        };
      case 'whatsapp_dispatch':
        return {
          label: translateInline(lang, 'WhatsApp: Live Emergency Report', 'واتساب: تقرير طوارئ مباشر'),
          className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold',
          isTelegram: false,
        };
      case 'gmail_report':
        return {
          label: translateInline(lang, 'Pathway 2: Gmail Report', 'مسار ثانٍ: تقرير Gmail شامل'),
          className: 'bg-red-500/15 text-red-300 border border-red-500/30 font-bold',
          isTelegram: false,
        };
      case 'emergency_sms':
        return {
          label: translateInline(lang, 'Emergency SMS', 'SMS طوارئ'),
          className: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
          isTelegram: false,
        };
      case 'dual_sim_sms':
        return {
          label: translateInline(lang, 'Dual-SIM: Redundant SMS', 'Dual-SIM: إرسال مزدوج عبر الشريحتين'),
          className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold',
          isTelegram: false,
        };
      case 'stealth_dispatch':
        return {
          label: translateInline(lang, 'Stealth Mode: Periodic Dispatch', 'وضع السرقة الخفي: بث دوري'),
          className: 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold',
          isTelegram: false,
        };
      case 'camera_report':
        return {
          label: translateInline(lang, 'Camera Report', 'تقرير كاميرا'),
          className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
          isTelegram: false,
        };
      default:
        return {
          label: translateInline(lang, 'System Ping', 'إشعار نظام'),
          className: 'bg-slate-800 text-slate-300 border border-slate-700',
          isTelegram: false,
        };
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">{t.dispatchLogTitle}</h3>
            <p className="text-xs text-slate-400">{translateInline(lang, 'Log of automated emergency reports (SMS & Telegram)', 'سجل البلاغات والتقارير المرسلة آلياً (SMS & Telegram)')}</p>
          </div>
        </div>

        {logs.length > 0 && (
          <button
            id="clear-dispatch-logs-btn"
            onClick={onClearLogs}
            className="text-xs text-slate-400 hover:text-slate-200 transition px-2.5 py-1 rounded-lg hover:bg-slate-800"
          >{translateInline(lang, 'Clear Log', 'مسح السجل')}</button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center border border-slate-800/80 rounded-2xl bg-slate-950/40">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
          <p className="text-xs text-slate-400 font-medium">{t.noLogs}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {translateInline(lang, 'Upon receiving any emergency command, automated reply messages and Telegram notifications will be logged here', 'عند استلام أي أمر طوارئ، سيتم تسجيل رسائل الرد التلقائية وإشعارات تليجرام هنا')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {logs.map((log, index) => {
            const badge = getDispatchBadge(log.type);
            const isFailed = log.status === 'failed';
            return (
              <div
                key={`${log.id || 'log'}-${index}`}
                className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition ${
                  isFailed
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-950/90 border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      isFailed
                        ? 'bg-rose-500/15 text-rose-400'
                        : badge.isTelegram
                        ? 'bg-sky-500/15 text-sky-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {isFailed ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : badge.isTelegram ? (
                      <Bot className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-200">
                        {badge.isTelegram
                          ? translateInline(lang, 'Direct dispatch to:', 'إرسال مباشر إلى:')
                          : translateInline(lang, 'Auto-reply to sender:', 'الرد التلقائي إلى نفس رقم المرسل:')}{' '}
                        <span
                          className={`font-mono-code font-bold px-2 py-0.5 rounded border ${
                            isFailed
                              ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                              : badge.isTelegram
                              ? 'text-sky-300 bg-sky-500/10 border-sky-500/20'
                              : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                          }`}
                        >
                          {log.recipient}
                        </span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono-code break-all">
                      {log.content}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono-code text-slate-500 block">
                    {log.timestamp}
                  </span>
                  <span
                    className={`text-[10px] font-medium flex items-center gap-1 justify-end mt-0.5 ${
                      isFailed
                        ? 'text-rose-400 font-bold'
                        : badge.isTelegram
                        ? 'text-sky-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isFailed
                          ? 'bg-rose-400'
                          : badge.isTelegram
                          ? 'bg-sky-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    {isFailed
                      ? translateInline(lang, 'Failed (SmsManager)', 'تعذر الإرسال')
                      : badge.isTelegram
                      ? translateInline(lang, 'Sent to Telegram', 'تم الإرسال لتليجرام')
                      : translateInline(lang, 'Delivered', 'تم التسليم للشبكة')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

