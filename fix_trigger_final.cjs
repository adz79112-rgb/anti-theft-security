const fs = require('fs');
let text = fs.readFileSync('src/components/TriggerTerminal.tsx', 'utf-8');

text = text.replace(/\$سرقة/g, "{translateInline(lang, 'theft', 'سرقة')}");
text = text.replace(/\$كاميرا/g, "{translateInline(lang, 'camera', 'كاميرا')}");

fs.writeFileSync('src/components/TriggerTerminal.tsx', text);
