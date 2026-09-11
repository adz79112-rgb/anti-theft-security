import { Language } from '../types';

export interface LanguageMeta {
  code: Language;
  name: string; // Native name
  englishName: string;
  arabicName: string;
  flag: string;
  country: string;
  category: 'primary' | 'high_risk' | 'global';
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES_REGISTRY: LanguageMeta[] = [
  // =========================================================================
  // Section 1: Pinned Top Primary Languages (القسم الأول المثبت بالأعلى)
  // =========================================================================
  {
    code: 'en',
    name: 'English (US)',
    englishName: 'English (US)',
    arabicName: 'الإنجليزية (أمريكا)',
    flag: '🇺🇸',
    country: 'United States',
    category: 'primary',
    dir: 'ltr',
  },
  {
    code: 'en-GB',
    name: 'English (UK)',
    englishName: 'English (UK)',
    arabicName: 'الإنجليزية (بريطانيا)',
    flag: '🇬🇧',
    country: 'United Kingdom',
    category: 'primary',
    dir: 'ltr',
  },
  {
    code: 'fr',
    name: 'Français',
    englishName: 'French',
    arabicName: 'الفرنسية',
    flag: '🇫🇷',
    country: 'France',
    category: 'primary',
    dir: 'ltr',
  },
  {
    code: 'ar',
    name: 'العربية',
    englishName: 'Arabic',
    arabicName: 'العربية (الجزائر / السعودية)',
    flag: '🇩🇿',
    country: 'Algeria / Saudi Arabia',
    category: 'primary',
    dir: 'rtl',
  },
  {
    code: 'zh',
    name: '中文 (简体)',
    englishName: 'Chinese (Simplified)',
    arabicName: 'الصينية',
    flag: '🇨🇳',
    country: 'China',
    category: 'primary',
    dir: 'ltr',
  },
  {
    code: 'it',
    name: 'Italiano',
    englishName: 'Italian',
    arabicName: 'الإيطالية',
    flag: '🇮🇹',
    country: 'Italy',
    category: 'primary',
    dir: 'ltr',
  },

  // =========================================================================
  // Section 2: High Phone-Theft Risk Regional Languages (لغات دول ذات معدلات سرقة مرتفعة)
  // =========================================================================
  {
    code: 'es',
    name: 'Español (Latinoamérica)',
    englishName: 'Spanish (LatAm)',
    arabicName: 'الإسبانية (المكسيك / كولومبيا)',
    flag: '🇲🇽',
    country: 'Mexico / Colombia',
    category: 'high_risk',
    dir: 'ltr',
  },
  {
    code: 'pt',
    name: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
    arabicName: 'البرتغالية (البرازيل)',
    flag: '🇧🇷',
    country: 'Brazil',
    category: 'high_risk',
    dir: 'ltr',
  },
  {
    code: 'zu',
    name: 'isiZulu',
    englishName: 'Zulu',
    arabicName: 'الزولو (جنوب أفريقيا)',
    flag: '🇿🇦',
    country: 'South Africa',
    category: 'high_risk',
    dir: 'ltr',
  },
  {
    code: 'af',
    name: 'Afrikaans',
    englishName: 'Afrikaans',
    arabicName: 'الأفريقانية (جنوب أفريقيا)',
    flag: '🇿🇦',
    country: 'South Africa',
    category: 'high_risk',
    dir: 'ltr',
  },
  {
    code: 'ha',
    name: 'Hausa',
    englishName: 'Hausa',
    arabicName: 'الهوسا (نيجيريا / غرب أفريقيا)',
    flag: '🇳🇬',
    country: 'Nigeria',
    category: 'high_risk',
    dir: 'ltr',
  },
  {
    code: 'sw',
    name: 'Kiswahili',
    englishName: 'Swahili',
    arabicName: 'السواحلية (كينيا / شرق أفريقيا)',
    flag: '🇰🇪',
    country: 'Kenya / East Africa',
    category: 'high_risk',
    dir: 'ltr',
  },
  {
    code: 'tl',
    name: 'Tagalog / Filipino',
    englishName: 'Tagalog (Filipino)',
    arabicName: 'التاغالوغية (الفلبين)',
    flag: '🇵🇭',
    country: 'Philippines',
    category: 'high_risk',
    dir: 'ltr',
  },
  {
    code: 'hi',
    name: 'हिन्दी (Hindi)',
    englishName: 'Hindi',
    arabicName: 'الهندية (الهند)',
    flag: '🇮🇳',
    country: 'India',
    category: 'high_risk',
    dir: 'ltr',
  },

  // =========================================================================
  // Section 3: Global Languages (لغات عالمية إضافية)
  // =========================================================================
  {
    code: 'de',
    name: 'Deutsch',
    englishName: 'German',
    arabicName: 'الألمانية',
    flag: '🇩🇪',
    country: 'Germany',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'ru',
    name: 'Русский',
    englishName: 'Russian',
    arabicName: 'الروسية',
    flag: '🇷🇺',
    country: 'Russia',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'tr',
    name: 'Türkçe',
    englishName: 'Turkish',
    arabicName: 'التركية',
    flag: '🇹🇷',
    country: 'Turkey',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'ur',
    name: 'اردو (Urdu)',
    englishName: 'Urdu',
    arabicName: 'الأردية (باكستان)',
    flag: '🇵🇰',
    country: 'Pakistan',
    category: 'global',
    dir: 'rtl',
  },
  {
    code: 'bn',
    name: 'বাংলা (Bengali)',
    englishName: 'Bengali',
    arabicName: 'البنغالية (بنغلاديش)',
    flag: '🇧🇩',
    country: 'Bangladesh',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'id',
    name: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    arabicName: 'الإندونيسية',
    flag: '🇮🇩',
    country: 'Indonesia',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'vi',
    name: 'Tiếng Việt',
    englishName: 'Vietnamese',
    arabicName: 'الفيتنامية',
    flag: '🇻🇳',
    country: 'Vietnam',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'fa',
    name: 'فارسی (Persian)',
    englishName: 'Persian',
    arabicName: 'الفارسية (إيران)',
    flag: '🇮🇷',
    country: 'Iran',
    category: 'global',
    dir: 'rtl',
  },
  {
    code: 'ja',
    name: '日本語 (Japanese)',
    englishName: 'Japanese',
    arabicName: 'اليابانية',
    flag: '🇯🇵',
    country: 'Japan',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'ko',
    name: '한국어 (Korean)',
    englishName: 'Korean',
    arabicName: 'الكورية',
    flag: '🇰🇷',
    country: 'South Korea',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'pl',
    name: 'Polski',
    englishName: 'Polish',
    arabicName: 'البولندية',
    flag: '🇵🇱',
    country: 'Poland',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'th',
    name: 'ไทย (Thai)',
    englishName: 'Thai',
    arabicName: 'التايلاندية (تايلاند)',
    flag: '🇹🇭',
    country: 'Thailand',
    category: 'global',
    dir: 'ltr',
  },
  {
    code: 'el',
    name: 'Ελληνικά (Greek)',
    englishName: 'Greek',
    arabicName: 'اليونانية (اليونان)',
    flag: '🇬🇷',
    country: 'Greece',
    category: 'global',
    dir: 'ltr',
  },
];

/**
 * Detects the system/device language from navigator.language and navigator.languages
 * and maps it to the closest supported Language code.
 */
export function detectDeviceLanguage(): Language {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'ar';
  }

  const rawLanguages: string[] = [
    navigator.language,
    ...(navigator.languages || []),
  ].filter(Boolean);

  for (const raw of rawLanguages) {
    const norm = raw.toLowerCase().trim();

    // Direct match (e.g. 'en-gb')
    if (norm === 'en-gb' || norm === 'en-uk') {
      return 'en-GB';
    }
    if (norm.startsWith('ar')) {
      return 'ar';
    }
    if (norm.startsWith('zh')) {
      return 'zh';
    }
    if (norm.startsWith('fr')) {
      return 'fr';
    }
    if (norm.startsWith('it')) {
      return 'it';
    }
    if (norm.startsWith('es')) {
      return 'es';
    }
    if (norm.startsWith('pt')) {
      return 'pt';
    }
    if (norm.startsWith('zu')) {
      return 'zu';
    }
    if (norm.startsWith('af')) {
      return 'af';
    }
    if (norm.startsWith('ha')) {
      return 'ha';
    }
    if (norm.startsWith('sw')) {
      return 'sw';
    }
    if (norm.startsWith('tl') || norm.startsWith('fil')) {
      return 'tl';
    }
    if (norm.startsWith('hi')) {
      return 'hi';
    }
    if (norm.startsWith('de')) {
      return 'de';
    }
    if (norm.startsWith('ru')) {
      return 'ru';
    }
    if (norm.startsWith('tr')) {
      return 'tr';
    }
    if (norm.startsWith('ur')) {
      return 'ur';
    }
    if (norm.startsWith('bn')) {
      return 'bn';
    }
    if (norm.startsWith('id') || norm.startsWith('in')) {
      return 'id';
    }
    if (norm.startsWith('vi')) {
      return 'vi';
    }
    if (norm.startsWith('fa')) {
      return 'fa';
    }
    if (norm.startsWith('ja')) {
      return 'ja';
    }
    if (norm.startsWith('ko')) {
      return 'ko';
    }
    if (norm.startsWith('pl')) {
      return 'pl';
    }
    if (norm.startsWith('th')) {
      return 'th';
    }
    if (norm.startsWith('el') || norm.startsWith('gr')) {
      return 'el';
    }
    if (norm.startsWith('en')) {
      return 'en';
    }
  }

  return 'ar';
}
