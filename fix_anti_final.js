const fs = require('fs');
let text = fs.readFileSync('src/components/AntiUninstallProtectionCard.tsx', 'utf-8');

text = text.replace(/translateInline\(lang, '([^']+)', '\$\{[^}]+\}'\)/g, "translateInline(lang, '$1', '...')"); // Just to fix syntax, I'll put a placeholder '...' and then use translation dict again. No, wait. 

