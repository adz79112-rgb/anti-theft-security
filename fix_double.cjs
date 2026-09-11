const fs = require('fs');
let text = fs.readFileSync('src/components/TriggerTerminal.tsx', 'utf-8');

text = text.replace(/\$\{translateInline\(lang, '[^']+', '([^']+)'\)\}/g, "$1");
text = text.replace(/\{translateInline\(lang, '[^']+', '([^']+)'\)\}/g, "$1");

fs.writeFileSync('src/components/TriggerTerminal.tsx', text);
