const fs = require('fs');
let text = fs.readFileSync('src/components/SmsEmergencyTabScreen.tsx', 'utf-8');

text = text.replace(/translateInline\(lang, 'Not configured', '\$\{translateInline\(lang, 'Not configured', 'لم يُحدد بعد'\)\}'\)/g, "translateInline(lang, 'Not configured', 'لم يُحدد بعد')");
text = text.replace(/\$\{translateInline\(lang, 'Dynamic', 'ديناميكي'\)\}/g, "{translateInline(lang, 'Dynamic', 'ديناميكي')}");
text = text.replace(/\$\{translateInline\(lang, '1\. Verified Emergency Number:', '\{translateInline\(lang, '1\. Verified Emergency Number:', '1\. رقم الطوارئ المعتمد:'\)\}'\)\}/g, "{translateInline(lang, '1. Verified Emergency Number:', '1. رقم الطوارئ المعتمد:')}");
text = text.replace(/\$\{translateInline\(lang, '✓ Delivered via SIM 1 \+ SIM 2 Fallback', '✓ تم التسليم عبر SIM 1 \+ SIM 2 Fallback'\)\}/g, "{translateInline(lang, '✓ Delivered via SIM 1 + SIM 2 Fallback', '✓ تم التسليم عبر SIM 1 + SIM 2 Fallback')}");
text = text.replace(/\$\{translateInline\(lang, '2\. Command Sender Number:', '\{translateInline\(lang, '2\. Command Sender Number:', '2\. رقم مرسل الأمر:'\)\}'\)\}/g, "{translateInline(lang, '2. Command Sender Number:', '2. رقم مرسل الأمر:')}");
text = text.replace(/\$\{translateInline\(lang, '✓ Delivered via instant auto-reply', '✓ تم التسليم بالرد العكسي الفوري'\)\}/g, "{translateInline(lang, '✓ Delivered via instant auto-reply', '✓ تم التسليم بالرد العكسي الفوري')}");

fs.writeFileSync('src/components/SmsEmergencyTabScreen.tsx', text);
