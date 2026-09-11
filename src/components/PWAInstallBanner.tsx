import React, { useState } from 'react';
import { Download, CheckCircle2, Smartphone, ExternalLink, X, HelpCircle, Shield } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';
import { translateInline } from '../utils/translateInline';

interface PWAInstallBannerProps {
  lang: Language;
  className?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ lang, className = '' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed as PWA or user dismissed this session
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono-code">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{translateInline(lang, 'Installed PWA Active', 'تطبيق مثبت ونشط (PWA)')}</span>
      </div>
    );
  }

  if (isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div
      className={`p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 shadow-xl relative overflow-hidden ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white font-mono-code">
                {translateInline(lang, 'Install DroidGuard on Android Phone', 'تثبيت تطبيق DroidGuard على هاتفك الأندرويد')}
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {translateInline(
                lang,
                'Runs in full-screen standalone mode with instant notifications and offline persistence.',
                'يعمل كتطبيق كامل ومستقل بملء الشاشة مع حفظ البيانات والعمل دون انقطاع.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            id="pwa-install-action-btn"
            onClick={handleInstallClick}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold font-mono-code flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50 transition cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{translateInline(lang, 'Install App Now', 'تثبيت التطبيق الآن')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-2 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title={translateInline(lang, 'Dismiss for now', 'إخفاء مؤقت')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
