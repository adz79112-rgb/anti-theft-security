import { translateInline } from '../utils/translateInline';
import React from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Radio,
  MapPin,
  Volume2,
  Camera,
  Key,
  Send,
  HelpCircle,
  Play,
  Mail,
  Lock,
  Power,
} from 'lucide-react';
import { SecurityConfig, Language, DispatchEvent } from '../types';
import { getTranslation } from '../utils/translations';
import { AsyncStorage, STORAGE_KEYS } from '../utils/storage';
import { GmailSecurityCard } from './GmailSecurityCard';
import { ShieldCard } from './ShieldCard';
import { PowerOffProtectionCard } from './PowerOffProtectionCard';

interface DashboardProps {
  config: SecurityConfig;
  onChangeConfig: (newConfig: SecurityConfig) => void;
  lang: Language;
  onTriggerTheft: () => void;
  onTriggerCamera: () => void;
  onTriggerPowerChallenge?: () => void;
  onSecurityLog?: (event: DispatchEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  config,
  onChangeConfig,
  lang,
  onTriggerTheft,
  onTriggerCamera,
  onTriggerPowerChallenge,
  onSecurityLog,
}) => {
  const t = getTranslation(lang);

  const handleToggle = (key: keyof SecurityConfig) => {
    onChangeConfig({
      ...config,
      [key]: !config[key],
    });
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    onChangeConfig({ ...config, code: val });
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    onChangeConfig({ ...config, secretKey: val });
  };

  return (
    <div className="space-y-6">
      {/* Status Hero Card */}
      <div
        id="status-indicator-card"
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border transition-all duration-300 ${
          config.isProtectionActive
            ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/40 shadow-xl shadow-emerald-500/10'
            : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-rose-500/40 shadow-xl shadow-rose-500/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-2xl border transition-all ${
                config.isProtectionActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-inner'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-inner'
              }`}
            >
              {config.isProtectionActive ? (
                <ShieldCheck className="w-10 h-10 animate-pulse" />
              ) : (
                <ShieldAlert className="w-10 h-10" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    config.isProtectionActive ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                  }`}
                />
                <h2 className="text-xl sm:text-2xl font-black text-slate-100">
                  {config.isProtectionActive ? t.statusActive : t.statusInactive}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
                {config.isProtectionActive
                  ? t.listeningSms
                  : translateInline(lang, 'Background monitoring stopped. Commands will not respond until reactivated.', 'تم إيقاف خدمة المراقبة الخلفية. لن تستجيب الأوامر حتى إعادة تفعيلها.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="main-protection-toggle-btn"
              onClick={() => handleToggle('isProtectionActive')}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${
                config.isProtectionActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{config.isProtectionActive ? translateInline(lang, 'Stop Protection', 'إيقاف الحماية') : translateInline(lang, 'Start Protection Now', 'تشغيل الحماية الآن')}</span>
            </button>
          </div>
        </div>

        {/* Current Active Trigger Syntax Preview Banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Key className="w-4 h-4 text-emerald-400" />
            <span>{translateInline(lang, 'Accepted Response Format:', 'صيغة الرسالة المعتمدة للاستجابة:')}</span>
            <code className="font-mono-code bg-slate-950 px-2.5 py-1 rounded-lg text-emerald-400 border border-slate-800 font-bold tracking-wider">
              {config.code || '123'}.{config.secretKey || 'ABC'}.[{translateInline(lang, 'Command', 'الأمر')}]
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              id="dashboard-anti-uninstall-badge"
              className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-mono-code font-bold text-xs shadow-sm shadow-emerald-950/40 animate-pulse"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anti-Uninstall Active</span>
            </span>

            <div className="flex items-center gap-2 text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">{t.dynamicSenderBadge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anti-Uninstall & Device Admin Policy Engine */}
      <ShieldCard lang={lang} onSecurityLog={onSecurityLog} />

      {/* Anti-Shutdown / Power-Off PIN Protection Guard */}
      <PowerOffProtectionCard
        config={config}
        lang={lang}
        onUpdateConfig={onChangeConfig}
        onTriggerTestModal={onTriggerPowerChallenge || (() => {})}
      />

      {/* Grid: Credentials Settings & Protection Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credentials Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{t.settingsTitle}</h3>
              <p className="text-xs text-slate-400">{translateInline(lang, 'Set secret codes to unlock remote commands', 'تحديد الرموز السرية لفتح قفل الأوامر عن بُعد')}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 3 Digits Security Code */}
            <div>
              <label htmlFor="security-code-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.securityCodeLabel}
              </label>
              <div className="relative">
                <input
                  id="security-code-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={config.code}
                  onChange={handleCodeChange}
                  placeholder="123"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-emerald-400 font-mono-code text-lg font-bold tracking-widest focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="absolute left-4 top-3.5 text-xs text-slate-500 font-mono-code">
                  3 Digits
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{t.securityCodeDesc}</p>
            </div>

            {/* 3 Letters Secret Key */}
            <div>
              <label htmlFor="secret-key-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.secretKeyLabel}
              </label>
              <div className="relative">
                <input
                  id="secret-key-input"
                  type="text"
                  maxLength={3}
                  value={config.secretKey}
                  onChange={handleKeyChange}
                  placeholder="ABC"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-teal-400 font-mono-code text-lg font-bold tracking-widest uppercase focus:outline-none focus:border-teal-500 transition"
                />
                <span className="absolute left-4 top-3.5 text-xs text-slate-500 font-mono-code">
                  3 Letters
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{t.secretKeyDesc}</p>
            </div>

            {/* User Gmail Verification & 72-Hour Security Cooldown */}
            <GmailSecurityCard
              lang={lang}
              currentEmail={config.userEmail || 'adz79112@gmail.com'}
              onEmailChanged={(newActive) => onChangeConfig({ ...config, userEmail: newActive })}
            />

            {/* Dynamic Sender Feature Card (No fixed number required) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-emerald-950/30 border border-emerald-500/30 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-300">{t.dynamicSenderTitle}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">{translateInline(lang, 'No specific number', 'بدون رقم محدد')}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    {t.dynamicSenderDesc}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400/90 font-mono-code">
                    <span>{translateInline(lang, 'Reply Path:', 'مسار الرد:')}</span>
                    <span>{translateInline(lang, '[Any Phone] ➔ [Reply to same number]', '[أي رقم هاتف] ➔ [الرد لنفس الرقم]')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Protection Toggles Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{translateInline(lang, 'Immediate Protection & Activation Keys', 'مفاتيح التفعيل والحماية الفورية')}</h3>
                <p className="text-xs text-slate-400">{translateInline(lang, 'Customize automatically allowed actions', 'تخصيص الإجراءات المسموح بتنفيذها تلقائياً')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Toggle 1: Background Protection */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300 mt-0.5">
                    <Radio className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{t.protectionToggle}</span>
                    <span className="text-[11px] text-slate-400">{t.protectionToggleDesc}</span>
                  </div>
                </div>
                <button
                  id="toggle-bg-protection"
                  type="button"
                  role="switch"
                  aria-checked={config.isProtectionActive}
                  onClick={() => handleToggle('isProtectionActive')}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                    config.isProtectionActive ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                      config.isProtectionActive ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: GPS Tracking */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300 mt-0.5">
                    <MapPin className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{t.gpsToggle}</span>
                    <span className="text-[11px] text-slate-400">{t.gpsToggleDesc}</span>
                  </div>
                </div>
                <button
                  id="toggle-gps"
                  type="button"
                  role="switch"
                  aria-checked={config.isGpsTrackingEnabled}
                  onClick={() => handleToggle('isGpsTrackingEnabled')}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                    config.isGpsTrackingEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                      config.isGpsTrackingEnabled ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Panic Alarm */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300 mt-0.5">
                    <Volume2 className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{t.alarmToggle}</span>
                    <span className="text-[11px] text-slate-400">{t.alarmToggleDesc}</span>
                  </div>
                </div>
                <button
                  id="toggle-alarm"
                  type="button"
                  role="switch"
                  aria-checked={config.isPanicAlarmEnabled}
                  onClick={() => handleToggle('isPanicAlarmEnabled')}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                    config.isPanicAlarmEnabled ? 'bg-rose-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                      config.isPanicAlarmEnabled ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4: Auto Camera */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300 mt-0.5">
                    <Camera className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{t.cameraToggle}</span>
                    <span className="text-[11px] text-slate-400">{t.cameraToggleDesc}</span>
                  </div>
                </div>
                <button
                  id="toggle-camera"
                  type="button"
                  role="switch"
                  aria-checked={config.isAutoCameraEnabled}
                  onClick={() => handleToggle('isAutoCameraEnabled')}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                    config.isAutoCameraEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                      config.isAutoCameraEnabled ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Command Reference Cards */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4 text-slate-300">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-bold">{t.commandsOverview}</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-rose-400">1. {t.theftCommandInfo}</span>
              <code className="font-mono-code text-[11px] bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20">
                {config.code}.{config.secretKey}.{translateInline(lang, 'theft', 'سرقة')}
              </code>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{t.theftCommandDesc}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-emerald-400">2. {t.cameraCommandInfo}</span>
              <code className="font-mono-code text-[11px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                {config.code}.{config.secretKey}.{translateInline(lang, 'camera', 'كاميرا')}
              </code>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{t.cameraCommandDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
