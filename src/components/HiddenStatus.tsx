import React, { useState, useEffect } from 'react';
import { translateInline } from '../utils/translateInline';
import { ShieldAlert, RefreshCw, X, Eye } from 'lucide-react';
import { Language } from '../types';
import {
  subscribeToFailedAttempts,
  resetFailedAttempts,
} from '../utils/authFailCounter';

interface HiddenStatusProps {
  lang?: Language;
}

export const HiddenStatus: React.FC<HiddenStatusProps> = ({ lang = 'ar' }) => {
  const [attempts, setAttempts] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToFailedAttempts((count) => {
      setAttempts(count);
    });
    return () => unsubscribe();
  }, []);

  // Only visible if there was at least 1 failed attempt
  if (attempts <= 0) return null;

  return (
    <div className="relative inline-flex items-center">
      {/* Stealth Badge: Subtle dim red dot with small count number */}
      <button
        type="button"
        id="stealth-status-badge-btn"
        onClick={() => setShowTooltip(!showTooltip)}
        title={
          lang === 'ar'
            ? `${translateInline(lang, 'Stealth Security Badge: Detected ${attempts} unauthorized entry attempts', 'شارة الأمان الخفية: رصد ${attempts} محاولة دخول غير مصرح بها')}`
            : `Stealth Badge: ${attempts} unauthorized attempt(s) detected`
        }
        className="group flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/60 text-rose-300/80 hover:text-rose-200 text-[10px] font-mono-code transition cursor-pointer select-none"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
        </span>
        <span className="font-bold tracking-tight text-[10px]">{attempts}</span>
      </button>

      {/* Discreet owner detail popover */}
      {showTooltip && (
        <div
          id="stealth-status-badge-popover"
          className="absolute top-8 left-0 sm:right-0 sm:left-auto z-50 w-64 bg-slate-900/95 border border-rose-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl text-xs text-slate-300 font-mono-code space-y-2.5 animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{translateInline(lang, 'Stealth Alert Badge', 'شارة الأمان الخفية')}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTooltip(false)}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-300">
            {lang === 'ar'
              ? `${translateInline(lang, 'Recorded ${attempts} incorrect entry attempts. Intruder photo captured and GPS location sent on the 3rd attempt.', 'تم تسجيل ${attempts} محاولة دخول خاطئة. تم التقاط صورة المتسلل وإرسال الموقع الجغرافي عند المحاولة الثالثة.')}`
              : `${attempts} failed attempt(s) recorded. Intruder selfie and GPS sent upon 3rd attempt.`}
          </p>

          <p className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
            {translateInline(lang, 'Auto-resets to zero when owner unlocks correctly.', 'تتصفر الشارة تلقائياً بمجرد فتح القفل بالبصمة أو الرمز الصحيح.')}
          </p>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              id="stealth-badge-reset-btn"
              onClick={async () => {
                await resetFailedAttempts();
                setShowTooltip(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{translateInline(lang, 'Reset counter', 'تصفير العداد يدوياً')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
