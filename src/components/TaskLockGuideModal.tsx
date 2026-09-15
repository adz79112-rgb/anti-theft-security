import React, { useState } from 'react';
import { X, Lock, Zap, BatteryCharging, CheckCircle2, Smartphone, ShieldCheck, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { translateInline } from '../utils/translateInline';
import { openManufacturerAutostartSettings, requestIgnoreBatteryOptimization } from '../utils/nativeEmergencySms';

interface TaskLockGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  batteryIgnored?: boolean;
  onRefreshBatteryStatus?: () => void;
}

export const TaskLockGuideModal: React.FC<TaskLockGuideModalProps> = ({
  isOpen,
  onClose,
  lang,
  batteryIgnored,
  onRefreshBatteryStatus,
}) => {
  const [activeBrandTab, setActiveBrandTab] = useState<'coloros' | 'miui' | 'oneui' | 'general'>('coloros');
  const [launchingAutostart, setLaunchingAutostart] = useState(false);
  const [requestingBattery, setRequestingBattery] = useState(false);

  if (!isOpen) return null;

  const handleOpenAutostart = async () => {
    setLaunchingAutostart(true);
    try {
      await openManufacturerAutostartSettings();
    } finally {
      setTimeout(() => setLaunchingAutostart(false), 800);
    }
  };

  const handleRequestBattery = async () => {
    setRequestingBattery(true);
    try {
      await requestIgnoreBatteryOptimization();
      if (onRefreshBatteryStatus) {
        setTimeout(onRefreshBatteryStatus, 1000);
      }
    } finally {
      setTimeout(() => setRequestingBattery(false), 800);
    }
  };

  return (
    <div
      id="task-lock-guide-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="task-lock-guide-modal-content"
        className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Top Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />

        {/* Close Button */}
        <button
          id="btn-close-task-lock-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mt-2 px-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Lock className="w-7 h-7 text-cyan-300" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {translateInline(
              lang,
              'Background Shield & Task Lock Guide',
              'حماية الخلفية: دليل التشغيل التلقائي وقفل التطبيق'
            )}
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            {translateInline(
              lang,
              'To ensure DroidGuard automatically sends SMS even after swiping apps from recent tasks, complete these two critical device settings.',
              'لكي يظل التطبيق نشطاً ويضغط زر إرسال الرسالة تلقائياً حتى لو قمت بمسح التطبيقات من الخلفية، يلزم تطبيق الخطوتين التاليتين:'
            )}
          </p>
        </div>

        {/* Step 1: Battery Optimization Exemption */}
        <div
          id="task-lock-step-battery"
          className={`p-4 rounded-2xl border transition-all ${
            batteryIgnored
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-indigo-950/30 border-indigo-500/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                batteryIgnored
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              <BatteryCharging className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white">
                  {translateInline(
                    lang,
                    '1. Ignore Battery Optimizations (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)',
                    '1. استثناء قيود البطارية (عدم تحسين استهلاك الطاقة)'
                  )}
                </h4>
                {batteryIgnored ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {translateInline(lang, 'EXEMPTED ✓', 'مستثنى من القيود ✓')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                    {translateInline(lang, 'RECOMMENDED', 'مطلوب')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {translateInline(
                  lang,
                  'Prevents Android from freezing the emergency listener when the screen is off or the phone is in sleep mode.',
                  'يمنع نظام أندرويد من تجميد التطبيق أو إيقاف خدمته عند إغلاق الشاشة أو توفير الطاقة.'
                )}
              </p>
              {!batteryIgnored && (
                <button
                  id="btn-request-battery-exemption"
                  type="button"
                  disabled={requestingBattery}
                  onClick={handleRequestBattery}
                  className="mt-3 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/60 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {requestingBattery
                      ? translateInline(lang, 'Opening request...', 'جارٍ فتح طلب الاستثناء...')
                      : translateInline(lang, 'Request Battery Optimization Exemption ⚡', 'طلب استثناء قيود البطارية الآن ⚡')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Autostart Manager (OEM Specific) */}
        <div
          id="task-lock-step-autostart"
          className="p-4 rounded-2xl border bg-slate-800/40 border-slate-700/60 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl shrink-0 mt-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">
                {translateInline(
                  lang,
                  '2. Enable Autostart & Background Launch',
                  '2. تفعيل التشغيل التلقائي (Autostart)'
                )}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {translateInline(
                  lang,
                  'In ColorOS, MIUI, and OneUI, autostart permission allows DroidGuard to wake up and dispatch SMS when an emergency trigger arrives.',
                  'في هواتف أوبو وريلمي وشاومي، يجب تفعيل "بدء التشغيل التلقائي" ليعيد الهاتف تشغيل الخدمة تلقائياً عند استلام أمر السرقة.'
                )}
              </p>
              <button
                id="btn-open-autostart-settings"
                type="button"
                disabled={launchingAutostart}
                onClick={handleOpenAutostart}
                className="mt-3 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>
                  {launchingAutostart
                    ? translateInline(lang, 'Opening Settings...', 'جارٍ فتح إعدادات هاتفك...')
                    : translateInline(lang, 'Open Autostart Settings on Device ⚙️', 'فتح إعدادات التشغيل التلقائي في هاتفك ⚙️')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Lock App in Recent Tasks Switcher (By Phone Brand) */}
        <div
          id="task-lock-step-recent-tasks"
          className="p-4 rounded-2xl border bg-slate-800/50 border-cyan-500/30"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">
                {translateInline(
                  lang,
                  '3. Lock App in Recent Tasks (Lock Icon 🔒)',
                  '3. قفل التطبيق برمز القفل (Lock App 🔒)'
                )}
              </h4>
            </div>
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
              {translateInline(lang, 'Crucial for Anti-Kill', 'هام جداً لمنع الإغلاق')}
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            {translateInline(
              lang,
              'When locked, pressing the "Clear All" or Trash icon in recent apps will NEVER kill DroidGuard, keeping auto-click and emergency SMS intact:',
              'عند وضع رمز القفل، لن يتم إغلاق التطبيق نهائياً عند الضغط على "إغلاق الكل" أو سلة المهملات في شاشة التطبيقات الحديثة:'
            )}
          </p>

          {/* Brand Tabs */}
          <div className="grid grid-cols-3 gap-1.5 mb-3 bg-slate-950/60 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveBrandTab('coloros')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeBrandTab === 'coloros'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OPPO / Realme
            </button>
            <button
              type="button"
              onClick={() => setActiveBrandTab('miui')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeBrandTab === 'miui'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Xiaomi / Poco
            </button>
            <button
              type="button"
              onClick={() => setActiveBrandTab('oneui')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeBrandTab === 'oneui'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Samsung / OneUI
            </button>
          </div>

          {/* Instructions Content by Brand */}
          {activeBrandTab === 'coloros' && (
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-xs space-y-2 text-slate-200">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <span>{translateInline(lang, 'Swipe up from the bottom to view Recent Tasks.', 'اسحب من أسفل الشاشة لعرض قائمة التطبيقات الحديثة.')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <span>{translateInline(lang, 'Tap the two dots (:) or pull down the DroidGuard card.', 'اضغط على النقطتين الرأسيتين (⋮) أعلى بطاقة تطبيق DroidGuard.')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <span>{translateInline(lang, 'Select "Lock" (🔒). A small padlock icon will appear.', 'اختر "قفل" (🔒). سيظهر رمز قفل بجانب اسم التطبيق ولن يتم حذفه أبداً.')}</span>
              </div>
            </div>
          )}

          {activeBrandTab === 'miui' && (
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-xs space-y-2 text-slate-200">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <span>{translateInline(lang, 'Open Recent Apps screen in MIUI / HyperOS.', 'افتح شاشة التطبيقات الحديثة في هاتفك.')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <span>{translateInline(lang, 'Long-press on the DroidGuard preview window.', 'اضغط ضغطة مطولة على نافذة تطبيق DroidGuard.')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <span>{translateInline(lang, 'Tap the Padlock icon (🔒) to lock the app in memory.', 'انقر على أيقونة القفل (🔒) لقفل التطبيق في الذاكرة.')}</span>
              </div>
            </div>
          )}

          {activeBrandTab === 'oneui' && (
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-xs space-y-2 text-slate-200">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <span>{translateInline(lang, 'Press the Recent Apps button (|||).', 'اضغط على زر التطبيقات الأخيرة (|||).')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <span>{translateInline(lang, 'Tap the DroidGuard icon at the top of the card.', 'انقر على شعار DroidGuard الدائري الموجود أعلى البطاقة.')}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <span>{translateInline(lang, 'Select "Lock this app" or "Keep open".', 'اختر "قفل هذا التطبيق" (Lock this app) ليبقى مستمراً.')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Foreground Service Guarantee Banner */}
        <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-xs text-emerald-200">
            <span className="font-bold">{translateInline(lang, 'Ongoing Notification Active:', 'الإشعار الدائم نشط:')} </span>
            <span>{translateInline(lang, '"DroidGuard: Protection active in background" with START_STICKY auto-revive.', '"DroidGuard: الحماية نشطة في الخلفية" مع ميزة START_STICKY لإعادة التشغيل الذاتي.')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            id="btn-close-task-lock-guide"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 transition cursor-pointer"
          >
            {translateInline(lang, 'Got It ✓', 'فهمت ذلك ✓')}
          </button>
        </div>
      </div>
    </div>
  );
};
