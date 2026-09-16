import React from 'react';
import { Shield, Power, Play, Smartphone } from 'lucide-react';
import { AppConfig } from '../types';
import { setAntiShutdownProtection, triggerPowerOffChallenge } from '../utils/nativeEmergencySms';
import { translateInline } from '../utils/translateInline';

interface PowerOffProtectionCardProps {
  config: AppConfig;
  lang: string;
  onUpdateConfig: (config: AppConfig) => void;
  onTriggerTestModal: () => void;
}

export const PowerOffProtectionCard: React.FC<PowerOffProtectionCardProps> = ({
  config,
  lang,
  onUpdateConfig,
  onTriggerTestModal
}) => {
  const isEnabled = config.antiShutdownProtectionActive !== false;

  const handleToggle = async () => {
    const nextState = !isEnabled;
    const updated = {
      ...config,
      antiShutdownProtectionActive: nextState,
    };
    onUpdateConfig(updated);
    await setAntiShutdownProtection(nextState, '');
  };

  const handleTestChallenge = async () => {
    onTriggerTestModal();
    try {
      await triggerPowerOffChallenge();
    } catch {
      // Handled via state in App.tsx
    }
  };

  return (
    <div
      id="power-off-protection-card"
      className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden transition-all mb-4"
      style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
    >
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      {/* Header with Title and Toggle */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-900/30 flex-shrink-0">
            <Power className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {translateInline(lang, 'Power-Off Protection', 'حماية إيقاف التشغيل')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {translateInline(lang, 'Native Lock', 'قفل النظام')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {translateInline(lang, 'Require device screen lock (PIN/Pattern/Biometric) before allowing the phone to be powered off', 'طلب رمز القفل الخاص بالهاتف (بصمة أو نمط) قبل السماح بإطفاء الجهاز')}
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <button
          id="toggle-power-protection-switch"
          onClick={handleToggle}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isEnabled ? 'bg-blue-500' : 'bg-slate-700'
          }`}
          role="switch"
          aria-checked={isEnabled}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              isEnabled
                ? lang === 'ar'
                  ? '-translate-x-5'
                  : 'translate-x-5'
                : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Feature Details & Technical Security Note */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 mb-4 text-xs text-slate-300 space-y-2.5">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>
            {translateInline(lang, 'When someone attempts to power off or restart the phone, the system power menu is instantly dismissed and replaced with a mandatory Code & Biometric Lock.', 'عند محاولة إطفاء الهاتف أو الضغط على زر التشغيل، يتم حجب قائمة الإطفاء فوراً وإظهار نافذة تطلب إدخال كود الأمان أو البصمة للسماح بإطفائه!')}
          </span>
        </div>
        <div className="text-[11px] text-amber-400/90 bg-amber-950/30 p-2 rounded-lg border border-amber-500/20">
          💡 {translateInline(lang, 'Hardware Hard-Reset (Power + Volume ~10s) is handled by the physical motherboard circuitry, while all screen power-offs and standard button menus are strictly locked behind your security code.', 'ملاحظة: الإطفاء الإجباري القسري بالأزرار الصلبة (Power + Vol Up) محمي عتادياً من معالج الهاتف، بينما قوائم الإطفاء وشاشات الإغلاق مقفلة تماماً وتتطلب إدخال الكود.')}
        </div>
      </div>

      {/* Test / Simulation Button */}
      <button
        id="test-power-lock-simulation-btn"
        onClick={handleTestChallenge}
        className="w-full py-2.5 px-4 bg-slate-800 border border-blue-500/50 hover:bg-blue-900/40 text-blue-300 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs mt-4"
      >
        <Play className="w-3.5 h-3.5" />
        <span>
          {translateInline(lang, 'Test Power-Off Interception Simulation', '⚡ تجربة محاكاة محاولة إطفاء الهاتف')}
        </span>
      </button>
    </div>
  );
};
