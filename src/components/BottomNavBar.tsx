import React from 'react';
import {
  ShieldCheck,
  MessageSquare,
  MessageSquareWarning,
  Send,
  Mail,
} from 'lucide-react';
import { Language, NavTabId } from '../types';
import { getTranslation } from '../utils/translations';

export type { NavTabId };

interface BottomNavBarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  lang: Language;
  hasSmsConfigured?: boolean;
  hasTelegramConfigured?: boolean;
  hasGmailConfigured?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  lang,
  hasSmsConfigured = true,
  hasTelegramConfigured = true,
  hasGmailConfigured = true,
}) => {
  const t = getTranslation(lang);

  const tabs: {
    id: NavTabId;
    label: string;
    sub: string;
    icon: React.FC<{ className?: string }>;
    isConfigured: boolean;
    activeColor: string;
    badgeColor: string;
  }[] = [
    {
      id: 'home',
      label: t.navDashboard,
      sub: t.navDashboardSub,
      icon: ShieldCheck,
      isConfigured: true,
      activeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 shadow-emerald-950/40',
      badgeColor: 'bg-emerald-400',
    },
    {
      id: 'messages',
      label: t.navMessages,
      sub: t.navMessagesSub,
      icon: MessageSquare,
      isConfigured: true,
      activeColor: 'text-blue-400 bg-blue-500/15 border-blue-500/40 shadow-blue-950/40',
      badgeColor: 'bg-blue-400',
    },
    {
      id: 'sms',
      label: t.navSms,
      sub: t.navSmsSub,
      icon: MessageSquareWarning,
      isConfigured: hasSmsConfigured,
      activeColor: 'text-amber-400 bg-amber-500/15 border-amber-500/40 shadow-amber-950/40',
      badgeColor: 'bg-amber-400',
    },
    {
      id: 'telegram',
      label: t.navTelegram,
      sub: t.navTelegramSub,
      icon: Send,
      isConfigured: hasTelegramConfigured,
      activeColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40 shadow-cyan-950/40',
      badgeColor: 'bg-cyan-400',
    },
    {
      id: 'gmail',
      label: t.navGmail,
      sub: t.navGmailSub,
      icon: Mail,
      isConfigured: hasGmailConfigured,
      activeColor: 'text-red-400 bg-red-500/15 border-red-500/40 shadow-red-950/40',
      badgeColor: 'bg-red-400',
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-2xl safe-area-inset-bottom"
    >
      <div className="max-w-4xl mx-auto px-1.5 py-2 sm:py-2.5">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`bottom-nav-tab-${tab.id}`}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? `${tab.activeColor} border shadow-lg`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                {/* Active Indicator Top Notch */}
                {isActive && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                )}

                <div className="relative">
                  <Icon
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${
                      isActive ? 'scale-110' : 'scale-100'
                    }`}
                  />
                  {tab.isConfigured && (
                    <span
                      className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${tab.badgeColor} ring-2 ring-slate-950`}
                      title="Configured"
                    />
                  )}
                </div>

                <span className="text-[11px] sm:text-xs font-bold mt-1 tracking-tight truncate max-w-full text-center">
                  {tab.label}
                </span>

                <span className="text-[9px] text-slate-500 font-mono-code hidden sm:block truncate max-w-full">
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
