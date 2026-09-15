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
  homeStatus?: 'ok' | 'warning' | 'critical';
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  lang,
  hasSmsConfigured = true,
  hasTelegramConfigured = true,
  hasGmailConfigured = true,
  homeStatus = 'ok',
}) => {
  const t = getTranslation(lang);

  const tabs: {
    id: NavTabId;
    label: string;
    sub: string;
    icon: React.FC<{ className?: string }>;
    isConfigured: boolean;
    status?: 'ok' | 'warning' | 'critical';
  }[] = [
    {
      id: 'home',
      label: t.navDashboard,
      sub: t.navDashboardSub,
      icon: ShieldCheck,
      isConfigured: homeStatus === 'ok',
      status: homeStatus,
    },
    {
      id: 'sms',
      label: t.navSms,
      sub: t.navSmsSub,
      icon: MessageSquareWarning,
      isConfigured: hasSmsConfigured,
      status: hasSmsConfigured ? 'ok' : 'warning',
    },
    {
      id: 'telegram',
      label: t.navTelegram,
      sub: t.navTelegramSub,
      icon: Send,
      isConfigured: hasTelegramConfigured,
      status: hasTelegramConfigured ? 'ok' : 'warning',
    },
    {
      id: 'gmail',
      label: t.navGmail,
      sub: t.navGmailSub,
      icon: Mail,
      isConfigured: hasGmailConfigured,
      status: hasGmailConfigured ? 'ok' : 'warning',
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-2xl safe-area-inset-bottom"
    >
      <div className="max-w-4xl mx-auto px-1.5 py-2 sm:py-2.5">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            let activeColor = 'text-slate-100 bg-slate-800/50 border-slate-700 shadow-slate-950/40';
            let inactiveColor = 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent';
            let indicatorColor = 'via-slate-400';
            let badgeClass = '';

            if (tab.status === 'critical') {
              activeColor = 'text-red-400 bg-red-500/15 border-red-500/40 shadow-red-950/40';
              inactiveColor = 'text-red-500 hover:text-red-400 hover:bg-slate-900/60 border border-transparent';
              indicatorColor = 'via-red-500';
              badgeClass = 'bg-red-500 animate-pulse ring-red-900/50';
            } else if (tab.status === 'ok') {
              activeColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 shadow-emerald-950/40';
              inactiveColor = 'text-emerald-500 hover:text-emerald-400 hover:bg-slate-900/60 border border-transparent';
              indicatorColor = 'via-emerald-400';
              badgeClass = 'bg-emerald-400 ring-slate-950';
            }

            return (
              <button
                key={tab.id}
                id={`bottom-nav-tab-${tab.id}`}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive ? `${activeColor} border shadow-lg` : inactiveColor
                }`}
              >
                {/* Active Indicator Top Notch */}
                {isActive && (
                  <span className={`absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-transparent ${indicatorColor} to-transparent`} />
                )}

                <div className="relative">
                  <Icon
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform ${
                      isActive ? 'scale-110' : 'scale-100'
                    }`}
                  />
                  {(tab.status === 'ok' || tab.status === 'critical') && (
                    <span
                      className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ${badgeClass}`}
                      title={tab.status === 'critical' ? 'Action Required' : 'Configured'}
                    />
                  )}
                </div>

                <span className="text-[11px] sm:text-xs font-bold mt-1 tracking-tight truncate max-w-full text-center">
                  {tab.label}
                </span>

                <span className="text-[9px] font-mono-code hidden sm:block truncate max-w-full opacity-70">
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
