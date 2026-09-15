export interface SecurityConfig {
  code: string; // 3 digits, e.g. "123"
  secretKey: string; // 3 letters, e.g. "ABC"
  triggerCommand: string; // Secret trigger command, e.g. "#TRACK"
  isProtectionActive: boolean;
  isGpsTrackingEnabled: boolean;
  isPanicAlarmEnabled: boolean;
  isAutoCameraEnabled: boolean;
  dynamicSenderReply: boolean; // Automatically replies to whichever phone number sent the trigger SMS
  testSenderNumber?: string; // Optional test number for preview simulation
  telegramBotToken?: string; // Telegram Bot Token, default "8818517549:AAF7e5ziwfasqWtm8cXjFXS_wf1kZNh-ZhI"
  telegramChatId?: string; // Telegram Chat ID or User ID
  telegramAlertsEnabled?: boolean; // Send real-time instant alerts and captured photos to Telegram
  userEmail?: string; // User Gmail address for stealth reports
  antiUninstallActive?: boolean; // Device Admin Anti-Uninstall protection active
  deviceAdminActive?: boolean; // Android Device Admin Policy active
  emergencyContactPhone?: string; // Primary verified emergency phone number for dual SMS dispatch
  stealthModeEnabled?: boolean; // Stealth Stolen Mode (Fake Off & Periodic Dispatch)
  dualSimDispatchEnabled?: boolean; // Dual-SIM SMS Fallback (SIM 1 + SIM 2)
  antiShutdownProtectionActive?: boolean; // Power-Off PIN Protection (requires PIN/biometrics before powering off)
  antiShutdownPin?: string; // Custom PIN for power off (or defaults to app code/device credential)
}

export type AppConfig = SecurityConfig;

export type ActionKeyword = 'theft' | 'camera' | 'track' | 'unknown';

export interface ParsedTrigger {
  rawMessage: string;
  code: string;
  secretKey: string;
  keyword: string;
  action: ActionKeyword;
  isValid: boolean;
  errorReason?: string;
  senderNumber: string;
  timestamp: string;
}

export interface IntruderCapture {
  id: string;
  imageUrl: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    mapsUrl: string;
    addressDescription?: string;
  };
  triggerSource: string;
  senderNumber: string;
  dispatchedVia: ('sms' | 'whatsapp' | 'telegram' | 'email')[];
}

export interface DispatchEvent {
  id: string;
  timestamp: string;
  recipient: string;
  type:
    | 'emergency_sms'
    | 'camera_report'
    | 'location_ping'
    | 'telegram_alert'
    | 'telegram_photo'
    | 'dual_reverse_sms'
    | 'telegram_location'
    | 'gmail_report'
    | 'dual_sim_sms'
    | 'stealth_dispatch'
    | 'whatsapp_dispatch';
  content: string;
  status: 'sent' | 'delivered' | 'failed';
}

export interface StoredSmsMessage {
  id: string;
  sender: string;
  body: string;
  timestamp: number;
  type: 'inbox' | 'sent';
  read?: boolean;
}

export type NavTabId = 'home' | 'sms' | 'telegram' | 'gmail';

export type Language =
  // Section 1: Pinned Top Primary Languages
  | 'en' // English (US 🇺🇸)
  | 'en-GB' // English (UK 🇬🇧)
  | 'fr' // French (🇫🇷)
  | 'ar' // Arabic (🇩🇿 / 🇸🇦)
  | 'zh' // Chinese (🇨🇳)
  | 'it' // Italian (🇮🇹)
  // Section 2: High Phone-Theft Risk Regional Languages
  | 'es' // Spanish (Mexico/Colombia 🇲🇽/🇨🇴)
  | 'pt' // Portuguese (Brazil 🇧🇷)
  | 'zu' // Zulu (South Africa 🇿🇦)
  | 'af' // Afrikaans (South Africa 🇿🇦)
  | 'ha' // Hausa (Nigeria 🇳🇬)
  | 'sw' // Swahili (East Africa/Kenya 🇰🇪)
  | 'tl' // Tagalog / Filipino (Philippines 🇵🇭)
  | 'hi' // Hindi (India 🇮🇳)
  // Section 3: Global Languages
  | 'de' // German (🇩🇪)
  | 'ru' // Russian (🇷🇺)
  | 'tr' // Turkish (🇹🇷)
  | 'ur' // Urdu (Pakistan 🇵🇰)
  | 'bn' // Bengali (Bangladesh 🇧🇩)
  | 'id' // Indonesian (🇮🇩)
  | 'vi' // Vietnamese (🇻🇳)
  | 'fa' // Persian (Iran 🇮🇷)
  | 'ja' // Japanese (🇯🇵)
  | 'ko' // Korean (🇰🇷)
  | 'pl' // Polish (🇵🇱)
  | 'th' // Thai (ไทย 🇹🇭)
  | 'el'; // Greek (Ελληνικά 🇬🇷)
