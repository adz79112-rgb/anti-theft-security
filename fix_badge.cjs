const fs = require('fs');
let text = fs.readFileSync('src/components/StealthStatusBadge.tsx', 'utf-8');

const dict = {
  "شارة الأمان الخفية: رصد \\$\\{attempts\\} محاولة دخول غير مصرح بها": "Stealth Security Badge: Detected ${attempts} unauthorized entry attempts",
  "تم تسجيل \\$\\{attempts\\} محاولة دخول خاطئة. تم التقاط صورة المتسلل وإرسال الموقع الجغرافي عند المحاولة الثالثة.": "Recorded ${attempts} incorrect entry attempts. Intruder photo captured and GPS location sent on the 3rd attempt."
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

text = text.replace(
  /`شارة الأمان الخفية: رصد \$\{attempts\} محاولة دخول غير مصرح بها`/g,
  "`${translateInline(lang, 'Stealth Security Badge: Detected ${attempts} unauthorized entry attempts', 'شارة الأمان الخفية: رصد ${attempts} محاولة دخول غير مصرح بها')}`"
);

text = text.replace(
  /`تم تسجيل \$\{attempts\} محاولة دخول خاطئة\. تم التقاط صورة المتسلل وإرسال الموقع الجغرافي عند المحاولة الثالثة\.`/g,
  "`${translateInline(lang, 'Recorded ${attempts} incorrect entry attempts. Intruder photo captured and GPS location sent on the 3rd attempt.', 'تم تسجيل ${attempts} محاولة دخول خاطئة. تم التقاط صورة المتسلل وإرسال الموقع الجغرافي عند المحاولة الثالثة.')}`"
);

fs.writeFileSync('src/components/StealthStatusBadge.tsx', text);
