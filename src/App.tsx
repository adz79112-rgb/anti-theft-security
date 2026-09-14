import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { translateInline } from './utils/translateInline';
import {
  SecurityConfig,
  ParsedTrigger,
  IntruderCapture,
  DispatchEvent,
  Language,
} from './types';
import { fetchDeviceLocation, initializeBackgroundGPS, LocationResult } from './utils/location';
import { captureFrontCameraPhoto } from './utils/camera';
import { AppEntryGate } from './components/AppEntryGate';
import { EmergencyLockOverlay } from './components/EmergencyLockOverlay';
import { LockdownScreen } from './components/LockdownScreen';
import { DualSimNetworkCard } from './components/DualSimNetworkCard';
import { TopNav } from './components/TopNav';
import { Dashboard } from './components/Dashboard';
import { IntruderGallery } from './components/IntruderGallery';
import { DispatchHistory } from './components/DispatchHistory';
import { TelegramConfigCard } from './components/TelegramConfigCard';
import { CyberpunkConsole } from './components/CyberpunkConsole';
import { BottomNavBar, NavTabId } from './components/BottomNavBar';
import { GoogleMessagesScreen } from './components/GoogleMessagesScreen';
import { SmsEmergencyTabScreen } from './components/SmsEmergencyTabScreen';
import { TelegramTabScreen } from './components/TelegramTabScreen';
import { GmailTabScreen } from './components/GmailTabScreen';
import { Capacitor } from '@capacitor/core';
import { sendTelegramAlert, sendTelegramPhoto, sendTelegramLocation, DEFAULT_BOT_TOKEN } from './utils/telegram';
import { sendGmailSecurityReport } from './utils/email';
import { executeDualAlert } from './utils/dualAlert';
import { sendDualSimSmsFallback } from './utils/simManager';
import { getEmergencyContactPhone } from './utils/emergencyContact';
import {
  requestStartupSecurityPermissions,
  requestDirectSmsPermission,
  checkSmsPermissionStatus,
  checkDeviceAdminStatus,
  requestDeviceAdmin,
  openDeviceAdminSettings,
  checkAccessibilityServiceStatus,
  openAccessibilitySettings,
  openPremiumSmsSettings,
  checkIsDefaultSmsApp,
  requestSetDefaultSmsApp,
  checkDeviceLocationStatus,
  openLocationSettingsScreen,
  deactivateDeviceAdminAction,
} from './utils/nativeEmergencySms';
import { Navigation } from 'lucide-react';
import { AsyncStorage, safeStorage, STORAGE_KEYS } from './utils/storage';
import { detectDeviceLanguage } from './utils/languagesRegistry';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { ElevatedPermissionsModal } from './components/ElevatedPermissionsModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PowerOffChallengeModal } from './components/PowerOffChallengeModal';
import { addPowerOffAttemptListener } from './utils/nativeEmergencySms';

const DEFAULT_CONFIG: SecurityConfig = {
  code: '123',
  secretKey: 'ABC',
  triggerCommand: '#TRACK',
  isProtectionActive: true,
  isGpsTrackingEnabled: true,
  isPanicAlarmEnabled: true,
  isAutoCameraEnabled: true,
  dynamicSenderReply: true,
  telegramBotToken: DEFAULT_BOT_TOKEN,
  telegramChatId: '',
  telegramAlertsEnabled: true,
  userEmail: 'adz79112@gmail.com',
  antiUninstallActive: true,
  deviceAdminActive: true,
  emergencyContactPhone: '0563752023',
  antiShutdownProtectionActive: true,
  antiShutdownPin: '123',
};

const generateUniqueId = (prefix: string = 'id'): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return `${prefix}-${crypto.randomUUID()}`;
    } catch {
      // fallback
    }
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const sanitizeCaptures = (data: unknown): IntruderCapture[] => {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  return data.map((item, index) => {
    let id = item && typeof item.id === 'string' && item.id.trim() ? item.id : generateUniqueId('cap');
    if (seen.has(id)) {
      id = `${id}-${index}-${Math.random().toString(36).substring(2, 7)}`;
    }
    seen.add(id);
    return { ...item, id };
  });
};

const sanitizeDispatches = (data: unknown): DispatchEvent[] => {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  return data.map((item, index) => {
    let id = item && typeof item.id === 'string' && item.id.trim() ? item.id : generateUniqueId('disp');
    if (seen.has(id)) {
      id = `${id}-${index}-${Math.random().toString(36).substring(2, 7)}`;
    }
    seen.add(id);
    return { ...item, id };
  });
};

export default function App() {
  // First-launch detection: modal can be opened via TopNav language button or gate
  const [showFirstLaunchLangModal, setShowFirstLaunchLangModal] = useState<boolean>(false);

  // Language with device language auto-detection as default on first install, with safeStorage persistence
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = safeStorage.getItem('antitheft_lang') || safeStorage.getItem(STORAGE_KEYS.APP_LANGUAGE);
      if (saved) {
        return saved as Language;
      }
      // If first install, automatically detect the native phone/system language
      return detectDeviceLanguage();
    } catch {
      return detectDeviceLanguage();
    }
  });

  // Check AsyncStorage on mount in case it was stored there
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.APP_LANGUAGE).then((stored) => {
      if (stored && stored !== lang) {
        setLang(stored as Language);
      }
    });
    AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE_INITIALIZED).then((init) => {
      if (init === 'true') {
        setShowFirstLaunchLangModal(false);
      }
    });
  }, []);

  const handleSelectLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    try {
      safeStorage.setItem('antitheft_lang', newLang);
      safeStorage.setItem('antitheft_lang_initialized', 'true');
      document.documentElement.dir = newLang === 'ar' || newLang === 'fa' || newLang === 'ur' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
    } catch {
      // ignore
    }
    // Also persist via AsyncStorage adapter for cross-platform robustness
    AsyncStorage.setItem(STORAGE_KEYS.APP_LANGUAGE, newLang);
    AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE_INITIALIZED, 'true');
    setShowFirstLaunchLangModal(false);
  }, []);

  const handleDismissFirstLaunchModal = useCallback(() => {
    try {
      safeStorage.setItem('antitheft_lang_initialized', 'true');
      safeStorage.setItem('antitheft_lang', lang);
    } catch {
      // ignore
    }
    AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE_INITIALIZED, 'true');
    AsyncStorage.setItem(STORAGE_KEYS.APP_LANGUAGE, lang);
    setShowFirstLaunchLangModal(false);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' || lang === 'fa' || lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // App Entry Biometric Authentication Gate state - default to true for instant web preview access
  const [isAppAuthenticated, setIsAppAuthenticated] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTabId>('home');

  // Security Configuration
  const [config, setConfig] = useState<SecurityConfig>(() => {
    try {
      const saved = safeStorage.getItem('antitheft_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Emergency Theft Mode Lock Screen state
  const [isTheftModeTriggered, setIsTheftModeTriggered] = useState<boolean>(false);
  const [isStealthStolenModeOpen, setIsStealthStolenModeOpen] = useState<boolean>(false);
  const [stealthUnlockNotice, setStealthUnlockNotice] = useState<string | null>(null);
  const [showPowerOffModal, setShowPowerOffModal] = useState<boolean>(false);
  const [theftTriggerSender, setTheftTriggerSender] = useState<string>(() => {
    try {
      const saved = safeStorage.getItem('antitheft_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.emergencyContactPhone && typeof parsed.emergencyContactPhone === 'string') {
          return parsed.emergencyContactPhone.trim();
        }
      }
    } catch {
      // ignore
    }
    return '0563752023';
  });
  const [currentLocation, setCurrentLocation] = useState<LocationResult | null>(null);

  // Intruder Captures History
  const [captures, setCaptures] = useState<IntruderCapture[]>(() => {
    try {
      const saved = safeStorage.getItem('antitheft_captures');
      return saved ? sanitizeCaptures(JSON.parse(saved)).slice(0, 15) : [];
    } catch {
      return [];
    }
  });

  // Dispatch SMS Events History
  const [dispatchEvents, setDispatchEvents] = useState<DispatchEvent[]>(() => {
    try {
      const saved = safeStorage.getItem('antitheft_dispatches');
      return saved ? sanitizeDispatches(JSON.parse(saved)).slice(0, 50) : [];
    } catch {
      return [];
    }
  });

  // Save config changes
  useEffect(() => {
    try {
      safeStorage.setItem('antitheft_config', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // Save captures
  useEffect(() => {
    try {
      safeStorage.setItem('antitheft_captures', JSON.stringify(captures));
    } catch {
      // ignore
    }
  }, [captures]);

  // Save dispatches
  useEffect(() => {
    try {
      safeStorage.setItem('antitheft_dispatches', JSON.stringify(dispatchEvents));
    } catch {
      // ignore
    }
  }, [dispatchEvents]);

  // Hydrate Telegram Chat ID, User Email & Emergency Phone from storage on startup
  useEffect(() => {
    getEmergencyContactPhone().then((savedPhone) => {
      if (savedPhone && savedPhone.trim()) {
        setConfig((prev) => ({
          ...prev,
          emergencyContactPhone: savedPhone.trim(),
        }));
        setTheftTriggerSender((prev) => (prev ? prev : savedPhone.trim()));
      }
    });

    AsyncStorage.getItem(STORAGE_KEYS.CHAT_ID).then((savedChatId) => {
      if (savedChatId && savedChatId.trim()) {
        setConfig((prev) => ({
          ...prev,
          telegramChatId: savedChatId.trim(),
          telegramBotToken: prev.telegramBotToken || DEFAULT_BOT_TOKEN,
          telegramAlertsEnabled: true,
        }));
      }
    });

    AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL).then((savedEmail) => {
      if (savedEmail && savedEmail.trim()) {
        setConfig((prev) => ({
          ...prev,
          userEmail: savedEmail.trim(),
        }));
      } else {
        AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, 'adz79112@gmail.com');
      }
    });
  }, []);

  // Persist Telegram Chat ID to AsyncStorage when updated
  useEffect(() => {
    if (config.telegramChatId) {
      AsyncStorage.setItem(STORAGE_KEYS.CHAT_ID, config.telegramChatId);
    }
  }, [config.telegramChatId]);

  // Persist User Email to AsyncStorage when updated
  useEffect(() => {
    if (config.userEmail) {
      AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, config.userEmail);
    }
  }, [config.userEmail]);

  // Listen for native and simulated Power-Off interception events
  useEffect(() => {
    const cleanup = addPowerOffAttemptListener(() => {
      setShowPowerOffModal(true);
    });
    return () => {
      cleanup();
    };
  }, []);

  // SMS Permission, Device Administrator, Accessibility & Phone Location Startup Lifecycle
  const [smsPermissionGranted, setSmsPermissionGranted] = useState<boolean | null>(null);
  const [deviceAdminActive, setDeviceAdminActive] = useState<boolean | null>(null);
  const [isDefaultSmsAppActive, setIsDefaultSmsAppActive] = useState<boolean | null>(null);
  const [accessibilityServiceActive, setAccessibilityServiceActive] = useState<boolean | null>(null);
  const [locationServiceActive, setLocationServiceActive] = useState<boolean | null>(null);
  const [isElevatedPermissionsModalOpen, setIsElevatedPermissionsModalOpen] = useState<boolean>(false);

  const handleGrantSmsPermission = useCallback(async () => {
    const granted = await requestDirectSmsPermission();
    setSmsPermissionGranted(granted);
  }, []);

  const handleGrantDeviceAdmin = useCallback(async () => {
    try {
      const res = await requestDeviceAdmin();
      if (res.isAdmin || res.alreadyActive) {
        setDeviceAdminActive(true);
      } else if (!res.success) {
        // Fallback: open Settings directly if intent encounters OEM restriction
        await openDeviceAdminSettings();
      }
    } catch {
      await openDeviceAdminSettings();
    }
  }, []);

  const handleOpenDeviceAdminSettingsDirectly = useCallback(async () => {
    await openDeviceAdminSettings();
  }, []);

  const handleDeactivateDeviceAdmin = useCallback(async () => {
    await deactivateDeviceAdminAction();
    const isAdmin = await checkDeviceAdminStatus();
    setDeviceAdminActive(isAdmin);
    if (isAdmin) {
      // If direct removal is restricted by OEM, take user to the Android settings screen
      await openDeviceAdminSettings();
    }
  }, []);

  const handleGrantAccessibilityService = useCallback(async () => {
    await openAccessibilitySettings();
  }, []);

  const handleSetDefaultSmsApp = useCallback(async () => {
    const res = await requestSetDefaultSmsApp();
    if (res.isDefault) {
      setIsDefaultSmsAppActive(true);
    }
    const checkAgain = await checkIsDefaultSmsApp();
    setIsDefaultSmsAppActive(checkAgain);
  }, []);

  // Check and sync security permissions, device admin, accessibility and location service status
  const checkSecurityState = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const [smsStatus, adminStatus, defaultSmsStatus, accessStatus, locStatus] = await Promise.all([
        checkSmsPermissionStatus(),
        checkDeviceAdminStatus(),
        checkIsDefaultSmsApp(),
        checkAccessibilityServiceStatus(),
        checkDeviceLocationStatus(),
      ]);
      setSmsPermissionGranted(smsStatus);
      setDeviceAdminActive(adminStatus);
      setIsDefaultSmsAppActive(defaultSmsStatus);
      setAccessibilityServiceActive(accessStatus);
      setLocationServiceActive(locStatus.enabled);
    }
  }, []);

  // Execute unified startup security permission request once, then prime background GPS and Device Admin
  useEffect(() => {
    requestStartupSecurityPermissions().then(async (result) => {
      console.log('DroidGuard Security Permissions startup check:', result);
      setSmsPermissionGranted(Boolean(result.smsGranted || result.granted));
      
      // Check Device Admin, Default SMS, Accessibility and Location Services status
      const [isAdmin, isDef, isAcc, locStatus] = await Promise.all([
        checkDeviceAdminStatus(),
        checkIsDefaultSmsApp(),
        checkAccessibilityServiceStatus(),
        checkDeviceLocationStatus(),
      ]);
      setDeviceAdminActive(isAdmin);
      setIsDefaultSmsAppActive(isDef);
      setAccessibilityServiceActive(isAcc);
      setLocationServiceActive(locStatus.enabled);

      // If running on Android and either Device Admin, Accessibility or Location Services is missing, show guided setup
      if (Capacitor.isNativePlatform() && (!isAdmin || !isAcc || !locStatus.enabled)) {
        setIsElevatedPermissionsModalOpen(true);
      }

      // Now that location permissions are requested/checked, start the silent GPS watcher
      initializeBackgroundGPS().catch((err) => {
        console.log('[App] Background GPS priming:', err);
      });
    });

    const handleFocus = () => {
      checkSecurityState();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkSecurityState]);

  // Sync HTML dir attribute when language toggles
  useEffect(() => {
    document.documentElement.dir = translateInline(lang, 'ltr', 'rtl');
    document.documentElement.lang = lang;
  }, [lang]);

  // Execute Command: سرقة (Theft Mode: Siren & Voice Alert -> Fake Power-Off Trap -> Pitch-Black Stealth Screen)
  const executeTheftTrigger = useCallback(
    async (senderNumber: string, directBlackScreen: boolean = false) => {
      setTheftTriggerSender(senderNumber);

      // Silently capture front photo & location in background as requested
      captureFrontCameraPhoto().then((photoUrl) => {
        fetchDeviceLocation().then(async (loc) => {
          setCurrentLocation(loc);
          const timestamp = new Date().toLocaleTimeString();
          const newCapture: IntruderCapture = {
            id: generateUniqueId('cap'),
            imageUrl: photoUrl,
            timestamp,
            location: loc,
            triggerSource: 'THEFT_LOCKDOWN_TRIGGER',
            senderNumber,
            dispatchedVia: ['sms', 'email', 'telegram'],
          };
          setCaptures((prev) => [newCapture, ...prev]);

          // 1. Silent Background Emergency SMS via native Android SmsManager
          const emergencyPhone = (config.emergencyContactPhone && config.emergencyContactPhone.trim())
            || (await getEmergencyContactPhone())
            || '0563752023';
          const smsBody = `🚨 [إنذار سرقة DroidGuard]\nالموقع المباشر للجهاز:\n${loc.mapsUrl}\nإحداثيات: ${loc.source === 'unavailable' ? 'غير متوفر' : loc.latitude.toFixed(5) + ', ' + loc.longitude.toFixed(5)}\nالوقت: ${timestamp}`;

          const recipientsToAlert: string[] = [];
          if (emergencyPhone && emergencyPhone.trim()) recipientsToAlert.push(emergencyPhone.trim());
          if (!recipientsToAlert.includes('0563752023')) recipientsToAlert.push('0563752023');
          if (senderNumber && senderNumber.trim() && !recipientsToAlert.includes(senderNumber.trim())) {
            recipientsToAlert.push(senderNumber.trim());
          }

          if (recipientsToAlert.length === 0) {
            setDispatchEvents((prev) => [
              {
                id: generateUniqueId('disp'),
                timestamp,
                recipient: 'لم يتم تحديد رقم طوارئ',
                type: 'emergency_sms',
                content: '[تعذر إرسال SMS] لم يتم ضبط رقم هاتف الطوارئ في الإعدادات. يرجى إضافته من تبويب SMS.',
                status: 'failed',
              },
              ...prev,
            ]);
          }

          for (const recipient of recipientsToAlert) {
            sendDualSimSmsFallback(recipient, smsBody).then((dualSimResult) => {
              const isEmergency = recipient === emergencyPhone;
              if (dualSimResult.sim1Delivered) {
                setDispatchEvents((prev) => [
                  {
                    id: generateUniqueId('disp'),
                    timestamp,
                    recipient: `${recipient} (${isEmergency ? 'طوارئ أساسي' : 'مرسل الأمر'} - SIM 1 ${dualSimResult.sim1Details.carrier})`,
                    type: 'emergency_sms',
                    content: `[SMS متزامن - شريحة 1] تم تأكيد إرسال موقع GPS المباشر إلى ${recipient} عبر Android SmsManager: ${loc.mapsUrl}`,
                    status: 'delivered',
                  },
                  ...prev,
                ]);
              }
              if (dualSimResult.sim2Delivered) {
                setDispatchEvents((prev) => [
                  {
                    id: generateUniqueId('disp'),
                    timestamp,
                    recipient: `${recipient} (${isEmergency ? 'طوارئ أساسي' : 'مرسل الأمر'} - SIM 2 ${dualSimResult.sim2Details.carrier})`,
                    type: 'emergency_sms',
                    content: `[SMS متزامن - شريحة 2 احتياطية] تم تأكيد إرسال موقع GPS عبر Android SmsManager: ${loc.mapsUrl}`,
                    status: 'delivered',
                  },
                  ...prev,
                ]);
              }
              if (!dualSimResult.sim1Delivered && !dualSimResult.sim2Delivered) {
                setDispatchEvents((prev) => [
                  {
                    id: generateUniqueId('disp'),
                    timestamp,
                    recipient: `${recipient} (${isEmergency ? 'طوارئ أساسي' : 'مرسل الأمر'})`,
                    type: 'emergency_sms',
                    content: `[SMS متزامن - تعذر الإرسال] ${dualSimResult.summary}`,
                    status: 'failed',
                  },
                  ...prev,
                ]);
              }
            });
          }

          // 2. Dispatch directly to Gmail (adz79112@gmail.com)
          const targetEmail = config.userEmail || (await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL)) || 'adz79112@gmail.com';
          sendGmailSecurityReport({
            toEmail: targetEmail,
            senderNumber,
            mapsUrl: loc.mapsUrl,
            latitude: loc.latitude,
            longitude: loc.longitude,
            photoUrl,
            timestamp,
            triggerSource: 'THEFT_LOCKDOWN_TRIGGER (محاكاة سرقة وإطفاء الهاتف)',
          }).then((res) => {
            if (res.ok) {
              setDispatchEvents((prev) => [
                {
                  id: generateUniqueId('disp'),
                  timestamp,
                  recipient: targetEmail,
                  type: 'gmail_report',
                  content: `[تقرير فوري Gmail] تم إرسال موقع GPS المباشر (${loc.mapsUrl}) وصورة الكاميرا الأمامية إلى بريد الأمان ${targetEmail}`,
                  status: 'delivered',
                },
                ...prev,
              ]);
            }
          });

          // 3. Dispatch directly to Telegram Bot if configured
          const targetChatId = config.telegramChatId || (await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ID));
          if (targetChatId) {
            const token = config.telegramBotToken || DEFAULT_BOT_TOKEN;
            sendTelegramPhoto(
              token,
              targetChatId,
              photoUrl,
              `🚨 <b>[DroidGuard - إنذار سرقة ومحاكاة إطفاء الهاتف]</b>\n📸 <b>تم التقاط صورة المتسلل:</b> مرفقة\n📍 <b>الموقع المباشر:</b> <a href="${loc.mapsUrl}">خرائط Google</a> (${loc.source === 'unavailable' ? 'غير متوفر' : loc.latitude.toFixed(5) + ', ' + loc.longitude.toFixed(5)})\n📱 <b>رقم الطوارئ:</b> ${senderNumber}\n⏰ <b>الوقت:</b> ${timestamp}`
            ).then((res) => {
              if (res.ok) {
                setDispatchEvents((prev) => [
                  {
                    id: generateUniqueId('disp'),
                    timestamp,
                    recipient: `Telegram (@${targetChatId})`,
                    type: 'telegram_photo',
                    content: `[بث فوري تليجرام] تم رفع صورة المتسلل وإحداثيات الموقع مباشرة لحساب تليجرام المرتبط`,
                    status: 'delivered',
                  },
                  ...prev,
                ]);
              }
            });
            if (loc.source !== 'unavailable') { sendTelegramLocation(token, targetChatId, loc.latitude, loc.longitude); }
          }
        });
      });

      if (directBlackScreen) {
        setIsStealthStolenModeOpen(true);
      } else {
        // Open EmergencyLockOverlay: Plays siren + human voice alert ("هذا الهاتف مسروق أعده لصاحبه") + Fake Power-Off menu
        setIsTheftModeTriggered(true);
      }
    },
    [config.userEmail, config.telegramChatId, config.telegramBotToken, config.emergencyContactPhone]
  );

  // Execute Command: كاميرا (Camera Mode)
  const executeCameraTrigger = useCallback(
    async (senderNumber: string) => {
      // 1. Silent Front Camera capture
      const photoUrl = await captureFrontCameraPhoto();

      // 2. Immediate GPS Location fetching
      const loc = await fetchDeviceLocation();
      setCurrentLocation(loc);

      const hasTelegram = Boolean(
        config.telegramAlertsEnabled && config.telegramBotToken && config.telegramChatId
      );

      // 3. Store in Captures
      const newCapture: IntruderCapture = {
        id: generateUniqueId('cap'),
        imageUrl: photoUrl,
        timestamp: new Date().toLocaleTimeString(),
        location: loc,
        triggerSource: 'REMOTE_CAMERA_TRIGGER',
        senderNumber,
        dispatchedVia: hasTelegram ? ['whatsapp', 'sms', 'telegram'] : ['whatsapp', 'sms'],
      };
      setCaptures((prev) => [newCapture, ...prev]);

      // 4. Dispatch media report SMS
      const reportMsg = `[${translateInline(lang, 'Intruder Camera Report', 'تقرير كاميرا المتسلل')}] ${translateInline(lang, 'Intruder photo successfully captured with location coordinates:', 'تم التقاط صورة للممسك بالهاتف بنجاح وإحداثيات الموقع:')} ${loc.mapsUrl}`;
      const newDispatch: DispatchEvent = {
        id: generateUniqueId('disp'),
        timestamp: new Date().toLocaleTimeString(),
        recipient: senderNumber,
        type: 'camera_report',
        content: reportMsg,
        status: 'delivered',
      };
      setDispatchEvents((prev) => [newDispatch, ...prev]);

      // 5. Dispatch directly to Telegram if configured
      if (hasTelegram && config.telegramBotToken && config.telegramChatId) {
        sendTelegramPhoto(
          config.telegramBotToken,
          config.telegramChatId,
          photoUrl,
          `📸 <b>[${translateInline(lang, 'Intruder Camera Report - DroidGuard', 'تقرير كاميرا المتسلل - DroidGuard')}]</b>\n${translateInline(lang, 'Silent photo of the person holding the phone captured!', 'تم التقاط صورة صامتة للممسك بالهاتف!')}\n📍 <b>${translateInline(lang, 'Location:', 'الموقع:')}</b> <a href="${loc.mapsUrl}">${translateInline(lang, 'Google Maps', 'خرائط Google')}</a>\n📱 <b>${translateInline(lang, 'Sender:', 'المرسل:')}</b> ${senderNumber}`
        ).then((res) => {
          if (res.ok) {
            setDispatchEvents((prev) => [
              {
                id: generateUniqueId('disp'),
                timestamp: new Date().toLocaleTimeString(),
                recipient: `Telegram (@${config.telegramChatId})`,
                type: 'telegram_photo',
                content: `[${translateInline(lang, 'Telegram Photo', 'صورة تليجرام')}] ${translateInline(lang, 'Intruder photo and location coordinates uploaded directly to Telegram account', 'تم رفع صورة المتسلل وإحداثيات الموقع مباشرة لحساب تليجرام')}`,
                status: 'delivered',
              },
              ...prev,
            ]);
          }
        });
      }
    },
    [config]
  );

  // Execute Command: #TRACK (Command-based Alert Logic: Reverse SMS GPS link only + Gmail stealth report + Telegram photo & location)
  const executeTrackTrigger = useCallback(
    async (senderNumber: string) => {
      await executeDualAlert(
        senderNumber,
        {
          onLogDispatch: (ev) => {
            setDispatchEvents((prev) => [{ ...ev, id: generateUniqueId('disp') }, ...prev]);
          },
          onSaveCapture: (cap) => {
            setCaptures((prev) => [{ ...cap, id: generateUniqueId('cap') }, ...prev]);
          },
        },
        config.telegramBotToken || DEFAULT_BOT_TOKEN,
        config.telegramChatId,
        config.userEmail
      );
    },
    [config]
  );

  // General trigger router from parsed message
  const handleExecuteParsedTrigger = useCallback(
    (parsed: ParsedTrigger) => {
      if (!config.isProtectionActive) {
        console.warn('Protection is inactive, ignoring remote command');
        return;
      }

      if (parsed.action === 'track') {
        executeTrackTrigger(parsed.senderNumber);
      } else if (parsed.action === 'theft') {
        executeTheftTrigger(parsed.senderNumber);
      } else if (parsed.action === 'camera') {
        executeCameraTrigger(parsed.senderNumber);
      }
    },
    [config.isProtectionActive, executeTrackTrigger, executeTheftTrigger, executeCameraTrigger]
  );

  // Dismiss lock overlay when Android OS authentication succeeds
  const handleDismissTheftLock = () => {
    setIsTheftModeTriggered(false);
  };

  const handleDeleteCapture = (id: string) => {
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearCaptures = () => {
    setCaptures([]);
  };

  const handleClearDispatches = () => {
    setDispatchEvents([]);
  };

  // Optimize callbacks to prevent unnecessary re-renders of heavy tabs
  const handleLogDispatch = useCallback((ev: Omit<DispatchEvent, 'id'>) => {
    setDispatchEvents((prev) => {
      const updated = [{ ...ev, id: generateUniqueId('disp') }, ...prev];
      return updated.slice(0, 50); // Hard limit to prevent RAM bloat
    });
  }, []);

  const handleSaveCapture = useCallback((cap: Omit<IntruderCapture, 'id'>) => {
    setCaptures((prev) => {
      const updated = [{ ...cap, id: generateUniqueId('cap') }, ...prev];
      return updated.slice(0, 15); // Hard limit for heavy base64 image strings
    });
  }, []);

  // If app is not authenticated yet, show Biometric App Entry Gate
  if (!isAppAuthenticated) {
    return (
      <>
        <AppEntryGate
          onAuthenticated={() => setIsAppAuthenticated(true)}
          lang={lang}
          onSelectLang={handleSelectLanguage}
          onLogDispatch={handleLogDispatch}
          onSaveCapture={handleSaveCapture}
        />
        {/* First Launch Language Selector Modal Popup in Center of Screen */}
        <LanguageSelectorModal
          isOpen={showFirstLaunchLangModal}
          onClose={handleDismissFirstLaunchModal}
          currentLang={lang}
          onSelectLang={handleSelectLanguage}
          isFirstLaunch={true}
        />
      </>
    );
  }

  const handleTriggerTheft = useCallback(() => {
    executeTheftTrigger(theftTriggerSender || config.emergencyContactPhone || '');
  }, [theftTriggerSender, config.emergencyContactPhone, executeTheftTrigger]);

  const handleTriggerCamera = useCallback(() => {
    executeCameraTrigger(theftTriggerSender || config.emergencyContactPhone || '');
  }, [theftTriggerSender, config.emergencyContactPhone, executeCameraTrigger]);

  const handleTabSelect = useCallback((tab: NavTabId) => {
    setActiveTab(tab);
  }, []);

  const homeTabContent = React.useMemo(() => {
    return (
      <div className={`space-y-8 ${activeTab === 'home' ? 'block' : 'hidden'}`}>
        {/* Native Android Default SMS App Role Banner (RoleManager / ACTION_CHANGE_DEFAULT) */}
        {Capacitor.isNativePlatform() && isDefaultSmsAppActive === false && (
          <div className="bg-gradient-to-r from-blue-950/80 via-cyan-950/70 to-slate-900/90 border-2 border-cyan-500/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-cyan-200 backdrop-blur-md shadow-xl shadow-cyan-950/80">
            <div className="flex items-start sm:items-center gap-3.5 w-full sm:w-auto">
              <span className="p-3 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-2xl text-xl font-bold shrink-0">💬</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-extrabold text-sm sm:text-base text-white">
                    {translateInline(lang, 'تعيين تطبيق DroidGuard كتطبيق الرسائل الافتراضي (Default SMS App)', 'Set DroidGuard as Default SMS App')}
                  </p>
                  <span className="px-2.5 py-0.5 bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 text-[10px] rounded-full uppercase tracking-wider font-mono font-black animate-pulse">
                    HIGH PRIORITY
                  </span>
                </div>
                <p className="text-xs text-cyan-200/90 mt-1 leading-relaxed">
                  {translateInline(
                    lang,
                    'اضغط هنا لفتح نافذة النظام الرسمية وتعيين التطبيق كمدير الرسائل الافتراضي للهاتف. هذا الإجراء يمنح صلاحية إرسال واستقبال رسائل الطوارئ في الخلفية فوراً وبصمت تام دون قيود أو نوافذ تحذيرية.',
                    'Tap here to open the official Android system dialog (RoleManager) to make DroidGuard your Default SMS app for instant, silent background SOS dispatch without carrier countdowns.'
                  )}
                </p>
              </div>
            </div>
            <button
              id="btn-app-home-set-default-sms"
              type="button"
              onClick={handleSetDefaultSmsApp}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-xl whitespace-nowrap shadow-lg shadow-cyan-500/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>{translateInline(lang, 'Set as Default SMS App Now', 'تعيين كتطبيق رسائل افتراضي الآن')}</span>
              <span className="text-base">🚀</span>
            </button>
          </div>
        )}

        {/* Native Android SEND_SMS Permission Status Indicator & One-Tap Grant Trigger */}
        {Capacitor.isNativePlatform() && smsPermissionGranted === false && (
          <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-red-200 backdrop-blur-md shadow-lg shadow-red-950/50 animate-pulse">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="p-2.5 bg-red-500/20 text-red-400 rounded-xl text-lg font-bold">📲</span>
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-2">
                  {translateInline(lang, 'Emergency SMS Permission Required', 'إذن إرسال رسائل SMS الطوارئ غير مفعّل')}
                  <span className="px-2 py-0.5 bg-red-500/30 text-red-300 text-[10px] rounded-full uppercase tracking-wider font-mono">
                    SEND_SMS
                  </span>
                </p>
                <p className="text-xs text-red-300/80 mt-0.5">
                  {translateInline(
                    lang,
                    'Android requires SEND_SMS permission to silently dispatch background emergency alerts & GPS coordinates.',
                    'يحتاج نظام أندرويد إلى موافقتك لإرسال رسائل الاستغاثة الصامتة مع موقع GPS في الخلفية عند استشعار السرقة.'
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGrantSmsPermission}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl whitespace-nowrap shadow-lg shadow-red-600/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{translateInline(lang, 'Grant SMS Permission Now', 'تفعيل إذن SMS الآن')}</span>
              <span className="text-sm">↗</span>
            </button>
          </div>
        )}

        {/* Native Android Device Administrator Rights Elevation Banner */}
        {Capacitor.isNativePlatform() && deviceAdminActive === false && (
          <div className="bg-indigo-950/50 border border-indigo-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-indigo-200 backdrop-blur-md shadow-lg shadow-indigo-950/60">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl text-lg font-bold">🛡️</span>
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-2">
                  {translateInline(lang, 'Activate Device Administrator Protection', 'تفعيل صلاحية مسؤول الجهاز (Device Administrator)')}
                  <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] rounded-full uppercase tracking-wider font-mono font-bold">
                    SYSTEM PRIVILEGE
                  </span>
                </p>
                <p className="text-xs text-indigo-300/80 mt-0.5">
                  {translateInline(
                    lang,
                    'Grants elevated OS privileges to prevent uninstallation, execute instant screen locks, and prioritize offline background emergency SMS.',
                    'يمنح التطبيق صلاحيات عالية لحماية الهاتف من الإلغاء، تنفيذ القفل الفوري للشاشة، ورفع أولوية إرسال SMS في الخلفية.'
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGrantDeviceAdmin}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl whitespace-nowrap shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{translateInline(lang, 'Activate Device Admin Rights', 'تفعيل مسؤول الجهاز مباشرة')}</span>
                <span className="text-sm">🛡️</span>
              </button>
              <button
                type="button"
                onClick={handleOpenDeviceAdminSettingsDirectly}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 text-xs font-semibold rounded-xl whitespace-nowrap transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                title={translateInline(
                  lang,
                  'Open in settings directly if direct activation shows a black screen',
                  'فتح في الإعدادات مباشرة (استخدم هذا الخيار في حال ظهور شاشة سوداء)'
                )}
              >
                <span>{translateInline(lang, 'Open in Settings (Fallback)', 'فتح في الإعدادات (حل بديل)')}</span>
                <span className="text-xs">⚙️</span>
              </button>
            </div>
          </div>
        )}

        {/* Native Android Auto-Confirm Accessibility Service Banner (Zero-Touch SMS Dispatch) */}
        {Capacitor.isNativePlatform() && accessibilityServiceActive === false && (
          <div className="bg-gradient-to-r from-teal-950/70 via-cyan-950/60 to-slate-900/80 border border-teal-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-teal-200 backdrop-blur-md shadow-lg shadow-teal-950/60">
            <div className="flex items-start gap-3 w-full sm:w-auto">
              <span className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl text-lg font-bold shrink-0 mt-0.5">🤖</span>
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                  {translateInline(lang, 'Activate Phone Security Service (Zero-Touch SMS)', 'تفعيل خدمة حماية الهاتف (إرسال الرسائل بدون لمس الشاشة)')}
                  <span className="px-2 py-0.5 bg-teal-500/30 text-teal-300 text-[10px] rounded-full uppercase tracking-wider font-mono font-bold">
                    ZERO-TOUCH SMS
                  </span>
                </p>
                <p className="text-xs text-teal-200/90 mt-1 leading-relaxed">
                  {translateInline(
                    lang,
                    'Allows DroidGuard to instantly auto-click "Send" when Android shows the SMS confirmation dialog, dispatching silent alerts with zero physical touch. (Tap "Downloaded apps" -> Enable Phone Security App)',
                    'تمنح التطبيق صلاحية الضغط التلقائي الفوري على زر "إرسال" فور ظهور نافذة "سيرسل رسالة SMS" بدون لمس الشاشة. (في شاشة الإعدادات: اضغط "التطبيقات التي تم تنزيلها" ثم فعّل "تطبيق حماية الهاتف")'
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGrantAccessibilityService}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl whitespace-nowrap shadow-lg shadow-teal-600/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>{translateInline(lang, 'Activate Auto-Confirm Service Now', 'تفعيل خدمة النقر التلقائي الآن')}</span>
              <span className="text-sm">⚡</span>
            </button>
          </div>
        )}

        {/* Native Android Premium SMS Access Bypass Banner */}
        {Capacitor.isNativePlatform() && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-200 backdrop-blur-md shadow-lg shadow-amber-950/60">
            <div className="flex items-start gap-3 w-full sm:w-auto">
              <span className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl text-lg font-bold shrink-0 mt-0.5">⚡</span>
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                  {translateInline(lang, 'Enable Premium SMS Access (Bypass OEM Restrictions)', 'تفعيل الوصول إلى الرسائل المميزة (تجاوز قيود الشركات المصنعة)')}
                  <span className="px-2 py-0.5 bg-amber-500/30 text-amber-300 text-[10px] rounded-full uppercase tracking-wider font-mono font-bold">
                    OEM BYPASS
                  </span>
                </p>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  {translateInline(
                    lang,
                    "Please scroll down to 'Premium SMS access' and change it from 'Ask' to 'Always Allow' to ensure silent background SOS delivery without countdown popups.",
                    "يرجى التمرير للأسفل داخل صفحة معلومات التطبيق واختيار 'الوصول إلى الرسائل المميزة' (Premium SMS access) وتغييرها من 'سؤال' (Ask) إلى 'السماح دائماً' (Always Allow) لضمان إرسال رسائل الطوارئ في الخلفية بصمت تام دون نوافذ عد تنازلي."
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openPremiumSmsSettings()}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-xs rounded-xl whitespace-nowrap shadow-lg shadow-amber-600/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>{translateInline(lang, 'Enable Premium SMS Access', 'تفعيل الوصول إلى الرسائل المميزة')}</span>
              <span className="text-sm">⚙️</span>
            </button>
          </div>
        )}

        {/* Featured Cyberpunk Core: Master Shield Button, AsyncStorage Chat ID & Security Binding */}
        <CyberpunkConsole
          config={config}
          onChangeConfig={setConfig}
          lang={lang}
          onLogDispatch={handleLogDispatch}
          onSaveCapture={handleSaveCapture}
        />
        {/* Section 2: Sensor Setup & Security Dashboard */}
        <Dashboard
          config={config}
          onChangeConfig={setConfig}
          lang={lang}
          onTriggerTheft={handleTriggerTheft}
          onTriggerCamera={handleTriggerCamera}
          onTriggerPowerChallenge={() => setShowPowerOffModal(true)}
          onSecurityLog={handleLogDispatch}
        />
        {/* Section 3: Dual-SIM Smart Dispatch & Network Management with Carrier Detection */}
        <DualSimNetworkCard
          lang={lang}
          onTriggerStealthStolen={handleTriggerTheft}
          onLogDispatch={handleLogDispatch}
        />
        {/* Section 4: Captured Intruder Photos Gallery */}
        <IntruderGallery
          captures={captures}
          onDeleteCapture={handleDeleteCapture}
          onClearCaptures={handleClearCaptures}
          lang={lang}
        />
        {/* Section 5: Emergency Dispatch Logs */}
        <DispatchHistory
          logs={dispatchEvents}
          onClearLogs={handleClearDispatches}
          lang={lang}
        />
      </div>
    );
  }, [
    activeTab,
    config,
    lang,
    captures,
    dispatchEvents,
    smsPermissionGranted,
    deviceAdminActive,
    isDefaultSmsAppActive,
    handleSetDefaultSmsApp,
    handleGrantSmsPermission,
    handleGrantDeviceAdmin,
    handleLogDispatch,
    handleSaveCapture,
    handleTriggerTheft,
    handleTriggerCamera,
    handleDeleteCapture,
    handleClearCaptures,
    handleClearDispatches,
  ]);

  const messagesTabContent = React.useMemo(() => {
    return (
      <div className={`space-y-4 ${activeTab === 'messages' ? 'block' : 'hidden'}`}>
        <GoogleMessagesScreen
          lang={lang}
          onOpenSmsConfig={() => setActiveTab('sms')}
        />
      </div>
    );
  }, [activeTab, lang]);

  const smsTabContent = React.useMemo(() => {
    return (
      <div className={`space-y-8 ${activeTab === 'sms' ? 'block' : 'hidden'}`}>
        <SmsEmergencyTabScreen
          config={config}
          onChangeConfig={setConfig}
          lang={lang}
          onLogDispatch={handleLogDispatch}
          onTriggerStealthStolen={handleTriggerTheft}
        />
        {/* Filtered logs for Emergency SMS and Dual Dispatch */}
        <DispatchHistory
          logs={dispatchEvents.filter(
            (e) =>
              e.type === 'emergency_sms' ||
              e.type === 'stealth_dispatch' ||
              e.recipient.startsWith('+') ||
              !e.recipient.includes('@')
          )}
          onClearLogs={handleClearDispatches}
          lang={lang}
        />
      </div>
    );
  }, [activeTab, config, lang, dispatchEvents, handleLogDispatch, handleTriggerTheft, handleClearDispatches]);

  const telegramTabContent = React.useMemo(() => {
    return (
      <div className={`space-y-8 ${activeTab === 'telegram' ? 'block' : 'hidden'}`}>
        <TelegramTabScreen
          lang={lang}
          config={config}
          onChangeConfig={setConfig}
        />
        {/* Filtered logs for Telegram */}
        <DispatchHistory
          logs={dispatchEvents.filter(
            (e) =>
              e.type === 'telegram_alert' ||
              e.type === 'telegram_photo' ||
              e.type === 'telegram_location'
          )}
          onClearLogs={handleClearDispatches}
          lang={lang}
        />
      </div>
    );
  }, [activeTab, lang, config, dispatchEvents, handleClearDispatches]);

  const gmailTabContent = React.useMemo(() => {
    return (
      <div className={`space-y-8 ${activeTab === 'gmail' ? 'block' : 'hidden'}`}>
        <GmailTabScreen
          lang={lang}
          config={config}
          onChangeConfig={setConfig}
          onSecurityLog={handleLogDispatch}
        />
        {/* Filtered logs for email */}
        <DispatchHistory
          logs={dispatchEvents.filter(
            (e) => e.type === 'location_ping' || e.recipient.includes('@')
          )}
          onClearLogs={handleClearDispatches}
          lang={lang}
        />
      </div>
    );
  }, [activeTab, lang, config, dispatchEvents, handleLogDispatch, handleClearDispatches]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col antialiased relative" style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
      {/* TopNav with quick locks, fake power off simulation & language switch */}
      <TopNav
        lang={lang}
        onSelectLang={handleSelectLanguage}
        onLockApp={() => setIsAppAuthenticated(false)}
        onTriggerFakePowerOff={() =>
          executeTheftTrigger(theftTriggerSender || config.emergencyContactPhone || '')
        }
        onOpenElevatedModal={() => setIsElevatedPermissionsModalOpen(true)}
        hasElevatedIssues={Capacitor.isNativePlatform() && (!deviceAdminActive || !accessibilityServiceActive || locationServiceActive === false)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 pb-32">
        {/* PWA Install Banner */}
        <PWAInstallBanner lang={lang} />

        {/* GPS Hardware Disabled Warning Banner */}
        {Capacitor.isNativePlatform() && locationServiceActive === false && (
          <div
            id="banner-gps-disabled-alert"
            className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/40 animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <Navigation className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <p className="font-bold text-amber-100">
                  {translateInline(
                    lang,
                    'Phone Location (GPS) is turned OFF in Android Settings!',
                    'خدمة الموقع (GPS) مغلقة في إعدادات الهاتف!'
                  )}
                </p>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  {translateInline(
                    lang,
                    'Turn ON GPS so emergency SMS can attach live Google Maps coordinates.',
                    'يرجى تشغيل ميزة الموقع في شريط إشعارات الهاتف لضمان إرسال إحداثيات موقعك ورابط الخرائط في رسائل الطوارئ.'
                  )}
                </p>
              </div>
            </div>
            <button
              id="btn-banner-open-gps"
              type="button"
              onClick={openLocationSettingsScreen}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>{translateInline(lang, 'Turn On GPS Now 📍', 'تشغيل الموقع (GPS) الآن 📍')}</span>
            </button>
          </div>
        )}

        {/* Offline Network Status Toast */}
        <OfflineIndicator lang={lang} />

        {/* Stealth Stolen Mode Unlock Success Notice */}
        {stealthUnlockNotice && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-sm font-mono-code flex items-center justify-between shadow-lg shadow-emerald-950/50 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>{stealthUnlockNotice}</span>
            </div>
            <button
              onClick={() => setStealthUnlockNotice(null)}
              className="px-3 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs cursor-pointer transition font-bold"
            >
              {translateInline(lang, 'Dismiss', 'إغلاق')}
            </button>
          </div>
        )}

        {homeTabContent}
        {messagesTabContent}
        {smsTabContent}
        {telegramTabContent}
        {gmailTabContent}
      </main>

      {/* Fixed Bottom Navigation Bar (4 Clean Tabs) */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
        lang={lang}
        hasSmsConfigured={Boolean(config.emergencyContactPhone)}
        hasTelegramConfigured={Boolean(config.telegramChatId)}
        hasGmailConfigured={Boolean(config.userEmail)}
      />

      {/* Footer */}
      <footer className="py-6 mb-16 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <p>Anti-Theft Mobile Security Unit • Android Security Architecture</p>
      </footer>

      {/* Stealth Stolen Mode Screen */}
      <LockdownScreen
        isOpen={isStealthStolenModeOpen}
        onDismiss={(summary) => {
          setIsStealthStolenModeOpen(false);
          setStealthUnlockNotice(summary);
        }}
        triggerSender={theftTriggerSender}
        lang={lang}
        onLogDispatch={handleLogDispatch}
        onSaveCapture={handleSaveCapture}
        telegramBotToken={config.telegramAlertsEnabled ? config.telegramBotToken : undefined}
        telegramChatId={config.telegramAlertsEnabled ? config.telegramChatId : undefined}
        userEmail={config.userEmail}
        emergencyPhone={config.emergencyContactPhone}
      />

      {/* Emergency Non-Dismissible Lock Overlay (fallback siren overlay) */}
      <EmergencyLockOverlay
        isOpen={isTheftModeTriggered}
        onDismiss={handleDismissTheftLock}
        triggerSender={theftTriggerSender}
        emergencyPhone={config.emergencyContactPhone}
        location={currentLocation}
        lang={lang}
        onTriggerFakePowerOff={() => {
          setIsTheftModeTriggered(false);
          setIsStealthStolenModeOpen(true);
        }}
      />

      {/* First Launch Language Selector Modal Popup in Center of Screen */}
      <LanguageSelectorModal
        isOpen={showFirstLaunchLangModal}
        onClose={handleDismissFirstLaunchModal}
        currentLang={lang}
        onSelectLang={handleSelectLanguage}
        isFirstLaunch={true}
      />

      {/* Elevated Permissions & Auto-Confirm Onboarding Modal */}
      <ElevatedPermissionsModal
        isOpen={isElevatedPermissionsModalOpen}
        onClose={() => setIsElevatedPermissionsModalOpen(false)}
        lang={lang}
        deviceAdminActive={deviceAdminActive}
        accessibilityActive={accessibilityServiceActive}
        locationServiceActive={locationServiceActive}
        onActivateDeviceAdmin={handleGrantDeviceAdmin}
        onOpenDeviceAdminSettings={handleOpenDeviceAdminSettingsDirectly}
        onActivateAccessibility={handleGrantAccessibilityService}
        onOpenLocationSettings={openLocationSettingsScreen}
        onDeactivateDeviceAdmin={handleDeactivateDeviceAdmin}
      />

      {/* Anti-Shutdown / Power-Off PIN & Biometric Challenge Overlay Modal */}
      <PowerOffChallengeModal
        isOpen={showPowerOffModal}
        onClose={() => setShowPowerOffModal(false)}
        config={config}
        lang={lang}
        onIntruderCaptured={(imageUrl, lat, lng) => {
          const newCapture: IntruderCapture = {
            id: generateUniqueId('intruder-power'),
            imageUrl,
            timestamp: new Date().toLocaleTimeString(),
            location: {
              latitude: lat || 0,
              longitude: lng || 0,
              accuracy: 10,
              mapsUrl: `https://maps.google.com/?q=${lat || 0},${lng || 0}`,
            },
            triggerSource: 'power_off_attempt',
            senderNumber: config.emergencyContactPhone || 'Local Power Intercept',
            dispatchedVia: ['sms', 'telegram', 'email'],
          };
          setCaptures((prev) => [newCapture, ...prev]);
        }}
      />
    </div>
  );
}
