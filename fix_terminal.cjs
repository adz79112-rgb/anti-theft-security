const fs = require('fs');
let text = fs.readFileSync('src/components/TriggerTerminal.tsx', 'utf-8');

const dict = {
  "سرقة": "theft",
  "كاميرا": "camera",
  "سبب الرفض: ": "Rejection Reason: ",
  "تم إرسال بلاغ الطوارئ والإحداثيات مباشرة لنفس الرقم \\(\\$*\\{lastParsed\\.senderNumber\\}\\)": "Emergency report and coordinates sent directly to the same number (${lastParsed.senderNumber})"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

text = text.replace(
  />\{config\.code\}\.\{config\.secretKey\}\.\{translateInline\(lang, 'theft', 'سرقة'\)\}</g,
  ">{config.code}.{config.secretKey}.{translateInline(lang, 'theft', 'سرقة')}<"
);

text = text.replace(
  />\{config\.code\}\.\{config\.secretKey\}\.\{translateInline\(lang, 'camera', 'كاميرا'\)\}</g,
  ">{config.code}.{config.secretKey}.{translateInline(lang, 'camera', 'كاميرا')}<"
);

text = text.replace(
  /سبب الرفض: \{lastParsed\.errorReason\}/g,
  "{translateInline(lang, 'Rejection Reason: ', 'سبب الرفض: ')}{lastParsed.errorReason}"
);

text = text.replace(
  /تم إرسال بلاغ الطوارئ والإحداثيات مباشرة لنفس الرقم \(\{lastParsed\.senderNumber\}\)/g,
  "{translateInline(lang, 'Emergency report and coordinates sent directly to the same number (${lastParsed.senderNumber})', 'تم إرسال بلاغ الطوارئ والإحداثيات مباشرة لنفس الرقم (${lastParsed.senderNumber})')}"
);

fs.writeFileSync('src/components/TriggerTerminal.tsx', text);
