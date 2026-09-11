const fs = require('fs');
let text = fs.readFileSync('src/components/GmailSecurityCard.tsx', 'utf-8');

const dict = {
  "\\$\\{days\\} يوم و \\$\\{pad\\(hours\\)\\}:\\$\\{pad\\(minutes\\)\\}:\\$\\{pad\\(seconds\\)\\}": "${days} days and ${pad(hours)}:${pad(minutes)}:${pad(seconds)}",
  "تم إرسال رمز التأكيد \\(OTP\\) إلى \\$\\{emailToVerify\\}": "OTP sent to ${emailToVerify}",
  "✓ تم إلغاء طلب التغيير فوراً والاحتفاظ بالبريد \\(\\$\\{oldEmail\\}\\) كبريد نشط ومعتمد لتنبيهات DroidGuard.": "✓ Change request cancelled immediately. Kept (${oldEmail}) as active and verified DroidGuard alerts email.",
  "⚡ \\[محاكاة فورية\\]: اكتملت فترة الـ 72 ساعة بنجاح! البريد المعتمد الجديد أصبح: \\$\\{finalEmail\\}": "⚡ [Instant Simulation]: 72h cooldown completed successfully! New verified email is: ${finalEmail}"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

text = text.replace(
  /`\$\{days\} يوم و \$\{pad\(hours\)\}:\$\{pad\(minutes\)\}:\$\{pad\(seconds\)\}`/g,
  "`${translateInline(lang, '${days} days and ${pad(hours)}:${pad(minutes)}:${pad(seconds)}', '${days} يوم و ${pad(hours)}:${pad(minutes)}:${pad(seconds)}')}`"
);

text = text.replace(
  /`تم إرسال رمز التأكيد \(OTP\) إلى \$\{emailToVerify\}`/g,
  "`${translateInline(lang, 'OTP sent to ${emailToVerify}', 'تم إرسال رمز التأكيد (OTP) إلى ${emailToVerify}')}`"
);

text = text.replace(
  /`✓ تم إلغاء طلب التغيير فوراً والاحتفاظ بالبريد \(\$\{oldEmail\}\) كبريد نشط ومعتمد لتنبيهات DroidGuard\.`/g,
  "`${translateInline(lang, '✓ Change request cancelled immediately. Kept (${oldEmail}) as active and verified DroidGuard alerts email.', '✓ تم إلغاء طلب التغيير فوراً والاحتفاظ بالبريد (${oldEmail}) كبريد نشط ومعتمد لتنبيهات DroidGuard.')}`"
);

text = text.replace(
  /`⚡ \[محاكاة فورية\]: اكتملت فترة الـ 72 ساعة بنجاح! البريد المعتمد الجديد أصبح: \$\{finalEmail\}`/g,
  "`${translateInline(lang, '⚡ [Instant Simulation]: 72h cooldown completed successfully! New verified email is: ${finalEmail}', '⚡ [محاكاة فورية]: اكتملت فترة الـ 72 ساعة بنجاح! البريد المعتمد الجديد أصبح: ${finalEmail}')}`"
);

fs.writeFileSync('src/components/GmailSecurityCard.tsx', text);
