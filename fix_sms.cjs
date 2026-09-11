const fs = require('fs');
let text = fs.readFileSync('src/components/SmsEmergencyTabScreen.tsx', 'utf-8');

const dict = {
  "\\[اختبار أمان DroidGuard\\]\\\\nرابط الموقع المباشر \\(GPS\\):\\\\nhttps://maps.google.com/\\?q=36.7538,3.0588\\\\nتم الإرسال بنجاح إلى رقم الطوارئ المعتمد.": "[DroidGuard Security Test]\\nLive GPS Location Link:\\nhttps://maps.google.com/?q=36.7538,3.0588\\nSuccessfully dispatched to verified emergency number.",
  "\\(رقم الطوارئ المعتمد\\)": "(Verified Emergency Number)",
  "\\[اختبار SMS طوارئ\\] تم إرسال رسالة تجريبية إلى رقم الطوارئ المعتمد:": "[Emergency SMS Test] Test message dispatched to verified emergency number:",
  "رموز سريعة:": "Quick Codes:",
  "\\+213 661 12 34 56 أو \\+966 50 123 4567": "+44 7911 123456 or +1 202 555 0123",
  "إرسال SMS تجريبي فوري إلى هذا الرقم": "Send instant test SMS to this number",
  "✓ تم إرسال رسالة SMS التجريبية بنجاح عبر الشريحة النشطة!": "✓ Test SMS message dispatched successfully via active SIM!",
  "المستلم:": "Recipient:",
  "حالة التسليم: مؤكد \\(Delivered\\)": "Delivery Status: Confirmed (Delivered)",
  "ثابت ومؤكد": "Static & Verified",
  "لم يُحدد بعد": "Not configured",
  "ديناميكي": "Dynamic",
  "1\\. رقم الطوارئ المعتمد:": "1. Verified Emergency Number:",
  "✓ تم التسليم عبر SIM 1 \\+ SIM 2 Fallback": "✓ Delivered via SIM 1 + SIM 2 Fallback",
  "2\\. رقم مرسل الأمر:": "2. Command Sender Number:",
  "✓ تم التسليم بالرد العكسي الفوري": "✓ Delivered via instant auto-reply"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

text = text.replace(
  /`\[اختبار أمان DroidGuard\]\\nرابط الموقع المباشر \(GPS\):\\nhttps:\/\/maps\.google\.com\/\?q=36\.7538,3\.0588\\nتم الإرسال بنجاح إلى رقم الطوارئ المعتمد\.`/g,
  "`${translateInline(lang, '[DroidGuard Security Test]\\nLive GPS Location Link:\\nhttps://maps.google.com/?q=36.7538,3.0588\\nSuccessfully dispatched to verified emergency number.', '[اختبار أمان DroidGuard]\\nرابط الموقع المباشر (GPS):\\nhttps://maps.google.com/?q=36.7538,3.0588\\nتم الإرسال بنجاح إلى رقم الطوارئ المعتمد.')}`"
);

text = text.replace(
  /`\$\{emergencyPhone\} \(رقم الطوارئ المعتمد\)`/g,
  "`${emergencyPhone} ${translateInline(lang, '(Verified Emergency Number)', '(رقم الطوارئ المعتمد)')}`"
);

text = text.replace(
  /`\[اختبار SMS طوارئ\] تم إرسال رسالة تجريبية إلى رقم الطوارئ المعتمد: \$\{res\.summary\}`/g,
  "`${translateInline(lang, '[Emergency SMS Test] Test message dispatched to verified emergency number:', '[اختبار SMS طوارئ] تم إرسال رسالة تجريبية إلى رقم الطوارئ المعتمد:')} ${res.summary}`"
);

text = text.replace(/>\s*رموز سريعة:\s*</g, ">{translateInline(lang, 'Quick Codes:', 'رموز سريعة:')}<");
text = text.replace(/"\+213 661 12 34 56 أو \+966 50 123 4567"/g, "{translateInline(lang, '+44 7911 123456 or +1 202 555 0123', '+213 661 12 34 56 أو +966 50 123 4567')}");
text = text.replace(/"إرسال SMS تجريبي فوري إلى هذا الرقم"/g, "{translateInline(lang, 'Send instant test SMS to this number', 'إرسال SMS تجريبي فوري إلى هذا الرقم')}");
text = text.replace(/>\s*✓ تم إرسال رسالة SMS التجريبية بنجاح عبر الشريحة النشطة!\s*</g, ">{translateInline(lang, '✓ Test SMS message dispatched successfully via active SIM!', '✓ تم إرسال رسالة SMS التجريبية بنجاح عبر الشريحة النشطة!')}<");
text = text.replace(/>\s*المستلم: /g, ">{translateInline(lang, 'Recipient: ', 'المستلم: ')}");
text = text.replace(/>\s*حالة التسليم: مؤكد \(Delivered\)\s*</g, ">{translateInline(lang, 'Delivery Status: Confirmed (Delivered)', 'حالة التسليم: مؤكد (Delivered)')}<");
text = text.replace(/>\s*ثابت ومؤكد\s*</g, ">{translateInline(lang, 'Static & Verified', 'ثابت ومؤكد')}<");
text = text.replace(/>\s*ديناميكي\s*</g, ">{translateInline(lang, 'Dynamic', 'ديناميكي')}<");

text = text.replace(/1\. رقم الطوارئ المعتمد:/g, "{translateInline(lang, '1. Verified Emergency Number:', '1. رقم الطوارئ المعتمد:')}");
text = text.replace(/>\s*✓ تم التسليم عبر SIM 1 \+ SIM 2 Fallback\s*</g, ">{translateInline(lang, '✓ Delivered via SIM 1 + SIM 2 Fallback', '✓ تم التسليم عبر SIM 1 + SIM 2 Fallback')}<");
text = text.replace(/2\. رقم مرسل الأمر:/g, "{translateInline(lang, '2. Command Sender Number:', '2. رقم مرسل الأمر:')}");
text = text.replace(/>\s*✓ تم التسليم بالرد العكسي الفوري\s*</g, ">{translateInline(lang, '✓ Delivered via instant auto-reply', '✓ تم التسليم بالرد العكسي الفوري')}<");

fs.writeFileSync('src/components/SmsEmergencyTabScreen.tsx', text);
