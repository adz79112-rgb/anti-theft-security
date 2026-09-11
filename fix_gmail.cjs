const fs = require('fs');
let text = fs.readFileSync('src/components/GmailTabScreen.tsx', 'utf-8');

const dict = {
  "✓ تم إرسال التقرير البريدي التجريبي بنجاح إلى \\$\\{activeEmail\\} شاملاً إحداثيات GPS وصورة الكاميرا.": "✓ Test email report successfully sent to ${activeEmail} including GPS coordinates and camera photo.",
  "\\[تجربة إرسال Gmail\\] تم تسليم تقرير طوارئ تجريبي مع إحداثيات GPS وصورة الكاميرا إلى \\$\\{activeEmail\\}": "[Gmail Test Dispatch] Test emergency report with GPS and photo delivered to ${activeEmail}",
  "صورة المتسلل الأمامية ملحقة": "Front intruder photo attached",
  "رابط موقع Google Maps مباشر": "Direct Google Maps link",
  "قفل أمني 72 ساعة ضد التعديل": "72-hour anti-tamper security lock"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

text = text.replace(
  /`✓ تم إرسال التقرير البريدي التجريبي بنجاح إلى \$\{activeEmail\} شاملاً إحداثيات GPS وصورة الكاميرا\.`/g,
  "`${translateInline(lang, '✓ Test email report successfully sent to ${activeEmail} including GPS coordinates and camera photo.', '✓ تم إرسال التقرير البريدي التجريبي بنجاح إلى ${activeEmail} شاملاً إحداثيات GPS وصورة الكاميرا.')}`"
);

text = text.replace(
  /`\[تجربة إرسال Gmail\] تم تسليم تقرير طوارئ تجريبي مع إحداثيات GPS وصورة الكاميرا إلى \$\{activeEmail\}`/g,
  "`${translateInline(lang, '[Gmail Test Dispatch] Test emergency report with GPS and photo delivered to ${activeEmail}', '[تجربة إرسال Gmail] تم تسليم تقرير طوارئ تجريبي مع إحداثيات GPS وصورة الكاميرا إلى ${activeEmail}')}`"
);

text = text.replace(
  />\s*صورة المتسلل الأمامية ملحقة\s*</g,
  ">{translateInline(lang, 'Front intruder photo attached', 'صورة المتسلل الأمامية ملحقة')}<"
);

text = text.replace(
  />\s*رابط موقع Google Maps مباشر\s*</g,
  ">{translateInline(lang, 'Direct Google Maps link', 'رابط موقع Google Maps مباشر')}<"
);

text = text.replace(
  />\s*قفل أمني 72 ساعة ضد التعديل\s*</g,
  ">{translateInline(lang, '72-hour anti-tamper security lock', 'قفل أمني 72 ساعة ضد التعديل')}<"
);

fs.writeFileSync('src/components/GmailTabScreen.tsx', text);
