import React, { useState, useEffect } from 'react';
import {
  Wrench,
  X,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Settings,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { Language } from '../types';
import { translateInline } from '../utils/translateInline';
import {
  getDeviceBrandInfo,
  openManufacturerAutostartSettings,
  requestBackgroundActivityPermission,
  openDeveloperSettings,
  openAppSettings,
  requestSetDefaultSmsApp,
  EmergencySmsPlugin,
  DeviceBrandInfo
} from '../utils/nativeEmergencySms';

interface UniversalOemBypassModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onActivateDeviceAdmin?: () => void;
  onActivateDefaultSms?: () => void;
}

type BrandKey = 'condor' | 'samsung' | 'xiaomi' | 'realme_oppo' | 'generic';

export const UniversalOemBypassModal: React.FC<UniversalOemBypassModalProps> = ({
  isOpen,
  onClose,
  lang,
  onActivateDeviceAdmin,
  onActivateDefaultSms,
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceBrandInfo | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandKey>('condor');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getDeviceBrandInfo().then((info) => {
        setDeviceInfo(info);
        if (info.isCondor) {
          setSelectedBrand('condor');
        } else if (info.isSamsung) {
          setSelectedBrand('samsung');
        } else if (info.isXiaomi) {
          setSelectedBrand('xiaomi');
        } else if (info.isRealmeOrOppo) {
          setSelectedBrand('realme_oppo');
        } else {
          setSelectedBrand('condor'); // default focus or generic
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleOpenAutostart = async () => {
    try {
      const res = await openManufacturerAutostartSettings();
      if (res.success) {
        showFeedback(
          translateInline(
            lang,
            `✓ Opened device power & background manager (${res.target || 'OEM settings'}). Grant unrestricted background access.`,
            `✓ تم فتح شاشة إدارة الطاقة والبدء في الخلفية (${res.target || 'إعدادات الجهاز'}). اسمح للتطبيق بالعمل دون قيود.`
          )
        );
      } else {
        await handleOpenBattery();
      }
    } catch {
      await handleOpenBattery();
    }
  };

  const handleOpenBattery = async () => {
    try {
      await requestBackgroundActivityPermission();
      showFeedback(
        translateInline(
          lang,
          '✓ Battery optimization prompt requested. Set to Unrestricted.',
          '✓ تم طلب استثناء توفير البطارية. اختر «غير مقيّد / Don\'t optimize».'
        )
      );
    } catch (e) {
      console.warn(e);
    }
  };

  const handleOpenDev = async () => {
    try {
      const ok = await openDeveloperSettings();
      if (ok) {
        showFeedback(
          translateInline(
            lang,
            '✓ Opened Developer Options. Enable "Disable permission monitoring" if available.',
            '✓ تم فتح خيارات المطور! إذا وُجد خيار "تعطيل مراقبة الأذونات" فعّله.'
          )
        );
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleOpenAppDetails = async () => {
    try {
      await openAppSettings();
      showFeedback(
        translateInline(
          lang,
          '✓ Opened App Info. Check Permissions & Restricted Settings.',
          '✓ تم فتح معلومات التطبيق. تحقق من الأذونات والإعدادات المقيدة.'
        )
      );
    } catch (e) {
      console.warn(e);
    }
  };

  const brands: { key: BrandKey; label: string; icon: string; desc: string }[] = [
    {
      key: 'condor',
      label: translateInline(lang, '🇩🇿 Condor Phones', '🇩🇿 هواتف كوندور الجزائرية'),
      icon: '🇩🇿',
      desc: translateInline(lang, 'Plume, Allure, Griffe, Peak & Algerian models', 'سلسلة Plume، Allure، Griffe، Peak ومعالجات MediaTek'),
    },
    {
      key: 'samsung',
      label: translateInline(lang, '🇰🇷 Samsung (One UI)', '🇰🇷 هواتف سامسونج'),
      icon: '🇰🇷',
      desc: translateInline(lang, 'Galaxy S/A/M/Z Series & One UI', 'أجهزة Galaxy One UI ووضع الحماية الدائمة'),
    },
    {
      key: 'xiaomi',
      label: translateInline(lang, '🇨🇳 Xiaomi / POCO', '🇨🇳 شاومي وريدمي وبوكو'),
      icon: '🇨🇳',
      desc: translateInline(lang, 'MIUI & HyperOS Security Center', 'واجهة MIUI و HyperOS وإدارة الأمان'),
    },
    {
      key: 'realme_oppo',
      label: translateInline(lang, '📱 Realme & OPPO', '📱 ريلمي وأوبو'),
      icon: '📱',
      desc: translateInline(lang, 'Realme UI & ColorOS', 'واجهة Realme UI و ColorOS وإدارة بدء التشغيل'),
    },
    {
      key: 'generic',
      label: translateInline(lang, '🌐 Stock Android / Others', '🌐 أندرويد الخام والهواتف الأخرى'),
      icon: '🌐',
      desc: translateInline(lang, 'Infinix, Tecno, Motorola, Pixel, Huawei', 'هواتف إنفينيكس، تكنو، بيكسل، موتورولا، وهواوي'),
    },
  ];

  return (
    <div
      id="universal-oem-bypass-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div
        id="universal-oem-bypass-modal-content"
        className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-teal-500/40 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto relative"
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-indigo-500 to-amber-500 rounded-t-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  {translateInline(
                    lang,
                    'Universal Multi-Brand Background & Zero-Touch Setup',
                    'مركز التوافق الشامل للهواتف (كوندور، سامسونج، شاومي، ريلمي)'
                  )}
                </h3>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  UNIVERSAL OEM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {translateInline(
                  lang,
                  'Ensure silent background emergency dispatch and zero-touch auto confirmation on your specific phone model.',
                  'دليل مخصص لكل نوع هاتف لضمان إرسال رسائل الاستغاثة في الخلفية وتخطي أي نوافذ تأكيد بصمت تام.'
                )}
              </p>
            </div>
          </div>
          <button
            id="btn-close-oem-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detected Device Banner */}
        {deviceInfo && (
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-teal-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <span className="text-slate-400 text-[11px]">
                  {translateInline(lang, 'Detected Device Hardware:', 'نوع جهازك المكتشف تلقائياً:')}
                </span>
                <p className="font-bold text-slate-200 font-mono-code">
                  {deviceInfo.manufacturer} {deviceInfo.model} ({deviceInfo.brand}) - Android SDK {deviceInfo.sdkInt}
                </p>
              </div>
            </div>
            <div className="text-right">
              {deviceInfo.isCondor && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[11px]">
                  🇩🇿 Condor Detected
                </span>
              )}
              {deviceInfo.isSamsung && (
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold text-[11px]">
                  🇰🇷 Samsung Detected
                </span>
              )}
              {deviceInfo.isXiaomi && (
                <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold text-[11px]">
                  🇨🇳 Xiaomi/POCO Detected
                </span>
              )}
              {deviceInfo.isRealmeOrOppo && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px]">
                  📱 Realme/Oppo Detected
                </span>
              )}
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {actionFeedback && (
          <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/40 text-xs font-mono-code text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Brand Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {brands.map((b) => {
            const isSelected = selectedBrand === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setSelectedBrand(b.key)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-950/50'
                    : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content for Selected Brand */}
        <div className="space-y-4">
          {/* ================= CONDOR (ALGERIA) ================= */}
          {selectedBrand === 'condor' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <span>🇩🇿</span>
                  <span>{translateInline(lang, 'Optimizations for Algerian Condor Phones (Plume / Allure / Griffe / Peak)', 'تحسينات هواتف كوندور الجزائرية (سلسلة Plume، Allure، Griffe، Peak)')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Condor phones use MediaTek chips and clean AOSP or Passion UI. In Algeria, languages are mostly French or Arabic. Follow these 3 easy steps to guarantee 100% silent background SMS and auto-confirmation:',
                    'تعتمد هواتف كوندور على معالجات MediaTek وواجهة أندرويد النقية باللغة الفرنسية أو العربية. لضمان إرسال رسائل الطوارئ في الخلفية بدون الحاجة للمس الشاشة أو الضغط على زر الإرسال، اتبع الخطوات البسيطة التالية:'
                  )}
                </p>
              </div>

              {/* Condor Step 1: Default SMS App */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                    <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>{translateInline(lang, 'Step 1: Set DroidGuard as Default SMS App', 'الخطوة 1: تعيين التطبيق كتطبيق الرسائل الافتراضي')}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono-code font-bold">SILENT SOS</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Setting DroidGuard as the Default SMS app removes all system prompt dialogs, allowing silent emergency dispatch with coordinates instantly.',
                    'تعيين DroidGuard كتطبيق الرسائل الافتراضي يلغي كافة نوافذ التأكيد، ويتيح إرسال رسائل الاستغاثة فوراً وبصمت تام في الخلفية دون الحاجة للمس الشاشة.'
                  )}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onActivateDefaultSms) {
                        onActivateDefaultSms();
                      } else {
                        requestSetDefaultSmsApp();
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{translateInline(lang, 'Set as Default SMS App', 'تعيين كتطبيق افتراضي الآن')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAppDetails}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{translateInline(lang, 'Open App Info (Permissions)', 'معلومات التطبيق (الأذونات)')}</span>
                  </button>
                </div>
              </div>

              {/* Condor Step 2: Battery & DuraSpeed */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>{translateInline(lang, 'Step 2: Disable DuraSpeed & Battery Killers', 'الخطوة 2: استثناء التطبيق من موفر الطاقة و DuraSpeed')}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono-code font-bold">BACKGROUND KEEPALIVE</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'MediaTek Condor phones include DuraSpeed background killer. Exclude Anti-Theft from battery optimization and toggle DuraSpeed permission to ON so the background listener never sleeps.',
                    'تتضمن هواتف كوندور تقنية DuraSpeed أو إدارة البطارية الذكية. يرجى استثناء التطبيق من قيود البطارية لكي تظل أوامر السرقة ورسائل الاستغاثة تعمل بصمت 24/7 حتى إذا كانت الشاشة مغلقة.'
                  )}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenAutostart}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <BatteryCharging className="w-4 h-4" />
                    <span>{translateInline(lang, 'Open Condor Power / DuraSpeed', 'فتح إدارة بطارية كوندور / DuraSpeed')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenBattery}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{translateInline(lang, 'Ignore Battery Optimization', 'استثناء البطارية العام')}</span>
                  </button>
                </div>
              </div>

              {/* Condor Step 3: Device Admin */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>{translateInline(lang, 'Step 3: Device Administrator Privileges', 'الخطوة 3: تفعيل صلاحية مسؤول الجهاز (Device Admin)')}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono-code font-bold">ANTI-UNINSTALL & LOCK</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Protects the app from being uninstalled by thieves and enables immediate hardware screen lock upon theft detection.',
                    'لحماية التطبيق من الحذف أو التعطيل بواسطة السارق، ولتمكين القفل الفوري للشاشة عند إرسال أمر القفل من أي هاتف آخر.'
                  )}
                </p>
                {onActivateDeviceAdmin && (
                  <button
                    type="button"
                    onClick={onActivateDeviceAdmin}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{translateInline(lang, 'Activate Device Admin on Condor', 'تفعيل مسؤول الجهاز في كوندور الآن')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================= SAMSUNG (ONE UI) ================= */}
          {selectedBrand === 'samsung' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-blue-950/25 border border-blue-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                  <span>🇰🇷</span>
                  <span>{translateInline(lang, 'Optimizations for Samsung Galaxy (One UI)', 'تحسينات هواتف سامسونج جالاكسي (Samsung One UI)')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Samsung One UI includes aggressive background app sleeping policies (Device Care). Apply these steps to ensure Anti-Theft Security stays active in the background forever:',
                    'تتضمن هواتف سامسونج نظام العناية بالجهاز (Device Care) الذي يضع التطبيقات في وضع السكون. اتبع هذه الخطوات لمنع النظام من تجميد التطبيق وإرسال رسائل SMS الصامتة بدون لمس الهاتف:'
                  )}
                </p>
              </div>

              {/* Samsung Step 1: Never sleeping apps */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>{translateInline(lang, 'Step 1: Add to "Never Sleeping Apps" in Device Care', 'الخطوة 1: إضافة التطبيق إلى «التطبيقات التي لا تنام أبداً»')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Open Settings ➔ Device Care (العناية بالجهاز) ➔ Battery (البطارية) ➔ Background usage limits ➔ "Never sleeping apps" (التطبيقات التي لا تنام أبداً) ➔ Tap (+) and add "Anti-Theft Security".',
                    'افتح الإعدادات ⬅️ العناية بالجهاز (Device Care) ⬅️ البطارية ⬅️ حدود الاستخدام في الخلفية ⬅️ «تطبيقات لا تنام أبداً» (Never sleeping apps) ⬅️ اضغط (+) وأضف Anti-Theft Security.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAutostart}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <BatteryCharging className="w-4 h-4" />
                  <span>{translateInline(lang, 'Open Samsung Device Care / Battery', 'فتح العناية بالجهاز في سامسونج')}</span>
                </button>
              </div>

              {/* Samsung Step 2: Default SMS App */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>{translateInline(lang, 'Step 2: Set as Default SMS App on One UI', 'الخطوة 2: تعيين التطبيق كتطبيق افتراضي للرسائل في سامسونج')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Settings ➔ Apps ➔ Choose default apps ➔ SMS app ➔ DroidGuard. This grants permission to send silent emergency SMS without Samsung dialog prompts.',
                    'الضبط ⬅️ التطبيقات ⬅️ اختيار التطبيقات الافتراضية ⬅️ تطبيق الرسائل القصيرة (SMS) ⬅️ DroidGuard. يسمح هذا بإرسال رسائل الاستغاثة فوراً وبصمت تام دون طلب تأكيد من واجهة سامسونج One UI.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onActivateDefaultSms) {
                      onActivateDefaultSms();
                    } else {
                      requestSetDefaultSmsApp();
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{translateInline(lang, 'Set as Default SMS App (Samsung)', 'تعيين كتطبيق افتراضي في سامسونج')}</span>
                </button>
              </div>

              {/* Samsung Step 3: Device Admin */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>{translateInline(lang, 'Step 3: Device Administrator', 'الخطوة 3: مسؤول الجهاز (Device Admin)')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Activates screen locking and prevents thieves from uninstalling the security app.',
                    'تفعيل مسؤول الجهاز لقفل هاتف سامسونج فوراً ومنع السارق من حذف التطبيق.'
                  )}
                </p>
                {onActivateDeviceAdmin && (
                  <button
                    type="button"
                    onClick={onActivateDeviceAdmin}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{translateInline(lang, 'Activate Device Admin for Samsung', 'تفعيل مسؤول الجهاز لسامسونج')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================= XIAOMI / REDMI / POCO ================= */}
          {selectedBrand === 'xiaomi' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-orange-950/25 border border-orange-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-orange-300 font-bold text-xs">
                  <span>🇨🇳</span>
                  <span>{translateInline(lang, 'Optimizations for Xiaomi / Redmi / POCO (MIUI & HyperOS)', 'تحسينات هواتف شاومي، ريدمي، وبوكو (MIUI & HyperOS)')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Xiaomi systems include Security Center restrictions. Enable Autostart and set Battery Saver to "No restrictions" to allow silent SOS background delivery:',
                    'تعتمد أجهزة شاومي على تطبيق الأمان (Security Center). اتبع الخطوات التالية لتفعيل البدء التلقائي وإزالة أي قيود على البطارية ليعمل الإرسال الصامت بسلاسة:'
                  )}
                </p>
              </div>

              {/* Xiaomi Step 1: Autostart */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>{translateInline(lang, 'Step 1: Enable Autostart in Security App', 'الخطوة 1: تفعيل البدء التلقائي (Autostart)')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Open Security App ➔ Manage Apps / Permissions ➔ Autostart ➔ Enable "Anti-Theft Security".',
                    'افتح تطبيق الحماية (Security) ⬅️ إدارة التطبيقات / الأذونات ⬅️ البدء التلقائي (Autostart) ⬅️ فعّل Anti-Theft Security.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAutostart}
                  className="w-full py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Zap className="w-4 h-4" />
                  <span>{translateInline(lang, 'Open MIUI / HyperOS Autostart Settings', 'فتح إعدادات البدء التلقائي في شاومي')}</span>
                </button>
              </div>

              {/* Xiaomi Step 2: Battery Saver No restrictions */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>{translateInline(lang, 'Step 2: Battery Saver ➔ "No restrictions"', 'الخطوة 2: موفر البطارية ⬅️ «بلا قيود» (No restrictions)')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'In App Info ➔ Battery Saver ➔ Choose "No restrictions". This prevents MIUI from killing background SMS listeners.',
                    'معلومات التطبيق ⬅️ موفر البطارية (Battery Saver) ⬅️ اختر «بلا قيود» (No restrictions) لضمان عدم إيقاف التطبيق في الخلفية.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAppDetails}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Settings className="w-4 h-4" />
                  <span>{translateInline(lang, 'Open App Info (Set No Restrictions)', 'فتح معلومات التطبيق لاختيار بلا قيود')}</span>
                </button>
              </div>

              {/* Xiaomi Step 3: Default SMS App */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>{translateInline(lang, 'Step 3: Default SMS App on MIUI / HyperOS', 'الخطوة 3: تعيين التطبيق الافتراضي للرسائل في شاومي')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Settings ➔ Apps ➔ Manage apps ➔ 3 dots (top right) ➔ Default apps ➔ Messages ➔ DroidGuard. Bypasses all MIUI countdowns and prompts.',
                    'الإعدادات ⬅️ التطبيقات ⬅️ إدارة التطبيقات ⬅️ الثلاث نقاط بالأعلى ⬅️ التطبيقات الافتراضية ⬅️ الرسائل ⬅️ DroidGuard. يتجاوز كافة عدادات واجهة شاومي MIUI و HyperOS.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onActivateDefaultSms) {
                      onActivateDefaultSms();
                    } else {
                      requestSetDefaultSmsApp();
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{translateInline(lang, 'Set as Default SMS App (Xiaomi)', 'تعيين كتطبيق افتراضي في شاومي')}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= REALME & OPPO ================= */}
          {selectedBrand === 'realme_oppo' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <span>📱</span>
                  <span>{translateInline(lang, 'Optimizations for Realme UI & ColorOS (Oppo / Realme)', 'تحسينات واجهة Realme UI و ColorOS (هواتف ريلمي وأوبو)')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Realme and Oppo devices include a system-level security hook that intercepts background SMS dispatch with a 5-second dialog. Follow these quick steps to bypass it permanently:',
                    'تتضمن هواتف ريلمي وأوبو حماية في النظام تعترض رسائل الطوارئ في الخلفية بنافذة عد تنازلي. اتبع الخطوات التالية لإلغائها نهائياً وضمان الإرسال الصامت:'
                  )}
                </p>
              </div>

              {/* Step 1: Dev options */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>{translateInline(lang, 'Step 1: Disable Permission Monitoring in Developer Options', 'الخطوة 1: تعطيل مراقبة الأذونات في خيارات المطور')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Open Developer Options, scroll to the bottom, and toggle ON "Disable permission monitoring". Restart phone.',
                    'افتح خيارات المطور، مرر للأسفل وفعّل خيار «تعطيل مراقبة الأذونات» (Disable permission monitoring)، ثم أعد تشغيل الهاتف.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleOpenDev}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{translateInline(lang, 'Open Developer Options Now', 'فتح خيارات المطور الآن')}</span>
                </button>
              </div>

              {/* Step 2: Startup Manager & Battery */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>{translateInline(lang, 'Step 2: Startup Manager & Unrestricted Background', 'الخطوة 2: إدارة بدء التشغيل والعمل في الخلفية')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'Allow auto-launch and unrestricted background activity in Phone Manager (SafeCenter).',
                    'اسمح بالبدء التلقائي والعمل في الخلفية دون قيود من مدير الهاتف / مركز الأمان.'
                  )}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAutostart}
                    className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{translateInline(lang, 'Open Startup Manager', 'فتح إدارة بدء التشغيل')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenBattery}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <BatteryCharging className="w-4 h-4" />
                    <span>{translateInline(lang, 'Ignore Battery Optimization', 'استثناء البطارية')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= GENERIC / STOCK ANDROID ================= */}
          {selectedBrand === 'generic' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                  <span>🌐</span>
                  <span>{translateInline(lang, 'Optimizations for Stock Android & Other OEMs', 'تحسينات أندرويد الخام والهواتف الأخرى (Infinix, Tecno, Pixel, Huawei)')}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {translateInline(
                    lang,
                    'On Pixel, Motorola, Infinix, Tecno, and pure Android phones, these two settings grant total background operation and immediate zero-touch SMS delivery:',
                    'بالنسبة لهواتف بيكسل، موتورولا، إنفينيكس، تكنو، وأندرويد الخام، تمنحك هذه الخطوات إرسالاً فورياً وصامتاً في الخلفية:'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-teal-300">
                    {translateInline(lang, '1. Ignore Battery Optimization', '1. استثناء البطارية')}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {translateInline(
                      lang,
                      'Prevents the OS Doze mode from putting the stealth listeners to sleep.',
                      'يمنع النظام من إيقاف الخدمة أثناء إغلاق الشاشة.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenBattery}
                    className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{translateInline(lang, 'Exempt Battery', 'استثناء البطارية')}</span>
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-indigo-300">
                    {translateInline(lang, '2. Default SMS App Authorization', '2. التعيين كتطبيق افتراضي للرسائل')}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {translateInline(
                      lang,
                      'Allows emergency SOS dispatch with zero dialog prompts and no touch required.',
                      'يتيح إرسال رسائل الاستغاثة فوراً وبصمت تام دون طلب تأكيد.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onActivateDefaultSms) {
                        onActivateDefaultSms();
                      } else {
                        requestSetDefaultSmsApp();
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{translateInline(lang, 'Set as Default SMS App', 'تعيين كتطبيق افتراضي')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <p className="text-[11px] text-slate-400">
            {translateInline(
              lang,
              'All features are engineered to run completely offline across all chipsets and Android versions.',
              'كافة الخصائص تعمل بدون إنترنت وبأمان تام على جميع معالجات وإصدارات أندرويد.'
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            {translateInline(lang, 'Done', 'تم / إغلاق')}
          </button>
        </div>
      </div>
    </div>
  );
};
