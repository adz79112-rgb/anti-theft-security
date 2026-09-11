import React, { useState } from 'react';
import { translateInline } from '../utils/translateInline';
import { Shield, Globe, Lock, Power, Download } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';
import { LANGUAGES_REGISTRY } from '../utils/languagesRegistry';
import { HiddenStatus } from './HiddenStatus';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface TopNavProps {
  lang: Language;
  onSelectLang: (newLang: Language) => void;
  onLockApp: () => void;
  onTriggerFakePowerOff?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  lang,
  onSelectLang,
  onLockApp,
  onTriggerFakePowerOff,
}) => {
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const t = getTranslation(lang);
  const currentLangMeta = LANGUAGES_REGISTRY.find((l) => l.code === lang) || LANGUAGES_REGISTRY[0];

  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Name */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
              <span>{t.appTitle}</span>
              <span className="hidden sm:inline-block text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono-code font-semibold">
                ANDROID SECURITY UNIT
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls: PWA Install, Stealth Status Badge, Fake Power-Off Trap, Lock App & Language Selector */}
        <div className="flex items-center gap-2">
          {/* Direct PWA Install Button */}
          {!isInstalled && (
            <button
              id="header-install-pwa-btn"
              onClick={async () => {
                if (isInstallable) {
                  await install();
                } else {
                  const btn = document.getElementById('pwa-install-action-btn');
                  if (btn) {
                    btn.click();
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/40 transition cursor-pointer shadow-sm"
              title={translateInline(lang, 'Install App on Phone', 'تثبيت التطبيق على الهاتف')}
            >
              <Download className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
              <span className="hidden sm:inline font-mono-code">
                {translateInline(lang, 'Install', 'تثبيت')}
              </span>
            </button>
          )}

          {/* Subtle Stealth Status Indicator (Visible only if breach attempts exist) */}
          <HiddenStatus lang={lang} />

          {/* Language Selector Button with Flag & Native Name */}
          <button
            id="open-language-selector-btn"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:border-emerald-500/40 text-slate-200 text-xs font-semibold border border-slate-700/60 transition cursor-pointer"
            title={t.selectLanguage}
          >
            <span className="text-base leading-none select-none">{currentLangMeta.flag}</span>
            <span className="hidden sm:inline font-medium">{currentLangMeta.name}</span>
            <Globe className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
          </button>

          {/* Lock App (Return to Biometric Gate) */}
          <button
            id="lock-app-btn"
            onClick={onLockApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-xs font-semibold border border-slate-700/60 transition cursor-pointer"
            title={t.lockConsole}
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.lockConsole}</span>
          </button>
        </div>
      </div>

      {/* Language Selector Modal with Search & Categorized Scrollable List */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        currentLang={lang}
        onSelectLang={onSelectLang}
      />
    </header>
  );
};

