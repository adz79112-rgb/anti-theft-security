const fs = require('fs');
let text = fs.readFileSync('src/components/DualSimNetworkCard.tsx', 'utf-8');

text = text.replace(/'\$\{translateInline\(lang, 'Simulate Data Off \(Test Off\)', translateInline\(lang, 'Simulate Data Off \(Test Off\)', 'محاكاة إغلاق البيانات \(Test Off\)'\)\)\}'/g, "translateInline(lang, 'Simulate Data Off (Test Off)', 'محاكاة إغلاق البيانات (Test Off)')");
text = text.replace(/'\$\{translateInline\(lang, 'Turn Data ON', translateInline\(lang, 'Turn Data ON', 'تشغيل البيانات \(Turn ON\)'\)\)\}'/g, "translateInline(lang, 'Turn Data ON', 'تشغيل البيانات (Turn ON)')");

fs.writeFileSync('src/components/DualSimNetworkCard.tsx', text);
