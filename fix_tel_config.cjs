const fs = require('fs');
let text = fs.readFileSync('src/components/TelegramConfigCard.tsx', 'utf-8');

const dict = {
  "فشل الاختبار": "Test failed",
  "إخفاء الرمز": "Hide Token",
  "إظهار الرمز": "Show Token"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(`['"]${ar}['"]`, 'g');
  text = text.replace(regex, `translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')`);
}

fs.writeFileSync('src/components/TelegramConfigCard.tsx', text);
