import React, { useState, useEffect } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  MessageSquareWarning,
  MessageSquare,
  PhoneCall,
  Save,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Info,
  Check,
  Copy,
  Layers,
  Sparkles,
  Wrench,
  Settings,
  ExternalLink,
  X,
  Send,
  MapPin,
} from 'lucide-react';
import { Language, DispatchEvent, SecurityConfig } from '../types';
import {
  getEmergencyContactPhone,
  saveEmergencyContactPhone,
  isValidPhoneNumber,
  DEFAULT_EMERGENCY_PHONE,
} from '../utils/emergencyContact';
import {
  checkSmsPermissionStatus,
  requestDirectSmsPermission,
  requestBackgroundActivityPermission,
  openDeveloperSettings,
  openAppSettings,
  checkDeviceAdminStatus,
  requestDeviceAdmin,
  openDeviceAdminSettings,
  lockDeviceNow,
  openPremiumSmsSettings,
  checkIsDefaultSmsApp,
  requestSetDefaultSmsApp,
  openAccessibilitySettings,
  sendSilentBackgroundSms,
  sanitizePhoneNumber,
  sendFallbackIntentSms,
} from '../utils/nativeEmergencySms';
import { Capacitor } from '@capacitor/core';
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
  const [smsPermissionGranted, setSmsPermissionGranted] = useState<boolean | null>(null);
  const [deviceAdminActive, setDeviceAdminActive] = useState<boolean | null>(null);
  const [isDefaultSms, setIsDefaultSms] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);
  const [isActivatingAdmin, setIsActivatingAdmin] = useState<boolean>(false);
  const [isSettingDefaultSms, setIsSettingDefaultSms] = useState<boolean>(false);
  const [isSendingTestSms, setIsSendingTestSms] = useState<boolean>(false);

  // Load emergency contact phone, check SEND_SMS, Device Admin, and Default SMS status
  const refreshSecurityStatus = async () => {
    if (Capacitor.isNativePlatform()) {
      const [smsGranted, adminActive, defaultSms] = await Promise.all([
        checkSmsPermissionStatus(),
        checkDeviceAdminStatus(),
        checkIsDefaultSmsApp(),
      ]);
      setSmsPermissionGranted(smsGranted);
      setDeviceAdminActive(adminActive);
      setIsDefaultSms(defaultSms);
    } else {
      setSmsPermissionGranted(false);
      setDeviceAdminActive(false);
      setIsDefaultSms(false);
    }
  };

  useEffect(() => {
    async function loadPhoneAndCheckPerm() {
      const phone = await getEmergencyContactPhone(config.emergencyContactPhone);
      setEmergencyPhone(phone);
      setIsSaved(Boolean(phone));
      await refreshSecurityStatus();
    }
    loadPhoneAndCheckPerm();

    const handleFocus = () => {
      refreshSecurityStatus();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [config.emergencyContactPhone]);

  // Activate Device Administrator Rights Handler (Direct Intent with fallback to Settings)
  const handleActivateDeviceAdmin = async () => {
    setIsActivatingAdmin(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await requestDeviceAdmin();
        if (result.alreadyActive || result.isAdmin) {
          setDeviceAdminActive(true);
          setSaveFeedback(
            translateInline(
              lang,
              '✓ Device Administrator protection is active & elevated priority enabled!',
              '✓ صلاحية مسؤول الجهاز (Device Admin) مفعّلة بالفعل! تم تعزيز أولوية النظام وأمان الخلفية.'
            )
          );
        } else if (result.success) {
          setSaveFeedback(
            translateInline(
              lang,
              'ℹ️ System activation dialog opened. Please tap "Activate this device admin app".',
              'ℹ️ تم فتح نافذة تفعيل مسؤول الجهاز. يرجى الضغط على "تفعيل تطبيق مشرف هذا الجهاز".'
            )
          );
        } else {
          // Direct intent encountered OEM restriction, open Device Admin settings list
          await openDeviceAdminSettings();
          setSaveFeedback(
            translateInline(
              lang,
              'ℹ️ Opened Device Admin Settings. Please toggle Anti-Theft Security to ON.',
              'ℹ️ تم فتح قائمة مسؤولي الجهاز في الإعدادات. يرجى تفعيل مفتاح Anti-Theft Security.'
            )
          );
        }
      } else {
        setSaveFeedback(
          translateInline(
            lang,
            'ℹ️ Device Administrator requires running on an Android device via native DevicePolicyManager.',
            'ℹ️ صلاحية مسؤول الجهاز (Device Admin) هي ميزة لنظام أندرويد لحماية الهاتف وقفل الشاشة وتجاوز القيود.'
          )
        );
      }
    } catch {
      await openDeviceAdminSettings();
    } finally {
      setIsActivatingAdmin(false);
      setTimeout(() => setSaveFeedback(null), 6000);
    }
  };

  // Direct Settings Opener for Device Administrator (Bypasses any OEM black screen)
  const handleOpenDeviceAdminSettingsDirectly = async () => {
    setIsActivatingAdmin(true);
    try {
      await openDeviceAdminSettings();
      setSaveFeedback(
        translateInline(
          lang,
          'ℹ️ Opened Device Admin Settings. Please activate DroidGuard / Anti-Theft Security in the list.',
          'ℹ️ تم فتح قائمة مسؤولي الجهاز في الإعدادات. يرجى تفعيل مفتاح Anti-Theft Security من القائمة مباشرة.'
        )
      );
    } finally {
      setIsActivatingAdmin(false);
      setTimeout(() => setSaveFeedback(null), 6000);
    }
  };

  // Immediate Hardware Screen Lock Test
  const handleTestLockScreen = async () => {
    if (!deviceAdminActive) {
      handleActivateDeviceAdmin();
      return;
    }
    const locked = await lockDeviceNow();
    if (locked) {
      setSaveFeedback(
        translateInline(
          lang,
          '🔒 Hardware screen lock executed successfully via DevicePolicyManager!',
          '🔒 تم قفل شاشة الهاتف فورياً بنجاح بواسطة مسؤول الجهاز (DevicePolicyManager)!'
        )
      );
    }
  };

  // Set as Default SMS App Handler
  const handleSetDefaultSms = async () => {
    setIsSettingDefaultSms(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await requestSetDefaultSmsApp();
        if (result.isDefault) {
          setIsDefaultSms(true);
          setSaveFeedback(
            translateInline(
              lang,
              '✓ DroidGuard is now the Default SMS application! Background emergency SMS dispatch enabled.',
              '✓ تم تعيين DroidGuard كتطبيق الرسائل الافتراضي بنجاح! تم تفعيل إرسال رسائل الطوارئ في الخلفية.'
            )
          );
        } else {
          setSaveFeedback(
            translateInline(
              lang,
              'ℹ️ System Default SMS dialog opened. Please select DroidGuard and confirm.',
              'ℹ️ تم فتح نافذة النظام لاختيار تطبيق الرسائل الافتراضي. يرجى تحديد DroidGuard والتأكيد.'
            )
          );
        }
      } else {
        setSaveFeedback(
          translateInline(
            lang,
            'ℹ️ Default SMS application role is an Android system feature.',
            'ℹ️ ميزة تطبيق الرسائل الافتراضي هي ميزة نظام أندرويد لتجاوز نوافذ تأكيد الإرسال.'
          )
        );
      }
    } finally {
      setIsSettingDefaultSms(false);
      setTimeout(() => setSaveFeedback(null), 6000);
    }
  };

  // Instant Silent Background SMS Dispatch (No user interaction / No send button click required)
  const handleSendInstantSilentTest = async () => {
    const targetPhone = emergencyPhone && emergencyPhone.trim() ? emergencyPhone.trim() : '0563752023';
    setIsSendingTestSms(true);
    setSaveFeedback(null);

    try {
      const now = new Date().toLocaleTimeString();
      const testMessage = `🚨 [اختبار إرسال صامت DroidGuard]\nتم إرسال هذه الرسالة في الخلفية فوراً وبصمت تام دون فتح تطبيق الرسائل الافتراضي.\nالتوقيت: ${now}`;

      if (Capacitor.isNativePlatform()) {
        const sendResult = await sendSilentBackgroundSms(targetPhone, testMessage);
        if (sendResult.success) {
          setSaveFeedback(
            translateInline(
              lang,
              `✓ Silent background SMS dispatched immediately to ${targetPhone} via Android native SmsManager!`,
              `✓ تم إرسال رسالة SMS في الخلفية فوراً وبصمت تام إلى ${targetPhone} دون أي تفاعل!`
            )
          );
          onLogDispatch({
            recipient: targetPhone,
            type: 'emergency_sms',
            content: `[إرسال صامت فوري في الخلفية] تم الإرسال بنجاح إلى ${targetPhone} عبر SmsManager`,
            status: 'delivered',
            timestamp: now,
          });
        } else {
          setSaveFeedback(
            translateInline(
              lang,
              `⚠️ Failed to send silent SMS: ${sendResult.error || 'Check SEND_SMS permission or default app status.'}`,
              `⚠️ تعذر الإرسال في الخلفية: ${sendResult.error || 'يرجى التأكد من منح إذن SEND_SMS أو تعيين التطبيق كافتراضي.'}`
            )
          );
          onLogDispatch({
            recipient: targetPhone,
            type: 'emergency_sms',
            content: `[فشل الإرسال الصامت] ${sendResult.error || 'Unknown error'}`,
            status: 'failed',
            timestamp: now,
          });
        }
      } else {
        setSaveFeedback(
          translateInline(
            lang,
            `ℹ️ Web Preview Simulation: Background SMS payload prepared for ${targetPhone}. On native Android, this executes instantly without user click.`,
            `ℹ️ محاكاة معاينة الويب: كود الإرسال في الخلفية جاهز لـ ${targetPhone}. على هاتف أندرويد الحقيقي، يتم الإرسال الصامت فوراً في الخلفية دون أي نافذة.`
          )
        );
        onLogDispatch({
          recipient: targetPhone,
          type: 'emergency_sms',
          content: `[محاكاة إرسال صامت في الخلفية] الإرسال التلقائي جاهز لـ ${targetPhone}`,
          status: 'delivered',
          timestamp: now,
        });
      }
    } catch (err: any) {
      setSaveFeedback(
        translateInline(
          lang,
          `❌ Error during silent dispatch: ${err?.message || 'Unknown error'}`,
          `❌ خطأ أثناء الإرسال الصامت: ${err?.message || 'خطأ غير معروف'}`
        )
      );
    } finally {
      setIsSendingTestSms(false);
      setTimeout(() => setSaveFeedback(null), 8000);
    }
  };

  // Fallback Intent Method (Opens system SMS app)
  const handleSendFallbackIntentTest = async () => {
    const targetPhone = emergencyPhone && emergencyPhone.trim() ? emergencyPhone.trim() : '0563752023';
    setIsSendingTestSms(true);
    setSaveFeedback(null);

    try {
      const now = new Date().toLocaleTimeString();
      const testMessage = `🚨 [اختبار إرسال عبر تطبيق الرسائل - Fallback]\nالتوقيت: ${now}`;

      if (Capacitor.isNativePlatform()) {
        const success = await sendFallbackIntentSms(targetPhone, testMessage);
        if (success) {
           setSaveFeedback(
            translateInline(
              lang,
              `✓ Opened default SMS app intent for ${targetPhone}`,
              `✓ تم فتح تطبيق الرسائل الخاص بالنظام للإرسال إلى ${targetPhone}`
            )
          );
        } else {
           setSaveFeedback(
            translateInline(
              lang,
              `⚠️ Failed to open default SMS app intent.`,
              `⚠️ فشل فتح تطبيق رسائل النظام.`
            )
          );
        }
      } else {
         setSaveFeedback(
            translateInline(
              lang,
              `ℹ️ Web Preview Simulation: SMS intent prepared.`,
              `ℹ️ محاكاة ويب: أمر فتح تطبيق الرسائل جاهز.`
            )
          );
      }
    } catch (err: any) {
      setSaveFeedback(
        translateInline(
          lang,
          `❌ Error: ${err?.message || 'Unknown error'}`,
          `❌ خطأ: ${err?.message || 'خطأ غير معروف'}`
        )
      );
    } finally {
      setIsSendingTestSms(false);
      setTimeout(() => setSaveFeedback(null), 8000);
    }
  };

  // Explicit permission request action
  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const granted = await requestDirectSmsPermission();
        setSmsPermissionGranted(granted);
        if (granted) {
          setSaveFeedback(
            translateInline(
              lang,
              '✓ SEND_SMS permission granted by user! Silent background dispatch is fully armed.',
              '✓ تم منح صلاحية إرسال الرسائل (SEND_SMS) بنجاح! الإرسال الصامت في الخلفية جاهز للعمل.'
            )
          );
        } else {
          setSaveFeedback(
            translateInline(
              lang,
              '⚠️ SEND_SMS permission was denied. DroidGuard cannot send silent background SMS without this permission.',
              '⚠️ تم رفض إذن SEND_SMS. لن يتمكن التطبيق من إرسال رسائل الطوارئ الصامتة حتى تمنح الإذن.'
            )
          );
        }
      } else {
        setSaveFeedback(
          translateInline(
            lang,
            'ℹ️ Web preview environment: SEND_SMS permission is an Android native runtime permission (requires running on an Android device).',
            'ℹ️ بيئة معاينة الويب: إذن SEND_SMS هو إذن أندرويد أصلي (يتطلب تثبيت التطبيق على هاتف أندرويد حقيقي).'
          )
        );
      }
    } finally {
      setIsRequestingPermission(false);
      setTimeout(() => setSaveFeedback(null), 6000);
    }
  };

  const handleRequestBackgroundActivity = async () => {
    try {
      const granted = await requestBackgroundActivityPermission();
      if (granted) {
        setSaveFeedback(translateInline(lang, '✓ Opened battery optimization settings. Please grant unrestricted background activity (Essential for Condor, Samsung, Xiaomi & Realme).', '✓ تم فتح إعدادات تحسين البطارية. يرجى السماح بالعمل في الخلفية (ضروري لهواتف كوندور، سامسونج، شاومي، وريلمي).'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenDevOptions = async () => {
    try {
      const ok = await openDeveloperSettings();
      if (ok) {
        setSaveFeedback(
          translateInline(
            lang,
            '✓ Opened Developer Options! Scroll down to find "Disable permission monitoring" and turn it ON.',
            '✓ تم فتح خيارات المطور! مرر للأسفل وابحث عن "تعطيل مراقبة الأذونات" (Disable permission monitoring) وفعّلها لإيقاف نافذة العد التنازلي نهائياً.'
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAppSettings = async () => {
    try {
      const ok = await openAppSettings();
      if (ok) {
        setSaveFeedback(
          translateInline(
            lang,
            '✓ Opened App Details settings.',
            '✓ تم فتح صفحة معلومات التطبيق.'
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePhone = async () => {
    if (!isValidPhoneNumber(emergencyPhone)) {
      setSaveFeedback(
        translateInline(lang, '❌ Please enter a valid international phone number', '❌ يرجى إدخال رقم هاتف صحيح بصيغة دولية (مثال: +213661123456 أو +966501234567)')
      );
      return;
    }

    // Step 3 requirement: Prompt user to grant SEND_SMS permission when configuring emergency contact
    let permissionOk = smsPermissionGranted;
    if (Capacitor.isNativePlatform() && !permissionOk) {
      setIsRequestingPermission(true);
      try {
        permissionOk = await requestDirectSmsPermission();
        setSmsPermissionGranted(permissionOk);
      } catch (e) {
        console.warn('SMS permission prompt error:', e);
      } finally {
        setIsRequestingPermission(false);
      }
    }

    const sanitized = sanitizePhoneNumber(emergencyPhone);
    await saveEmergencyContactPhone(sanitized);
    setIsSaved(true);
    onChangeConfig({
      ...config,
      emergencyContactPhone: sanitized,
    });

    if (Capacitor.isNativePlatform()) {
      if (permissionOk) {
        setSaveFeedback(
          translateInline(
            lang,
            '✓ SEND_SMS permission granted & emergency contact saved successfully!',
            '✓ تم منح إذن SMS (SEND_SMS) وحفظ رقم هاتف الطوارئ المعتمد بنجاح في عتاد الهاتف!'
          )
        );
      } else {
        setSaveFeedback(
          translateInline(
            lang,
            '⚠️ Emergency phone saved, but SEND_SMS permission was NOT granted. Background SMS will fail until permission is allowed in Android Settings.',
            '⚠️ تم حفظ رقم الطوارئ، ولكن لم يتم منح إذن SMS (SEND_SMS). لن يتم إرسال الرسائل الصامتة حتى تسمح بالإذن.'
          )
        );
      }
    } else {
      setSaveFeedback(
        translateInline(
          lang,
          '✓ Emergency contact saved. (Note: Silent background SMS will use native Android SmsManager when installed on device).',
          '✓ تم حفظ واعتماد رقم هاتف الطوارئ في الذاكرة الدائمة بنجاح! (ملاحظة: يتطلب الإرسال الصامت المباشر تشغيل التطبيق على أندرويد مع إذن SEND_SMS).'
        )
      );
    }

    setTimeout(() => {
      setSaveFeedback(null);
    }, 6000);
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

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300 font-mono-code">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{translateInline(lang, 'Dual-SIM Fallback Support', 'التبديل الذكي بين الشريحتين')}</span>
            </div>
            {smsPermissionGranted && isSaved && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{translateInline(lang, 'Live Google Maps Tracking', 'تتبع موقع Google Maps')}</span>
            </div>
            {smsPermissionGranted && config.isGpsTrackingEnabled && isSaved && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{translateInline(lang, 'Silent Background Dispatch', 'الإرسال الصامت في الخلفية')}</span>
            </div>
            {smsPermissionGranted && deviceAdminActive && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
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
            <span className="text-slate-500">{translateInline(lang, 'Quick Codes:', 'رموز سريعة:')}</span>
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

        {/* Android SEND_SMS Native Permission Banner */}
        <div
          id="sms-permission-status-banner"
          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            smsPermissionGranted
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5">
            {smsPermissionGranted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <div className="text-xs font-bold font-mono-code flex items-center gap-2">
                <span>
                  {smsPermissionGranted
                    ? translateInline(
                        lang,
                        'Android SEND_SMS Permission: GRANTED & ARMED ✓',
                        'إذن إرسال الرسائل الصامتة (SEND_SMS): مفعّل ومصرّح به ✓'
                      )
                    : translateInline(
                        lang,
                        'Android SEND_SMS Permission: REQUIRED FOR SILENT DISPATCH ⚠️',
                        'إذن أندرويد (SEND_SMS) مطلوب للإرسال الصامت في الخلفية ⚠️'
                      )}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                {smsPermissionGranted
                  ? translateInline(
                      lang,
                      'Emergency SMS & live GPS coordinates will dispatch silently via Android native SmsManager without opening the default messaging app.',
                      'سيتم إرسال رسائل الطوارئ ورابط موقع GPS بصمت تام في الخلفية عبر Android SmsManager مباشرة دون فتح تطبيق الرسائل الافتراضي.'
                    )
                  : translateInline(
                      lang,
                      'DroidGuard requires the SEND_SMS runtime permission to transmit silent distress signals and GPS links in the background upon theft.',
                      'يحتاج تطبيق DroidGuard لإذن SEND_SMS لإرسال بلاغات الطوارئ وإحداثيات GPS في الخلفية تلقائياً وبصمت تام عند وقوع السرقة.'
                    )}
              </p>
            </div>
          </div>

          {!smsPermissionGranted && (
            <button
              id="btn-grant-sms-permission"
              type="button"
              onClick={handleRequestPermission}
              disabled={isRequestingPermission}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono-code transition cursor-pointer shadow-md shadow-amber-950/40 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isRequestingPermission
                  ? translateInline(lang, 'Requesting...', 'جاري الطلب...')
                  : translateInline(lang, 'Grant SEND_SMS Permission', 'منح إذن SEND_SMS الآن')}
              </span>
            </button>
          )}
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
              placeholder={translateInline(lang, '+1 202 555 0123', '+1 202 555 0123 / +966 5X XXX XXXX')}
              className="w-full px-4 py-3 pl-10 rounded-2xl bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-amber-400 focus:outline-none text-slate-100 font-mono-code text-sm font-bold placeholder-slate-600 transition"
              dir="ltr"
            />
            {isSaved && smsPermissionGranted && (
              <div className="absolute top-1/2 -translate-y-1/2 left-3 flex items-center justify-center" title="Fully Enabled & Ready">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
            )}
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

      {/* 3. Dual SIM Management & Carrier Detection Card (Hidden) */}
      <div className="hidden">
        <DualSimNetworkCard
          lang={lang}
          onTriggerStealthStolen={onTriggerStealthStolen}
          onLogDispatch={onLogDispatch}
        />
      </div>
    </div>
  );
};
