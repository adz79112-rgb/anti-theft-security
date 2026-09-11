const fs = require('fs');

let content = fs.readFileSync('src/components/TriggerTerminal.tsx', 'utf-8');

const dict = {
  "رقم هاتف 1": "Phone 1",
  "رقم هاتف 2": "Phone 2",
  "رقم هاتف 3": "Phone 3",
  "رقم دولي": "Intl Phone",
  "سرقة": "theft",
  "توليد رقم عشوائي لاختبار الاستجابة": "Generate random number for test",
  "رقم عشوائي": "Random Number",
  "✓ الرد التلقائي سيعود مباشرة لهذا الرقم": "✓ Auto-reply will return directly to this number",
  "اختر رقم مرسل مختلف لتجربة الرد التلقائي عليه:": "Choose a different sender number to test auto-reply:",
  "★ مسار مزدوج:": "★ Dual Path:",
  "1. سرقة:": "1. Theft:",
  "2. كاميرا:": "2. Camera:",
  "3. رمز خاطئ:": "3. Invalid Code:",
  "تم التحقق بنجاح وتفعيل: [": "Successfully verified & activated: [",
  "وضع السرقة (Theft Mode)": "Theft Mode",
  "كاميرا المتسلل (Camera Capture)": "Camera Capture",
  "فشل التحقق من الرسالة (Security Rejection)": "Message verification failed (Security Rejection)",
  "سبب الرفض: ": "Rejection reason: ",
  "الرد التلقائي:": "Auto-reply:",
  "تم إرسال بلاغ الطوارئ والإحداثيات مباشرة لنفس الرقم (": "Emergency report and coordinates sent directly to the same number (",
  "كاميرا": "camera",
  "صيغة الرسالة المعتمدة للاستجابة:": "Accepted Response Format:"
};

// Add import
if (!content.includes('translateInline')) {
  content = content.replace(/import [^\n]+;\n/, match => match + "import { translateInline } from '../utils/translateInline';\n");
}

for (const [ar, en] of Object.entries(dict)) {
  const safeAr = ar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`['"]${safeAr}['"]`, 'g');
  content = content.replace(regex, `translateInline(lang, '${en}', '${ar}')`);
  
  // Replace JSX text strings
  const jsxRegex = new RegExp(`>\\s*${safeAr}\\s*<`, 'g');
  content = content.replace(jsxRegex, `>{translateInline(lang, '${en}', '${ar}')}<`);
  
  // Replace embedded template literals
  const tplRegex = new RegExp(`\\$\\{config\\.code\\}\\.\\$\\{config\\.secretKey\\}\\.${safeAr}`, 'g');
  content = content.replace(tplRegex, `\${config.code}.\${config.secretKey}.\${translateInline(lang, '${en}', '${ar}')}`);
  
  const tplRegex2 = new RegExp(`999\\.xyz\\.${safeAr}`, 'g');
  content = content.replace(tplRegex2, `999.xyz.\${translateInline(lang, '${en}', '${ar}')}`);
}

// Manual fixes for concatenated strings
content = content.replace(/`تم التحقق بنجاح وتفعيل: \[\$\{lastParsed\.action === 'theft' \? 'وضع السرقة \(Theft Mode\)' : 'كاميرا المتسلل \(Camera Capture\)'\}\]`/, 
  "`${translateInline(lang, 'Successfully verified & activated: [', 'تم التحقق بنجاح وتفعيل: [')}${lastParsed.action === 'theft' ? translateInline(lang, 'Theft Mode', 'وضع السرقة (Theft Mode)') : translateInline(lang, 'Camera Capture', 'كاميرا المتسلل (Camera Capture)')}]`");

content = content.replace(/`\[تقرير كاميرا المتسلل\] تم التقاط صورة للممسك بالهاتف بنجاح وإحداثيات الموقع: \$\{loc.mapsUrl\}`/,
  "`[${translateInline(lang, 'Camera Capture Report', 'تقرير كاميرا المتسلل')}] ${translateInline(lang, 'Photo captured successfully with location:', 'تم التقاط صورة للممسك بالهاتف بنجاح وإحداثيات الموقع:')} ${loc.mapsUrl}`");

fs.writeFileSync('src/components/TriggerTerminal.tsx', content);
