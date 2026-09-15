import React from 'react';
import { translateInline } from '../utils/translateInline';
import {
  Send,
  Sparkles,
  Bot,
  Camera,
  MapPin,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Language, SecurityConfig } from '../types';
import { TelegramConfigCard } from './TelegramConfigCard';

interface TelegramTabScreenProps {
  lang: Language;
  config: SecurityConfig;
  onChangeConfig: (newConfig: SecurityConfig) => void;
}

export const TelegramTabScreen: React.FC<TelegramTabScreenProps> = ({
  lang,
  config,
  onChangeConfig,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner Card for Tab 4: Telegram */}
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  {translateInline(lang, 'Telegram Bot Alert Channel', 'إعدادات بوت تليجرام (Telegram Bot)')}
                </h2>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  Zero SMS Cost
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {translateInline(lang, 'Dedicated window to configure Bot Token, Chat ID, and trigger real-time test alerts with intruder snapshots.', 'نافذة مخصصة لإدخال مفتاح البوت (Bot Token) ومعرف المحادثة (Chat ID) مع زر اختبار الإرسال الفوري للصور والإحداثيات.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono-code text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-2xl">
            <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {translateInline(lang, 'Chat ID:', 'معرف الدردشة:')}{' '}
              <strong className="text-cyan-300 font-bold">
                {config.telegramChatId || (translateInline(lang, 'Not configured', 'غير محدد بعد'))}
              </strong>
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300 font-mono-code">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{translateInline(lang, 'Instantly upload front camera photos', 'رفع صور الكاميرا الأمامية فوراً')}</span>
            </div>
            {config.isAutoCameraEnabled && config.telegramAlertsEnabled && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{translateInline(lang, 'Send interactive Live Location', 'إرسال Live Location تفاعلي')}</span>
            </div>
            {config.isGpsTrackingEnabled && config.telegramAlertsEnabled && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{translateInline(lang, 'Operates completely silently with no SMS cost', 'يعمل بصمت تام وبدون تكلفة SMS')}</span>
            </div>
            {config.telegramAlertsEnabled && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* Main Telegram Config Card */}
      <TelegramConfigCard
        config={config}
        onChangeConfig={onChangeConfig}
        lang={lang}
      />
    </div>
  );
};
