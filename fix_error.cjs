const fs = require('fs');
let text = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf-8');

text = text.replace(
  />حدث خطأ أثناء تحميل الواجهة</g,
  ">{translateInline('en', 'An error occurred while loading the interface', 'حدث خطأ أثناء تحميل الواجهة')}<"
);

text = text.replace(
  />إعادة تشغيل وتحديث التطبيق</g,
  ">{translateInline('en', 'Restart and update app', 'إعادة تشغيل وتحديث التطبيق')}<"
);

if (!text.includes('translateInline')) {
  text = text.replace(/import [^\n]+;\n/, match => match + "import { translateInline } from '../utils/translateInline';\n");
}

fs.writeFileSync('src/components/ErrorBoundary.tsx', text);
