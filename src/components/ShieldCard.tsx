import React, { useState, useEffect } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Lock,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { Language, DispatchEvent } from '../types';
import { AsyncStorage, STORAGE_KEYS } from '../utils/storage';
import {
  getDeviceAdminStatus,
  activateDeviceAdminPolicy,
  DeviceAdminStatus,
  DEVICE_ADMIN_POLICIES,
} from '../utils/deviceManagerPolicy';
import { authenticateAsync } from '../utils/localAuthentication';
import { siren } from '../utils/audio';

interface ShieldCardProps {
  lang: Language;
  onSecurityLog?: (event: DispatchEvent) => void;
  className?: string;
}

export const ShieldCard: React.FC<ShieldCardProps> = ({
  lang,
  onSecurityLog,
  className = '',
}) => {
  const [adminStatus, setAdminStatus] = useState<DeviceAdminStatus>({
    isAdminActive: true,
    isAntiUninstallActive: true,
    packageName: 'com.droidguard.security.antitheft',
    receiverComponent: 'com.droidguard.receiver.DroidGuardDeviceAdminReceiver',
    policies: DEVICE_ADMIN_POLICIES,
  });

  // Direct native authentication state
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [rejectionAlert, setRejectionAlert] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Load initial status from AsyncStorage
  useEffect(() => {
    getDeviceAdminStatus().then((status) => {
      setAdminStatus(status);
    });
  }, []);

  // Biometric Success Handler
  const handleBiometricSuccess = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ADMIN_ACTIVE, 'false');
    await AsyncStorage.setItem(STORAGE_KEYS.ANTI_UNINSTALL_ACTIVE, 'false');
    setAdminStatus((prev) => ({
      ...prev,
      isAdminActive: false,
      isAntiUninstallActive: false,
    }));
    setRejectionAlert(null);
    setSuccessNotice(
      translateInline(lang, 'Owner biometric verified. Device Admin deactivated temporarily.', 'تم التحقق من بصمة المالك وإلغاء صلاحية مدير الجهاز مؤقتاً.')
    );
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Biometric Failure / Cancellation Handler
  const handleBiometricCancelOrFailed = () => {
    siren.playBriefAlert();

    const rejectMsg =
      translateInline(lang, '⛔ Operation rejected! Uninstallation blocked, app protected, and user redirected.', '⛔ تم رفض العملية تلقائياً! تم حظر محاولة إلغاء التثبيت وحماية التطبيق وإعادة التوجيه للأمان.');

    setRejectionAlert(rejectMsg);

    // Dispatch security event
    if (onSecurityLog) {
      onSecurityLog({
        id: `anti-uninstall-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('ar-EG'),
        recipient: 'Android OS Security System',
        type: 'emergency_sms',
        content: `🚨 ${translateInline(lang, '[Anti-Uninstall Block] Unauthorized attempt to uninstall DroidGuard or disable Device Admin. Blocked by biometrics and app protected.', '[Anti-Uninstall Block] محاولة غير مصرح بها لإلغاء تثبيت DroidGuard أو تعطيل صلاحية مدير الجهاز. تم الرفض البيومتري وحماية التطبيق.')}`,
        status: 'delivered',
      });
    }

    setTimeout(() => {
      setRejectionAlert(null);
    }, 6000);
  };

  // Handle Toggle of Device Admin / Anti-Uninstall
  const handleToggleAdmin = async () => {
    if (isAuthenticating) return;

    if (adminStatus.isAntiUninstallActive) {
      // Trying to TURN OFF -> MUST prompt Android native biometrics directly!
      setIsAuthenticating(true);
      try {
        const authRes = await authenticateAsync({
          promptMessage: translateInline(
            lang,
            'Biometric verification required to deactivate Device Administrator',
            'تأكيد الهوية البيومترية لإلغاء صلاحية مدير الجهاز (Device Admin Deactivation)'
          ),
          cancelLabel: translateInline(lang, 'Cancel', 'إلغاء'),
          fallbackLabel: translateInline(lang, 'Use PIN/Pattern', 'استخدام رمز PIN أو النمط'),
          disableDeviceFallback: false,
        });

        if (authRes.success) {
          await handleBiometricSuccess();
        } else {
          handleBiometricCancelOrFailed();
        }
      } catch {
        handleBiometricCancelOrFailed();
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      // Turning ON -> Safe to enable
      await activateDeviceAdminPolicy();
      setAdminStatus((prev) => ({
        ...prev,
        isAdminActive: true,
        isAntiUninstallActive: true,
      }));
      setSuccessNotice(
        translateInline(lang, 'Device Admin Policy & Anti-Uninstall activated successfully!', 'تم تفعيل صلاحية مدير الجهاز وحماية إلغاء التثبيت بنجاح!')
      );
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  return (
    <div
      className={`p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl border transition-all ${
              adminStatus.isAntiUninstallActive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 font-mono-code">
                {translateInline(lang, 'Anti-Uninstall & Device Admin Policy', 'حماية إلغاء التثبيت وصلاحية مدير الجهاز')}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {translateInline(lang, 'Prevent uninstallation from Android settings with mandatory biometric check', 'منع إلغاء تثبيت التطبيق من إعدادات أندرويد مع التحقق البيومتري الإلزامي')}
            </p>
          </div>
        </div>

        {/* Anti-Uninstall Active Badge */}
        <div className="flex items-center gap-2">
          {adminStatus.isAntiUninstallActive ? (
            <span
              id="anti-uninstall-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/40 animate-pulse"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anti-Uninstall Active</span>
            </span>
          ) : (
            <span
              id="anti-uninstall-badge-inactive"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Anti-Uninstall Inactive</span>
            </span>
          )}
        </div>
      </div>

      {/* REJECTION ALERT BANNER */}
      {rejectionAlert && (
        <div className="p-3.5 rounded-2xl bg-rose-950/70 border-2 border-rose-500/50 text-xs font-mono-code text-rose-200 flex items-start gap-2.5 shadow-lg shadow-rose-950/60 animate-bounce">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-rose-300 block">{rejectionAlert}</span>
            <span className="text-[11px] text-rose-200/80 block">
              {translateInline(lang, '🔒 Device Admin active, operation aborted and user redirected to protect device.', '🔒 صلاحية مدير الجهاز نشطة، تم إحباط العملية وإعادة توجيه المستخدم لحماية جهازك.')}
            </span>
          </div>
        </div>
      )}

      {/* SUCCESS NOTICE BANNER */}
      {successNotice && (
        <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-xs font-mono-code text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Feature Description & Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono-code">
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>{translateInline(lang, 'Device Admin Unit (DevicePolicyManager):', 'وحدة مدير الجهاز (DevicePolicyManager):')}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {translateInline(lang, 'Bound to DroidGuardDeviceAdminReceiver to disable Android "Uninstall" button.', 'مربوط بمكون DroidGuardDeviceAdminReceiver لمنع زر "إلغاء التثبيت" في نظام أندرويد من العمل.')}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-500">Receiver:</span>
            <span className="text-emerald-400 font-bold">DeviceAdminReceiver</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Fingerprint className="w-4 h-4 text-amber-400" />
            <span>{translateInline(lang, 'Biometric Auth (expo-local-authentication):', 'التحقق البيومتري (expo-local-authentication):')}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {translateInline(lang, 'Requires Fingerprint, Face ID, or system PIN for any deactivation attempt.', 'يشترط بصمة الإصبع، التعرف على الوجه، أو PIN النظام لأي محاولة تعطيل أو خروج.')}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-500">Fallback:</span>
            <span className="text-cyan-400 font-bold">Android OS PIN / Pattern</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Toggle Admin Active Button */}
        <button
          type="button"
          id="btn-toggle-device-admin"
          onClick={handleToggleAdmin}
          className={`px-4 py-2.5 rounded-2xl text-xs font-mono-code font-bold flex items-center gap-2 transition cursor-pointer shadow-md ${
            adminStatus.isAntiUninstallActive
              ? 'bg-slate-800 hover:bg-rose-500/20 text-slate-200 border border-slate-700 hover:border-rose-500/40'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>
            {adminStatus.isAntiUninstallActive
              ? translateInline(lang, 'Deactivate Protection (Biometrics Required)', 'تعطيل الحماية (يتطلب التحقق البيومتري)')
              : translateInline(lang, 'Activate Anti-Uninstall Protection Now', 'تفعيل حماية إلغاء التثبيت الآن')}
          </span>
        </button>
      </div>
    </div>
  );
};
