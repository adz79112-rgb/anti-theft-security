import React, { useState, useEffect } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  MessageSquareWarning,
  PhoneCall,
  Save,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Smartphone,
  ShieldCheck,
  Info,
  Check,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Language, DispatchEvent, SecurityConfig } from '../types';
import {
  getEmergencyContactPhone,
  saveEmergencyContactPhone,
  isValidPhoneNumber,
  DEFAULT_EMERGENCY_PHONE,
} from '../utils/emergencyContact';
import { DualSimNetworkCard } from './DualSimNetworkCard';

interface SmsEmergencyTabScreenProps {
  config: SecurityConfig;
  onChangeConfig: (newConfig: SecurityConfig) => void;
  lang: Language;
  onLogDispatch: (event: Omit<DispatchEvent, 'id'>) => void;
  onTriggerStealthStolen: () => void;
}

export const SmsEmergencyTabScreen: React.FC<SmsEmergencyTabScreenProps> = ({
  config,
  onChangeConfig,
  lang,
  onLogDispatch,
  onTriggerStealthStolen,
}) => {
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Load emergency contact phone on mount
  useEffect(() => {
    async function loadPhone() {
      const phone = await getEmergencyContactPhone(config.emergencyContactPhone);
      setEmergencyPhone(phone);
      setIsSaved(Boolean(phone));
    }
    loadPhone();
  }, [config.emergencyContactPhone]);

  const handleSavePhone = async () => {
    if (!isValidPhoneNumber(emergencyPhone)) {
      setSaveFeedback(
        translateInline(lang, '❌ Please enter a valid international phone number', '❌ يرجى إدخال رقم هاتف صحيح بصيغة دولية (مثال: +213661123456 أو +966501234567)')
      );
      return;
    }

    await saveEmergencyContactPhone(emergencyPhone.trim());
    setIsSaved(true);
    onChangeConfig({
      ...config,
      emergencyContactPhone: emergencyPhone.trim(),
    });

    setSaveFeedback(
      translateInline(lang, '✓ Primary Emergency phone verified & saved to secure storage!', '✓ تم حفظ واعتماد رقم هاتف الطوارئ في الذاكرة الدائمة بنجاح!')
    );

    setTimeout(() => {
      setSaveFeedback(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 shadow-xl shadow-amber-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <MessageSquareWarning className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-100">
                  {translateInline(lang, 'SMS & Emergency Dispatch', 'الرسائل والطوارئ (SMS & Emergency)')}
                </h2>
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{translateInline(lang, 'DUAL-SMS ENGINE', 'DUAL-SMS ENGINE')}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {translateInline(lang, 'Manage primary emergency contact & synchronous dual-SMS dispatch with automatic SIM fallback', 'إدارة رقم هاتف الطوارئ المعتمد والإرسال المزدوج المتزامن مع التبديل الذكي بين الشريحتين SIM 1 و SIM 2')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-mono-code font-bold flex items-center gap-1.5 border ${
                isSaved
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSaved ? (translateInline(lang, 'Emergency Number Active', 'رقم الطوارئ معتمد')) : (translateInline(lang, 'Unsaved', 'يرجى الحفظ'))}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1. Dedicated Emergency Phone Number Field */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                {translateInline(lang, 'Verified Emergency Phone Number', 'رقم هاتف الطوارئ المعتمد (Primary Emergency Phone)')}
              </h3>
              <p className="text-xs text-slate-400">
                {translateInline(lang, 'Primary contact receiving instant GPS coordinates & map link upon theft or command', 'الرقم الأساسي الموثوق الذي يستقبل رابط موقع GPS وصورة الحادثة تلقائياً عند أي طارئ أو أمر سرقة')}
              </p>
            </div>
          </div>

          {/* Quick country code presets */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">${translateInline(lang, 'Quick Codes:', 'رموز سريعة:')}</span>
            <button
              type="button"
              onClick={() => setEmergencyPhone('+213 ')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono-code"
            >
              🇩🇿 +213
            </button>
            <button
              type="button"
              onClick={() => setEmergencyPhone('+966 ')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono-code"
            >
              🇸🇦 +966
            </button>
          </div>
        </div>

        {/* Input and Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8 relative">
            <input
              id="input-emergency-contact-phone"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => {
                setEmergencyPhone(e.target.value);
                setIsSaved(false);
              }}
              placeholder="${translateInline(lang, '+44 7911 123456 or +1 202 555 0123', '+213 661 12 34 56 أو +966 50 123 4567')}"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-amber-400 focus:outline-none text-slate-100 font-mono-code text-sm font-bold placeholder-slate-600 transition"
              dir="ltr"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <button
              id="btn-save-emergency-phone"
              type="button"
              onClick={handleSavePhone}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{translateInline(lang, 'Save Number', 'حفظ وتأكيد')}</span>
            </button>
          </div>
        </div>

        {/* Important Warning */}
        <div className="mt-3 mb-2 p-3.5 rounded-xl bg-slate-900/60 border border-amber-500/30 flex items-start gap-2.5 text-xs text-slate-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-amber-400">{translateInline(lang, 'Important Alert:', 'تنبيه مهم:')}</strong>{' '}
            {translateInline(
              lang,
              "Please enter a phone number of a close contact or your other phone. Do not enter this phone's own SIM number, so you can receive the reports and GPS coordinates when it is lost.",
              'يرجى إدخال رقم هاتف شخص قريب أو هاتف آخر لك، ولا تقم بإدخال رقم شريحة (SIM) هذا الهاتف نفسه حتى تصلك البلاغات وإحداثيات الموقع عند فقدانه.'
            )}
          </p>
        </div>

        {/* Feedback message */}
        {saveFeedback && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 text-xs font-mono-code text-amber-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}
      </div>

      {/* 2. Dual SMS Dispatch Engine Architecture Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100">
              {translateInline(lang, 'Synchronous Dual SMS Dispatch Engine', 'محرك الإرسال المتزامن المزدوج (Dual SMS Dispatch)')}
            </h3>
            <p className="text-xs text-slate-400">
              {translateInline(lang, 'Broadcasts GPS coordinates instantly and simultaneously upon command trigger', 'عند استقبال رسالة أمر أو تفعيل وضع السرقة، يتم بث رسالة SMS برابط الموقع المباشر في آن واحد')}
            </p>
          </div>
        </div>

        {/* Visual Synchronous Branch Diagram */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>{translateInline(lang, 'Synchronous Dispatch Pathway:', 'مسار الإرسال المتزامن:')}</span>
            <span className="text-[10px] text-cyan-400 font-mono-code bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">{translateInline(lang, 'SIMULTANEOUS DUAL BROADCAST', 'SIMULTANEOUS DUAL BROADCAST')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Target 1: Emergency Phone */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{translateInline(lang, 'Target 1: Primary Emergency Phone', 'المستلم 1: رقم الطوارئ المعتمد')}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono-code font-bold">
                  {translateInline(lang, 'Static & Verified', 'ثابت ومؤكد')}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-200">
                {emergencyPhone || (translateInline(lang, 'Not configured', 'لم يُحدد بعد'))}
              </p>
              <p className="text-[11px] text-slate-400">
                {translateInline(lang, 'Receives direct Google Maps GPS tracking link via SMS.', 'يستلم رابط موقع GPS المباشر وإحداثيات الخريطة بدقة عالية عبر رسالة SMS.')}
              </p>
            </div>

            {/* Target 2: Command Sender */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>{translateInline(lang, 'Target 2: Trigger Command Sender', 'المستلم 2: رقم مرسل أمر التتبع')}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono-code font-bold">
                  {translateInline(lang, 'Dynamic', 'ديناميكي')}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-200">
                {translateInline(lang, 'Any phone sending #TRACK', 'أي هاتف يرسل أمر التتبع')}
              </p>
              <p className="text-[11px] text-slate-400">
                {translateInline(lang, 'Instantly replies to the phone that sent the secret SMS trigger command.', 'إذا أرسل شخص أمر #TRACK من أي هاتف، يُرسل له الرد برابط الموقع فوراً وبشكل مستقل.')}
              </p>
            </div>
          </div>

          {/* SIM 1 & SIM 2 Fallback Explanation */}
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300/90 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {translateInline(lang, '✓ Automatic Dual-SIM Fallback: If SIM 1 fails due to lack of signal or credit, SIM 2 immediately handles dispatch.', '✓ يدعم النظام التبديل التلقائي بين الشريحتين (SIM 1 و SIM 2 Fallback): إذا تعثرت شريحة 1 لأي سبب (انعدام رصيد أو شبكة)، يتم فوراً تحويل الإرسال إلى شريحة 2 لضمان وصول الرسالة.')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Dual SIM Management & Carrier Detection Card */}
      <div>
        <DualSimNetworkCard
          lang={lang}
          onTriggerStealthStolen={onTriggerStealthStolen}
          onLogDispatch={onLogDispatch}
        />
      </div>
    </div>
  );
};
