import React, { useState, useEffect } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  Mail,
  ShieldCheck,
  Camera,
  MapPin,
  Clock,
  Sparkles,
  Lock,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { Language, DispatchEvent, SecurityConfig } from '../types';
import { GmailSecurityCard } from './GmailSecurityCard';
import { getActiveAlertEmail } from '../utils/emailVerification';

interface GmailTabScreenProps {
  lang: Language;
  config: SecurityConfig;
  onChangeConfig: (newConfig: SecurityConfig) => void;
  onSecurityLog: (event: Omit<DispatchEvent, 'id'>) => void;
}

export const GmailTabScreen: React.FC<GmailTabScreenProps> = ({
  lang,
  config,
  onChangeConfig,
  onSecurityLog,
}) => {
  const [activeRecipientEmail, setActiveRecipientEmail] = useState<string>(config.userEmail || 'adz79112@gmail.com');

  useEffect(() => {
    getActiveAlertEmail(config.userEmail || 'adz79112@gmail.com').then((res) => {
      if (res) setActiveRecipientEmail(res);
    });
  }, [config.userEmail]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner Card for Gmail Security Channel */}
      <div className="bg-slate-900/80 border border-red-500/30 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  {translateInline(lang, 'Gmail Security Reports Channel', 'قناة تقارير الأمان عبر البريد (Gmail)')}
                </h2>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{translateInline(lang, 'Active & Armed', 'مفعل وتلقائي')}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {translateInline(
                  lang,
                  'Dedicated stealth alert channel with anti-tamper protection, instant camera captures, and satellite GPS coordinates.',
                  'قناة إرسال سرية مباشرة ومحمية بقفل أمني مشدد لمنع العبث، تدعم التقاط الصور الحية فوراً وربط إحداثيات الموقع.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono-code text-slate-300 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-2xl shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {translateInline(lang, 'Recipient:', 'البريد المعتمد:')}{' '}
              <strong className="text-emerald-400 font-bold break-all">
                {activeRecipientEmail || config.userEmail || 'adz79112@gmail.com'}
              </strong>
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300 font-mono-code">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{translateInline(lang, 'Front intruder photo attached', 'صورة المتسلل الأمامية ملحقة')}</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{translateInline(lang, 'Direct Google Maps link', 'رابط موقع Google Maps مباشر')}</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{translateInline(lang, '72-hour anti-tamper security lock', 'قفل أمني 72 ساعة ضد التعديل')}</span>
          </div>
        </div>
      </div>

      {/* Main Gmail Security Card with Verification & Cooldown */}
      <GmailSecurityCard
        lang={lang}
        currentEmail={config.userEmail || 'adz79112@gmail.com'}
        onEmailChanged={(newActive) => {
          setActiveRecipientEmail(newActive);
          onChangeConfig({ ...config, userEmail: newActive });
        }}
        onSecurityLog={onSecurityLog}
      />
    </div>
  );
};

