const fs = require('fs');
let text = fs.readFileSync('src/components/EmergencyLockOverlay.tsx', 'utf-8');

const dict = {
  "SECURITY LOCKDOWN • وضع الحماية القصوى": "SECURITY LOCKDOWN",
  "إحداثيات الموقع الحالي للجهاز \\(GPS\\)": "Current Device GPS Coordinates",
  "دقة: ": "Accuracy: ",
  "خرائط Google": "Google Maps",
  "تم إرسال بلاغ الطوارئ تلقائياً بالرسائل النصية": "Emergency report sent automatically via SMS",
  "تم إرسال إحداثيات الموقع ورابط الخريطة إلى رقم المفتاح المحرّك:": "Location coordinates and map link sent to the trigger number:",
  "المصادقة تتم عبر أمان الهاتف الداخلي \\(بصمة، وجه، نمط، أو PIN شاشة الهاتف\\)": "Authentication handled via internal device security (Fingerprint, Face, Pattern, or PIN)"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `{translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

// Special case for missing JSX tags
text = text.replace(
  /<span>\{translateInline\(lang, 'SECURITY LOCKDOWN', 'SECURITY LOCKDOWN • وضع الحماية القصوى'\)\}<\/span>/g,
  "<span>{translateInline(lang, 'SECURITY LOCKDOWN', 'SECURITY LOCKDOWN • وضع الحماية القصوى')}</span>"
);

text = text.replace(
  /<span>\{translateInline\(lang, 'Current Device GPS Coordinates', 'إحداثيات الموقع الحالي للجهاز \(GPS\)'\)\}<\/span>/g,
  "<span>{translateInline(lang, 'Current Device GPS Coordinates', 'إحداثيات الموقع الحالي للجهاز (GPS)')}</span>"
);

text = text.replace(
  /\{translateInline\(lang, 'Accuracy: ', 'دقة: '\)\}\{location\?\.accuracy \|\| 12\}m/g,
  "{translateInline(lang, 'Accuracy: ', 'دقة: ')}{location?.accuracy || 12}m"
);

text = text.replace(
  /<span>\{translateInline\(lang, 'Google Maps', 'خرائط Google'\)\}<\/span>/g,
  "<span>{translateInline(lang, 'Google Maps', 'خرائط Google')}</span>"
);

text = text.replace(
  /<span>\{translateInline\(lang, 'Emergency report sent automatically via SMS', 'تم إرسال بلاغ الطوارئ تلقائياً بالرسائل النصية'\)\}<\/span>/g,
  "<span>{translateInline(lang, 'Emergency report sent automatically via SMS', 'تم إرسال بلاغ الطوارئ تلقائياً بالرسائل النصية')}</span>"
);

if (!text.includes('translateInline')) {
  text = text.replace(/import [^\n]+;\n/, match => match + "import { translateInline } from '../utils/translateInline';\n");
}

fs.writeFileSync('src/components/EmergencyLockOverlay.tsx', text);
