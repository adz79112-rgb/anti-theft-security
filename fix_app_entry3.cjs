const fs = require('fs');
let text = fs.readFileSync('src/components/AppEntryGate.tsx', 'utf-8');

const dict = {
  "\\(محاولة فاشلة \\$\\{res.newCount\\} من 3\\)\\. عند المحاولة الثالثة سيتم التقاط صورة الدخيل وإرسال تقارير الطوارئ\\.": "(Failed attempt ${res.newCount} of 3). On the 3rd attempt, intruder photo will be captured and emergency reports sent.",
  "جاري فحص البصمة...": "Scanning fingerprint...",
  "بصمة متسلل غير مطابقة": "Intruder fingerprint not matched",
  "رمز PIN غير صحيح": "Incorrect PIN"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}
// For literal strings inside functions
text = text.replace(/'جاري فحص البصمة\.\.\.'/g, "translateInline(lang, 'Scanning fingerprint...', 'جاري فحص البصمة...')");
text = text.replace(/'بصمة متسلل غير مطابقة'/g, "translateInline(lang, 'Intruder fingerprint not matched', 'بصمة متسلل غير مطابقة')");
text = text.replace(/'رمز PIN غير صحيح'/g, "translateInline(lang, 'Incorrect PIN', 'رمز PIN غير صحيح')");

fs.writeFileSync('src/components/AppEntryGate.tsx', text);
