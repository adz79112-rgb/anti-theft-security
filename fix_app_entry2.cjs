const fs = require('fs');
let text = fs.readFileSync('src/components/AppEntryGate.tsx', 'utf-8');

text = text.replace(
  /'🚨 \[translateInline\(lang, 'Intruder photo captured silently!', 'تم التقاط صورة المتسلل صامتاً!'\)\] تم استنفاد 3 محاولات فاشلة\. تم إرسال الموقع الجغرافي وصورة الكاميرا فوراً لقنوات الطوارئ \(Telegram, Gmail, Dual-SMS\)\.'/g,
  "`🚨 [${translateInline(lang, 'Intruder photo captured silently!', 'تم التقاط صورة المتسلل صامتاً!')}] تم استنفاد 3 محاولات فاشلة. تم إرسال الموقع الجغرافي وصورة الكاميرا فوراً لقنوات الطوارئ (Telegram, Gmail, Dual-SMS).`"
);

fs.writeFileSync('src/components/AppEntryGate.tsx', text);
