import React, { useState, useEffect } from 'react';
import { Shield, Power, Lock, KeyRound, AlertTriangle, CheckCircle2, Play, Sparkles, Smartphone, Info } from 'lucide-react';
import { SecurityConfig, Language } from '../types';
import { translateInline } from '../utils/translateInline';
import { setAntiShutdownProtection, triggerPowerOffChallenge, getAntiShutdownStatus } from '../utils/nativeEmergencySms';

interface PowerOffProtectionCardProps {
  config: SecurityConfig;
  lang: Language;
  onUpdateConfig: (newConfig: SecurityConfig) => void;
  onTriggerTestModal: () => void;
}

export const PowerOffProtectionCard: React.FC<PowerOffProtectionCardProps> = ({
  config,
  lang,
  onUpdateConfig,
  onTriggerTestModal,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(
    config.antiShutdownProtectionActive !== false
  );
  const [pin, setPin] = useState<string>(config.antiShutdownPin || config.code || '123');
  const [isEditingPin, setIsEditingPin] = useState<boolean>(false);
  const [tempPin, setTempPin] = useState<string>(pin);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Sync with native state
    getAntiShutdownStatus().then((status) => {
      if (typeof status.enabled === 'boolean') {
        setIsEnabled(status.enabled);
      }
    });
  }, []);

  const handleToggle = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    const updated = {
      ...config,
      antiShutdownProtectionActive: nextState,
    };
    onUpdateConfig(updated);
    await setAntiShutdownProtection(nextState, pin);
  };

  const handleSavePin = async () => {
    if (!tempPin || tempPin.length < 3) return;
    setPin(tempPin);
    setIsEditingPin(false);
    const updated = {
      ...config,
      antiShutdownPin: tempPin,
    };
    onUpdateConfig(updated);
    await setAntiShutdownProtection(isEnabled, tempPin);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
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
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      {/* Header with Title and Toggle */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-900/30 flex-shrink-0">
            <Power className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {translateInline('Power-Off PIN Protection', lang, 'حماية منع إيقاف التشغيل بـ PIN')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {translateInline('All OEMs', lang, 'لكل الهواتف')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {translateInline(
                'Require device PIN or fingerprint before allowing the phone to be powered off',
                lang,
                'طلب رمز الحماية أو البصمة قبل السماح بإطفاء الهاتف حتى لو لم يكن في وضع السرقة'
              )}
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <button
          id="toggle-power-protection-switch"
          onClick={handleToggle}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isEnabled ? 'bg-amber-500' : 'bg-slate-700'
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

      {/* Feature Details & Brand Compatibility */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 mb-4 text-xs text-slate-300 space-y-2">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            {translateInline(
              'When a thief or unauthorized person holds the power button or tries to tap "Power Off" / "Restart", the system dialog is blocked immediately and locked behind this security PIN.',
              lang,
              'عندما يحاول السارق أو أي شخص إطفاء الهاتف بالضغط على زر التشغيل، يتم اعتراض قائمة الإطفاء فوراً وإغلاقها وإظهار شاشة قفل تطلب رمز PIN أو بصمة الجهاز!'
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
          <Smartphone className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span>
            {translateInline(
              'Optimized for Condor Algeria, Samsung One UI, Xiaomi/Redmi HyperOS, Realme UI, OPPO ColorOS & Stock Android.',
              lang,
              'متوافق ويعمل بامتياز مع هواتف كوندور الجزائرية، سامسونغ، شاومي، ريالمي، وأوبو وكافة أنظمة أندرويد.'
            )}
          </span>
        </div>
      </div>

      {/* PIN Configuration Section */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              {translateInline('Current Power-Off PIN:', lang, 'رمز PIN المخصص لإيقاف التشغيل:')}
            </span>
            <span className="text-xs text-slate-400 font-mono tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-slate-700 inline-block mt-0.5">
              {pin}
            </span>
          </div>
        </div>

        {isEditingPin ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              maxLength={6}
              value={tempPin}
              onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
              placeholder="123"
              className="w-24 px-2.5 py-1.5 bg-slate-900 border border-amber-500/60 rounded-lg text-white font-mono text-center text-sm focus:outline-none"
            />
            <button
              id="save-power-pin-btn"
              onClick={handleSavePin}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors"
            >
              {translateInline('Save', lang, 'حفظ')}
            </button>
            <button
              onClick={() => {
                setTempPin(pin);
                setIsEditingPin(false);
              }}
              className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
            >
              {translateInline('Cancel', lang, 'إلغاء')}
            </button>
          </div>
        ) : (
          <button
            id="edit-power-pin-btn"
            onClick={() => setIsEditingPin(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
          >
            {translateInline('Change PIN', lang, 'تعديل الرمز')}
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/40 mb-3 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{translateInline('PIN updated successfully!', lang, 'تم حفظ وتحديث رمز PIN بنجاح!')}</span>
        </div>
      )}

      {/* Test / Simulation Button */}
      <button
        id="test-power-lock-simulation-btn"
        onClick={handleTestChallenge}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition-all text-xs"
      >
        <Play className="w-3.5 h-3.5" />
        <span>
          {translateInline(
            'Test Power-Off Interception Simulation',
            lang,
            '⚡ تجربة محاكاة محاولة إطفاء الهاتف واختبار القفل'
          )}
        </span>
      </button>
    </div>
  );
};
