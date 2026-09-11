const fs = require('fs');

let tText = fs.readFileSync('src/components/TriggerTerminal.tsx', 'utf-8');
tText = tText.replace(/<span>\{config\.code\}\.\{config\.secretKey\}\.سرقة<\/span>/g, "<span>{config.code}.{config.secretKey}.{translateInline(lang, 'theft', 'سرقة')}</span>");
tText = tText.replace(/<span>\{config\.code\}\.\{config\.secretKey\}\.كاميرا<\/span>/g, "<span>{config.code}.{config.secretKey}.{translateInline(lang, 'camera', 'كاميرا')}</span>");
fs.writeFileSync('src/components/TriggerTerminal.tsx', tText);

let dText = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');
dText = dText.replace(/\{config\.code \|\| '123'\}\.\{config\.secretKey \|\| 'ABC'\}\.\[الأمر\]/g, "{config.code || '123'}.{config.secretKey || 'ABC'}.[{translateInline(lang, 'Command', 'الأمر')}]");
fs.writeFileSync('src/components/Dashboard.tsx', dText);
