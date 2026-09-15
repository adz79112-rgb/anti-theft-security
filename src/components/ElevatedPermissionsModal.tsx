import React from 'react';
import { ShieldCheck, Settings, CheckCircle2, AlertCircle, X, Sparkles, Lock, Navigation, BatteryCharging, Smartphone, Zap } from 'lucide-react';
import { Language } from '../types';
import { translateInline } from '../utils/translateInline';

interface ElevatedPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  deviceAdminActive: boolean | null;
  locationServiceActive?: boolean | null;
  batteryIgnored?: boolean | null;
  accessibilityActive?: boolean | null;
  onActivateDeviceAdmin: () => void;
  onOpenDeviceAdminSettings: () => void;
  onOpenLocationSettings?: () => void;
  onDeactivateDeviceAdmin?: () => void;
  onRequestIgnoreBattery?: () => void;
  onOpenTaskLockGuide?: () => void;
  onOpenAccessibilitySettings?: () => void;
}

export const ElevatedPermissionsModal: React.FC<ElevatedPermissionsModalProps> = ({
  isOpen,
  onClose,
  lang,
  deviceAdminActive,
  locationServiceActive,
  batteryIgnored,
  accessibilityActive,
  onActivateDeviceAdmin,
  onOpenDeviceAdminSettings,
  onOpenLocationSettings,
  onDeactivateDeviceAdmin,
  onRequestIgnoreBattery,
  onOpenTaskLockGuide,
  onOpenAccessibilitySettings,
}) => {
  if (!isOpen) return null;

  const isAccessibilityReady = Boolean(accessibilityActive);
  const allActive = Boolean(deviceAdminActive && locationServiceActive !== false && batteryIgnored !== false && isAccessibilityReady !== false);

  return (
    <div
      id="elevated-permissions-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="elevated-permissions-modal-content"
        className="w-full max-w-lg bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Top Gradient Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500" />

        {/* Close Button */}
        <button
          id="btn-close-elevated-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mt-2 px-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-teal-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Sparkles className="w-7 h-7 text-indigo-300" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {translateInline(
              lang,
              'Elevated Security & Protection Setup',
              'إعداد الحماية القصوى ومسؤول الجهاز'
            )}
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            {translateInline(
              lang,
              'Enable Device Admin, Accessibility Service and location permissions so the app can protect against uninstall, send emergency coordinates, and lock immediately upon theft.',
              'يرجى تفعيل صلاحية مسؤول الجهاز وخدمة الوصول والموقع الجغرافي لحماية الهاتف من السرقة وإرسال إحداثيات الطوارئ فوراً وقفل الهاتف عن بُعد.'
            )}
          </p>
        </div>

        {/* Item 1: Device Administrator */}
        <div
          id="modal-step-device-admin"
          className={`p-4 rounded-2xl border transition-all ${
            deviceAdminActive
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-indigo-950/30 border-indigo-500/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                deviceAdminActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white">
                  {translateInline(
                    lang,
                    '1. Device Administrator Privileges',
                    '1. صلاحية مسؤول الجهاز (Device Admin)'
                  )}
                </h4>
                {deviceAdminActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {translateInline(lang, 'ACTIVE ✓', 'مفعلة ✓')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    {translateInline(lang, 'ACTION REQUIRED', 'مطلوب التفعيل')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {translateInline(
                  lang,
                  'Allows the app to instantly lock the screen upon theft commands and protects it from unauthorized uninstallation.',
                  'تمنح التطبيق صلاحية قفل شاشة الهاتف فوراً عند استلام أوامر السرقة وحماية التطبيق من الإلغاء.'
                )}
              </p>
              {deviceAdminActive && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 text-[11px] leading-relaxed">
                    {translateInline(
                      lang,
                      'To uninstall the app from your phone, tap here to deactivate Device Admin first:',
                      'إذا أردت حذف التطبيق من هاتفك، اضغط هنا لإلغاء تنشيط مسؤول الجهاز أولاً:'
                    )}
                  </span>
                  <button
                    id="btn-modal-deactivate-admin"
                    type="button"
                    onClick={onDeactivateDeviceAdmin}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer shrink-0 flex items-center justify-center gap-1"
                  >
                    <span>{translateInline(lang, 'Deactivate to Uninstall', 'إلغاء التفعيل لحذف التطبيق ✕')}</span>
                  </button>
                </div>
              )}
              {!deviceAdminActive && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <button
                    id="btn-modal-activate-admin-direct"
                    type="button"
                    onClick={onActivateDeviceAdmin}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/60 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{translateInline(lang, 'Activate Directly', 'تفعيل مسؤول الجهاز مباشرة')}</span>
                  </button>
                  <button
                    id="btn-modal-activate-admin-settings"
                    type="button"
                    onClick={onOpenDeviceAdminSettings}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                    title={translateInline(
                      lang,
                      'Open in settings directly if direct activation shows a black screen or closes',
                      'فتح في الإعدادات مباشرة (في حال انغلاق النافذة السابقة أو ظهور شاشة سوداء)'
                    )}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{translateInline(lang, 'Open in Settings (Fallback)', 'فتح في الإعدادات (حل بديل)')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Item 2: Accessibility Service (Auto Confirm SMS) */}
        <div
          id="modal-step-accessibility"
          className={`p-4 rounded-2xl border transition-all ${
            isAccessibilityReady
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-orange-950/30 border-orange-500/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                isAccessibilityReady
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
              }`}
            >
              <Navigation className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white">
                  {translateInline(
                    lang,
                    '2. Auto Confirm SMS (Accessibility)',
                    '2. التأكيد التلقائي للرسائل (إمكانية الوصول)'
                  )}
                </h4>
                {isAccessibilityReady ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {translateInline(lang, 'ACTIVE ✓', 'مفعلة ✓')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-orange-300 bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 rounded-full">
                    {translateInline(lang, 'ACTION REQUIRED', 'مطلوب التفعيل')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {translateInline(
                  lang,
                  'Enable the accessibility service to automatically click "Send" on SMS confirmation dialogs.',
                  'قم بتفعيل خدمة إمكانية الوصول للضغط تلقائياً على "إرسال" لتخطي نافذة تأكيد إرسال رسائل SMS.'
                )}
              </p>
              {!isAccessibilityReady && (
                <button
                  id="btn-modal-activate-accessibility"
                  type="button"
                  onClick={onOpenAccessibilitySettings}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-orange-950/60 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{translateInline(lang, 'Open Accessibility Settings', 'فتح إعدادات إمكانية الوصول للتشغيل')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Item 3: Phone GPS Location Service Toggle */}
        <div
          id="modal-step-location"
          className={`p-4 rounded-2xl border transition-all ${
            locationServiceActive
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-amber-950/30 border-amber-500/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                locationServiceActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <Navigation className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white">
                  {translateInline(
                    lang,
                    '3. Phone Location Services (GPS Hardware)',
                    '3. خدمة الموقع الجغرافي بالهاتف (ميزة GPS والأقمار الصناعية)'
                  )}
                </h4>
                {locationServiceActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {translateInline(lang, 'ACTIVE ✓', 'مفعلة ✓')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    {translateInline(lang, 'TURN ON GPS', 'مطلوب تشغيل الموقع')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {translateInline(
                  lang,
                  'Must be turned ON in Android quick settings so emergency SMS can attach live Google Maps coordinates when theft is detected.',
                  'يجب تشغيل زر "الموقع" في شريط إشعارات أو إعدادات هاتفك لكي يتمكن التطبيق من إرفاق رابط موقعك المباشر في رسائل الاستغاثة.'
                )}
              </p>
              {!locationServiceActive && onOpenLocationSettings && (
                <div className="mt-3">
                  <button
                    id="btn-modal-open-location-settings"
                    type="button"
                    onClick={onOpenLocationSettings}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-950/60 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{translateInline(lang, 'Open Location Settings & Turn On GPS 📍', 'فتح إعدادات الهاتف لتشغيل الموقع (GPS) فوراً 📍')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Item 4: Battery Optimization Exemption */}
        <div
          id="modal-step-battery"
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
                    '4. Battery Optimization Exemption',
                    '4. استثناء قيود البطارية وتوفير الطاقة'
                  )}
                </h4>
                {batteryIgnored ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {translateInline(lang, 'EXEMPTED ✓', 'مستثنى من التوفير ✓')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                    {translateInline(lang, 'REQUIRED', 'مطلوب')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {translateInline(
                  lang,
                  'Allows the background protection service to stay alive without being killed by Android Doze mode or battery savers.',
                  'يمنع النظام من إيقاف الخدمة في الخلفية عند توفير الطاقة، مما يضمن استجابة الهاتف لرسائل السرقة دائماً.'
                )}
              </p>
              {!batteryIgnored && onRequestIgnoreBattery && (
                <div className="mt-3">
                  <button
                    id="btn-modal-request-battery-exemption"
                    type="button"
                    onClick={onRequestIgnoreBattery}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/60 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{translateInline(lang, 'Exempt from Battery Saver (Allow Unlimited) ⚡', 'استثناء التطبيق من قيود البطارية (سماح بلا قيود) ⚡')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Item 5: Autostart & Task Lock Guide (OEM Special) */}
        {onOpenTaskLockGuide && (
          <div
            id="modal-step-task-lock-guide"
            className="p-4 rounded-2xl border bg-cyan-950/20 border-cyan-500/30 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {translateInline(lang, 'Autostart & Recent Tasks Lock Guide', 'دليل التشغيل التلقائي وقفل التطبيق في قائمة المهام')}
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {translateInline(lang, 'ColorOS, Realme, MIUI & Samsung setup to survive app swiping.', 'إرشادات لهواتف ريلمي، أوبو، شاومي وسامسونج لمنع الحذف عند مسح التطبيقات.')}
                </p>
              </div>
            </div>
            <button
              id="btn-open-task-lock-from-modal"
              type="button"
              onClick={onOpenTaskLockGuide}
              className="w-full sm:w-auto shrink-0 py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{translateInline(lang, 'View Guide 🔒', 'عرض الدليل 🔒')}</span>
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-3">
          <p className="text-[11px] text-slate-400">
            {allActive
              ? translateInline(lang, 'All elevated protections are active! ✓', 'كافة الصلاحيات القصوى مفعلة وجاهزة! ✓')
              : translateInline(lang, 'You can reconfigure these anytime in settings.', 'يمكنك العودة وضبطها في أي وقت من الإعدادات.')}
          </p>
          <button
            id="btn-modal-continue"
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              allActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {allActive
              ? translateInline(lang, 'Completed ✓', 'تم الانتهاء ✓')
              : translateInline(lang, 'Continue to App', 'متابعة إلى التطبيق')}
          </button>
        </div>
      </div>
    </div>
  );
};
