const fs = require('fs');
let text = fs.readFileSync('src/components/AppEntryGate.tsx', 'utf-8');

// Line 102
text = text.replace(
  /setScanFeedback\('\$\{translateInline\(lang, 'Scanning fingerprint\.\.\.', translateInline\(lang, 'Scanning fingerprint\.\.\.', 'جاري فحص البصمة\.\.\.'\)\)\}'\);/g,
  "setScanFeedback(translateInline(lang, 'Scanning fingerprint...', 'جاري فحص البصمة...'));"
);

// Line 104
text = text.replace(
  /handleFailed\('\$\{translateInline\(lang, 'Intruder fingerprint not matched', translateInline\(lang, 'Intruder fingerprint not matched', 'بصمة متسلل غير مطابقة'\)\)\}'\);/g,
  "handleFailed(translateInline(lang, 'Intruder fingerprint not matched', 'بصمة متسلل غير مطابقة'));"
);

// Line 120
text = text.replace(
  /await handleFailed\('\$\{translateInline\(lang, 'Incorrect PIN', translateInline\(lang, 'Incorrect PIN', 'رمز PIN غير صحيح'\)\)\}'\);/g,
  "await handleFailed(translateInline(lang, 'Incorrect PIN', 'رمز PIN غير صحيح'));"
);

// Line 210
text = text.replace(
  /<span>translateInline\(lang, 'Simulate unmatched intruder fingerprint \(Test 3-attempts check\)', 'محاكاة بصمة دخيل غير مطابقة \(اختبار فحص الـ 3 محاولات\)'\)<\/span>/g,
  "<span>{translateInline(lang, 'Simulate unmatched intruder fingerprint (Test 3-attempts check)', 'محاكاة بصمة دخيل غير مطابقة (اختبار فحص الـ 3 محاولات)')}</span>"
);

// Line 229
text = text.replace(
  /translateInline\(lang, 'Enter phone lock PIN \(Default PIN: ', 'أدخل رمز قفل الهاتف \(الرمز الافتراضي: '\)<span className="font-mono-code font-bold text-emerald-400">\{ownerPin\}<\/span>translateInline\(lang, '\):', '\):'\)/g,
  "{translateInline(lang, 'Enter phone lock PIN (Default PIN: ', 'أدخل رمز قفل الهاتف (الرمز الافتراضي: ')}<span className=\"font-mono-code font-bold text-emerald-400\">{ownerPin}</span>{translateInline(lang, '):', '):')}"
);

// Line 269
text = text.replace(
  /translateInline\(lang, 'Clear', 'مسح'\)/g,
  "{translateInline(lang, 'Clear', 'مسح')}"
);

// Line 280
text = text.replace(
  />\s*\{?translateInline\(lang, 'Simulate incorrect PIN entry \(Intruder detection check\)', 'محاكاة إدخال رمز خاطئ \(فحص رصد الدخيل\)'\)\}?\s*</g,
  ">{translateInline(lang, 'Simulate incorrect PIN entry (Intruder detection check)', 'محاكاة إدخال رمز خاطئ (فحص رصد الدخيل)')}<"
);

// Line 290
text = text.replace(
  /<span>translateInline\(lang, 'Return to fingerprint authentication', 'العودة للمصادقة بالبصمة'\)<\/span>/g,
  "<span>{translateInline(lang, 'Return to fingerprint authentication', 'العودة للمصادقة بالبصمة')}</span>"
);

// Line 300
text = text.replace(
  /<span>translateInline\(lang, 'Intruder photo captured silently!', 'تم التقاط صورة المتسلل صامتاً!'\)<\/span>/g,
  "<span>{translateInline(lang, 'Intruder photo captured silently!', 'تم التقاط صورة المتسلل صامتاً!')}</span>"
);

fs.writeFileSync('src/components/AppEntryGate.tsx', text);
