const fs = require('fs');
let text = fs.readFileSync('src/components/DualSimNetworkCard.tsx', 'utf-8');

const dict = {
  "تم تحديث مشغل SIM \\$\\{slot\\} إلى: \\$\\{preset\\.name\\} \\(\\$\\{preset\\.networkType\\}\\)": "SIM ${slot} carrier updated to: ${preset.name} (${preset.networkType})",
  "\\[فحص البيانات الذكية\\] \\$\\{res\\.reason\\}": "[Smart Data Check] ${res.reason}",
  "\\[تجربة أمان DroidGuard\\] فحص إرسال موقع GPS المزدوج عبر SIM 1 و SIM 2: \\$\\{mapsUrl\\}": "[DroidGuard Security Test] Dual GPS location dispatch via SIM 1 and SIM 2: ${mapsUrl}",
  "\\[Dual-SIM SMS 1\\] تم الإرسال عبر SIM 1 \\(\\$\\{res\\.sim1Details\\.carrier\\}\\)": "[Dual-SIM SMS 1] Dispatched via SIM 1 (${res.sim1Details.carrier})",
  "\\[Dual-SIM SMS 2 احتياطية\\] تم الإرسال عبر SIM 2 \\(\\$\\{res\\.sim2Details\\.carrier\\}\\)": "[Dual-SIM SMS 2 Fallback] Dispatched via SIM 2 (${res.sim2Details.carrier})",
  "منفذ الشريحة 1 \\(SIM 1\\)": "SIM 1 Slot",
  "شريحة البيانات الرئيسية": "Primary Data SIM",
  "اسم مزود الخدمة المكتشف:": "Detected Carrier Name:",
  "الرمز التقني للمشغل:": "Operator Code (MCC/MNC):",
  "نوع الشبكة:": "Network Type:",
  "رقم الشريحة:": "Phone Number:",
  "قوة الإشارة:": "Signal Strength:",
  "\\(تغطية ممتازة\\)": "(Excellent Coverage)",
  "باقة الإنترنت:": "Internet Plan:",
  "نشطة \\(\\$\\{sim1\\.dataTrafficMB\\} MB مستهلكة\\)": "Active (${sim1.dataTrafficMB} MB used)",
  "حالة الـ SMS:": "SMS Status:",
  "جاهز للإرسال المباشر": "Ready for direct dispatch",
  "تغيير المشغل السريع:": "Quick Carrier Switch:",
  "اختيار مشغل آخر": "Select another carrier",
  "منفذ الشريحة 2 \\(SIM 2\\)": "SIM 2 Slot",
  "شريحة البيانات النشطة": "Active Data SIM",
  "احتياط أمان \\(SMS Fallback\\)": "Security Fallback (SMS)",
  "\\(تغطية جيدة جداً\\)": "(Very Good Coverage)",
  "جاهزة \\(\\$\\{sim2\\.dataTrafficMB\\} MB مستهلكة\\)": "Ready (${sim2.dataTrafficMB} MB used)",
  "خط أمان بديل مؤكد \\(SIM 2\\)": "Confirmed alternate secure line (SIM 2)",
  "بيانات الهاتف مفعلة \\(Mobile Data ON\\)": "Mobile Data ON",
  "بيانات الهاتف مغلقة \\(سيتم تفعيلها آلياً عند السرقة\\)": "Mobile Data OFF (Will auto-enable on theft)",
  "محاكاة إغلاق البيانات \\(Test Off\\)": "Simulate Data Off (Test Off)",
  "تشغيل البيانات \\(Turn ON\\)": "Turn Data ON",
  "فحص وتبديل البيانات تلقائياً للشريحة الأفضل": "Auto check and switch data to best SIM",
  "تجربة الإرسال المزدوج \\(Dual-SIM SMS\\)": "Test Dual-SIM SMS Dispatch"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

text = text.replace(
  /`تم تحديث مشغل SIM \$\{slot\} إلى: \$\{preset\.name\} \(\$\{preset\.networkType\}\)`/g,
  "`${translateInline(lang, 'SIM ${slot} carrier updated to: ${preset.name} (${preset.networkType})', 'تم تحديث مشغل SIM ${slot} إلى: ${preset.name} (${preset.networkType})')}`"
);

text = text.replace(
  /`\[فحص البيانات الذكية\] \$\{res\.reason\}`/g,
  "`${translateInline(lang, '[Smart Data Check] ${res.reason}', '[فحص البيانات الذكية] ${res.reason}')}`"
);

text = text.replace(
  /`\[تجربة أمان DroidGuard\] فحص إرسال موقع GPS المزدوج عبر SIM 1 و SIM 2: \$\{mapsUrl\}`/g,
  "`${translateInline(lang, '[DroidGuard Security Test] Dual GPS location dispatch via SIM 1 and SIM 2: ${mapsUrl}', '[تجربة أمان DroidGuard] فحص إرسال موقع GPS المزدوج عبر SIM 1 و SIM 2: ${mapsUrl}')}`"
);

text = text.replace(
  /`\[Dual-SIM SMS 1\] تم الإرسال عبر SIM 1 \(\$\{res\.sim1Details\.carrier\}\)`/g,
  "`${translateInline(lang, '[Dual-SIM SMS 1] Dispatched via SIM 1 (${res.sim1Details.carrier})', '[Dual-SIM SMS 1] تم الإرسال عبر SIM 1 (${res.sim1Details.carrier})')}`"
);

text = text.replace(
  /`\[Dual-SIM SMS 2 احتياطية\] تم الإرسال عبر SIM 2 \(\$\{res\.sim2Details\.carrier\}\)`/g,
  "`${translateInline(lang, '[Dual-SIM SMS 2 Fallback] Dispatched via SIM 2 (${res.sim2Details.carrier})', '[Dual-SIM SMS 2 احتياطية] تم الإرسال عبر SIM 2 (${res.sim2Details.carrier})')}`"
);

text = text.replace(/>\s*منفذ الشريحة 1 \(SIM 1\)\s*</g, ">{translateInline(lang, 'SIM 1 Slot', 'منفذ الشريحة 1 (SIM 1)')}<");
text = text.replace(/>\s*شريحة البيانات الرئيسية\s*</g, ">{translateInline(lang, 'Primary Data SIM', 'شريحة البيانات الرئيسية')}<");
text = text.replace(/>\s*اسم مزود الخدمة المكتشف:\s*</g, ">{translateInline(lang, 'Detected Carrier Name:', 'اسم مزود الخدمة المكتشف:')}<");
text = text.replace(/>\s*الرمز التقني للمشغل:\s*</g, ">{translateInline(lang, 'Operator Code (MCC/MNC):', 'الرمز التقني للمشغل:')}<");
text = text.replace(/>\s*نوع الشبكة:\s*</g, ">{translateInline(lang, 'Network Type:', 'نوع الشبكة:')}<");
text = text.replace(/>\s*رقم الشريحة:\s*</g, ">{translateInline(lang, 'Phone Number:', 'رقم الشريحة:')}<");
text = text.replace(/>\s*قوة الإشارة:\s*</g, ">{translateInline(lang, 'Signal Strength:', 'قوة الإشارة:')}<");
text = text.replace(/\{sim1\.signalPercent\}% \(تغطية ممتازة\)/g, "{sim1.signalPercent}% {translateInline(lang, '(Excellent Coverage)', '(تغطية ممتازة)')}");
text = text.replace(/>\s*باقة الإنترنت:\s*</g, ">{translateInline(lang, 'Internet Plan:', 'باقة الإنترنت:')}<");
text = text.replace(/نشطة \(\{sim1\.dataTrafficMB\} MB مستهلكة\)/g, "{translateInline(lang, `Active (${sim1.dataTrafficMB} MB used)`, `نشطة (${sim1.dataTrafficMB} MB مستهلكة)`)}");
text = text.replace(/>\s*حالة الـ SMS:\s*</g, ">{translateInline(lang, 'SMS Status:', 'حالة الـ SMS:')}<");
text = text.replace(/>\s*جاهز للإرسال المباشر\s*</g, ">{translateInline(lang, 'Ready for direct dispatch', 'جاهز للإرسال المباشر')}<");
text = text.replace(/>\s*تغيير المشغل السريع:\s*</g, ">{translateInline(lang, 'Quick Carrier Switch:', 'تغيير المشغل السريع:')}<");
text = text.replace(/>\s*اختيار مشغل آخر\s*</g, ">{translateInline(lang, 'Select another carrier', 'اختيار مشغل آخر')}<");

text = text.replace(/>\s*منفذ الشريحة 2 \(SIM 2\)\s*</g, ">{translateInline(lang, 'SIM 2 Slot', 'منفذ الشريحة 2 (SIM 2)')}<");
text = text.replace(/>\s*شريحة البيانات النشطة\s*</g, ">{translateInline(lang, 'Active Data SIM', 'شريحة البيانات النشطة')}<");
text = text.replace(/>\s*احتياط أمان \(SMS Fallback\)\s*</g, ">{translateInline(lang, 'Security Fallback (SMS)', 'احتياط أمان (SMS Fallback)')}<");
text = text.replace(/\{sim2\.signalPercent\}% \(تغطية جيدة جداً\)/g, "{sim2.signalPercent}% {translateInline(lang, '(Very Good Coverage)', '(تغطية جيدة جداً)')}");
text = text.replace(/جاهزة \(\{sim2\.dataTrafficMB\} MB مستهلكة\)/g, "{translateInline(lang, `Ready (${sim2.dataTrafficMB} MB used)`, `جاهزة (${sim2.dataTrafficMB} MB مستهلكة)`)}");
text = text.replace(/>\s*خط أمان بديل مؤكد \(SIM 2\)\s*</g, ">{translateInline(lang, 'Confirmed alternate secure line (SIM 2)', 'خط أمان بديل مؤكد (SIM 2)')}<");

text = text.replace(/>\s*بيانات الهاتف مفعلة \(Mobile Data ON\)\s*</g, ">{translateInline(lang, 'Mobile Data ON', 'بيانات الهاتف مفعلة (Mobile Data ON)')}<");
text = text.replace(/>\s*بيانات الهاتف مغلقة \(سيتم تفعيلها آلياً عند السرقة\)\s*</g, ">{translateInline(lang, 'Mobile Data OFF (Will auto-enable on theft)', 'بيانات الهاتف مغلقة (سيتم تفعيلها آلياً عند السرقة)')}<");

text = text.replace(/'محاكاة إغلاق البيانات \(Test Off\)'/g, "translateInline(lang, 'Simulate Data Off (Test Off)', 'محاكاة إغلاق البيانات (Test Off)')");
text = text.replace(/'تشغيل البيانات \(Turn ON\)'/g, "translateInline(lang, 'Turn Data ON', 'تشغيل البيانات (Turn ON)')");

text = text.replace(/>\s*فحص وتبديل البيانات تلقائياً للشريحة الأفضل\s*</g, ">{translateInline(lang, 'Auto check and switch data to best SIM', 'فحص وتبديل البيانات تلقائياً للشريحة الأفضل')}<");
text = text.replace(/>\s*تجربة الإرسال المزدوج \(Dual-SIM SMS\)\s*</g, ">{translateInline(lang, 'Test Dual-SIM SMS Dispatch', 'تجربة الإرسال المزدوج (Dual-SIM SMS)')}<");

fs.writeFileSync('src/components/DualSimNetworkCard.tsx', text);
