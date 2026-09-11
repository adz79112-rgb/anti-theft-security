const fs = require('fs');
let text = fs.readFileSync('src/components/AppEntryGate.tsx', 'utf-8');

const dict = {
  "محاكاة بصمة دخيل غير مطابقة \\(اختبار فحص الـ 3 محاولات\\)": "Simulate unmatched intruder fingerprint (Test 3-attempts check)",
  "أدخل رمز قفل الهاتف \\(الرمز الافتراضي: ": "Enter phone lock PIN (Default PIN: ",
  "\\):": "):",
  "مسح": "Clear",
  "محاكاة إدخال رمز خاطئ \\(فحص رصد الدخيل\\)": "Simulate incorrect PIN entry (Intruder detection check)",
  "العودة للمصادقة بالبصمة": "Return to fingerprint authentication",
  "تم التقاط صورة المتسلل صامتاً!": "Intruder photo captured silently!"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')`);
}

// Special cases
text = text.replace(
  /أدخل رمز قفل الهاتف \(الرمز الافتراضي: <span className="font-mono-code font-bold text-emerald-400">\{ownerPin\}<\/span>\):/g,
  "{translateInline(lang, 'Enter phone lock PIN (Default PIN: ', 'أدخل رمز قفل الهاتف (الرمز الافتراضي: ')} <span className=\"font-mono-code font-bold text-emerald-400\">{ownerPin}</span> {translateInline(lang, '):', '):')}"
);

text = text.replace(
  /onClick=\{\(\) => handleFailed\('تم إدخال رمز PIN خاطئ'\)\}/g,
  "onClick={() => handleFailed(translateInline(lang, 'Incorrect PIN entered', 'تم إدخال رمز PIN خاطئ'))}"
);

// add import
if (!text.includes('translateInline')) {
  text = text.replace(/import [^\n]+;\n/, match => match + "import { translateInline } from '../utils/translateInline';\n");
}

fs.writeFileSync('src/components/AppEntryGate.tsx', text);
