const fs = require('fs');
let text = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const dict = {
  "تم إيقاف خدمة المراقبة الخلفية. لن تستجيب الأوامر حتى إعادة تفعيلها.": "Background monitoring stopped. Commands will not respond until reactivated.",
  "إيقاف الحماية": "Stop Protection",
  "تشغيل الحماية الآن": "Start Protection Now",
  "صيغة الرسالة المعتمدة للاستجابة:": "Accepted Response Format:",
  "\\[الأمر\\]": "[COMMAND]",
  "تحديد الرموز السرية لفتح قفل الأوامر عن بُعد": "Set secret codes to unlock remote commands",
  "بدون رقم محدد": "No specific number",
  "مسار الرد:": "Reply Path:",
  "\\[أي رقم هاتف\\] ➔ \\[الرد لنفس الرقم\\]": "[Any Phone] ➔ [Reply to same number]",
  "مفاتيح التفعيل والحماية الفورية": "Immediate Protection & Activation Keys",
  "تخصيص الإجراءات المسموح بتنفيذها تلقائياً": "Customize automatically allowed actions",
  "محاكاة إطفاء الهاتف من قبل السارق وبدء الخدمة الدورية الخفية كل دقيقتين": "Simulate phone shutdown by thief and start stealth periodic service every 2 mins",
  "فخ إيقاف التشغيل الوهمي \\(Fake Power-Off Trap\\)": "Fake Power-Off Trap",
  "تجربة التقاط الكاميرا السرية": "Test Secret Camera Capture",
  "سرقة": "theft",
  "كاميرا": "camera"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(`['"]${ar}['"]`, 'g');
  text = text.replace(regex, `translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')`);
  
  const jsxRegex = new RegExp(`>\\s*${ar}\\s*<`, 'g');
  text = text.replace(jsxRegex, `>{translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}<`);
  
  const tplRegex = new RegExp(`\\$\\{config\\.code\\}\\s*\\|\\|\\s*'123'\\}\\.\\$\\{config\\.secretKey\\s*\\|\\|\\s*'ABC'\\}\\.${ar}`, 'g');
  text = text.replace(tplRegex, `\${config.code || '123'}.\${config.secretKey || 'ABC'}.\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

// specific manual replacements
text = text.replace(
  /\{config\.code\}\.\{config\.secretKey\}\.سرقة/g,
  "{config.code}.{config.secretKey}.{translateInline(lang, 'theft', 'سرقة')}"
);
text = text.replace(
  /\{config\.code\}\.\{config\.secretKey\}\.كاميرا/g,
  "{config.code}.{config.secretKey}.{translateInline(lang, 'camera', 'كاميرا')}"
);

fs.writeFileSync('src/components/Dashboard.tsx', text);
