const fs = require('fs');
let text = fs.readFileSync('src/components/TelegramTabScreen.tsx', 'utf-8');

const dict = {
  "رفع صور الكاميرا الأمامية فوراً": "Instantly upload front camera photos",
  "إرسال Live Location تفاعلي": "Send interactive Live Location",
  "يعمل بصمت تام وبدون تكلفة SMS": "Operates completely silently with no SMS cost"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(`>\\s*${ar}\\s*<`, 'g');
  text = text.replace(regex, `>{translateInline(lang, '${en}', '${ar}')}<`);
}

fs.writeFileSync('src/components/TelegramTabScreen.tsx', text);
