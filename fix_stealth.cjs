const fs = require('fs');
let text = fs.readFileSync('src/components/StealthStolenScreen.tsx', 'utf-8');

const dict = {
  "تم فك قفل وضع السرقة الخفي بنجاح عبر البصمة المعتمدة. تم تنفيذ \\$\\{totalCycles\\} دورة إرسال دورية بنجاح إلى البريد ورقم المتصل وتليجرام.": "Stealth Stolen Mode unlocked successfully via fingerprint. Completed ${totalCycles} periodic dispatch cycles to email, caller number, and Telegram.",
  "Fake Off • صامت": "Fake Off • Silent",
  "الرقم: ": "Number: ",
  "✓ تم إرسال SMS إحداثيات GPS الأولية": "✓ Primary GPS coordinates SMS sent",
  "✓ تم الإرسال الاحتياطي المؤكد \\(Dual-SIM SMS\\)": "✓ Confirmed Backup Dispatch (Dual-SIM SMS)"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

text = text.replace(
  /`تم فك قفل وضع السرقة الخفي بنجاح عبر البصمة المعتمدة\. تم تنفيذ \$\{totalCycles\} دورة إرسال دورية بنجاح إلى البريد ورقم المتصل وتليجرام\.`/g,
  "`${translateInline(lang, 'Stealth Stolen Mode unlocked successfully via fingerprint. Completed ${totalCycles} periodic dispatch cycles to email, caller number, and Telegram.', 'تم فك قفل وضع السرقة الخفي بنجاح عبر البصمة المعتمدة. تم تنفيذ ${totalCycles} دورة إرسال دورية بنجاح إلى البريد ورقم المتصل وتليجرام.')}`"
);

text = text.replace(
  />\s*Fake Off • صامت\s*</g,
  ">{translateInline(lang, 'Fake Off • Silent', 'Fake Off • صامت')}<"
);

text = text.replace(
  /<p>الرقم: \{networkState\?\.simCards\[0\]\.phoneNumber \|\| '\+966 50 123 4567'\}<\/p>/g,
  "<p>{translateInline(lang, 'Number: ', 'الرقم: ')}{networkState?.simCards[0].phoneNumber || '+966 50 123 4567'}</p>"
);

text = text.replace(
  /<p className="text-emerald-400">✓ تم إرسال SMS إحداثيات GPS الأولية<\/p>/g,
  "<p className=\"text-emerald-400\">{translateInline(lang, '✓ Primary GPS coordinates SMS sent', '✓ تم إرسال SMS إحداثيات GPS الأولية')}</p>"
);

text = text.replace(
  /<p>الرقم: \{networkState\?\.simCards\[1\]\.phoneNumber \|\| '\+966 56 987 6543'\}<\/p>/g,
  "<p>{translateInline(lang, 'Number: ', 'الرقم: ')}{networkState?.simCards[1].phoneNumber || '+966 56 987 6543'}</p>"
);

text = text.replace(
  /<p className="text-cyan-400">✓ تم الإرسال الاحتياطي المؤكد \(Dual-SIM SMS\)<\/p>/g,
  "<p className=\"text-cyan-400\">{translateInline(lang, '✓ Confirmed Backup Dispatch (Dual-SIM SMS)', '✓ تم الإرسال الاحتياطي المؤكد (Dual-SIM SMS)')}</p>"
);

fs.writeFileSync('src/components/StealthStolenScreen.tsx', text);
