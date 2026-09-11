const fs = require('fs');
let text = fs.readFileSync('src/App.tsx', 'utf-8');

text = text.replace(/`\[تقرير كاميرا المتسلل\] تم التقاط صورة للممسك بالهاتف بنجاح وإحداثيات الموقع: \$\{loc\.mapsUrl\}`/g, "`[${translateInline(lang, 'Intruder Camera Report', 'تقرير كاميرا المتسلل')}] ${translateInline(lang, 'Intruder photo successfully captured with location coordinates:', 'تم التقاط صورة للممسك بالهاتف بنجاح وإحداثيات الموقع:')} ${loc.mapsUrl}`");

text = text.replace(/`📸 <b>\[تقرير كاميرا المتسلل - DroidGuard\]<\/b>\\nتم التقاط صورة صامتة للممسك بالهاتف!\\n📍 <b>الموقع:<\/b> <a href="\$\{loc\.mapsUrl\}">خرائط Google<\/a>\\n📱 <b>المرسل:<\/b> \$\{senderNumber\}`/g, "`📸 <b>[${translateInline(lang, 'Intruder Camera Report - DroidGuard', 'تقرير كاميرا المتسلل - DroidGuard')}]</b>\\n${translateInline(lang, 'Silent photo of the person holding the phone captured!', 'تم التقاط صورة صامتة للممسك بالهاتف!')}\\n📍 <b>${translateInline(lang, 'Location:', 'الموقع:')}</b> <a href=\"${loc.mapsUrl}\">${translateInline(lang, 'Google Maps', 'خرائط Google')}</a>\\n📱 <b>${translateInline(lang, 'Sender:', 'المرسل:')}</b> ${senderNumber}`");

text = text.replace(/`\[صورة تليجرام\] تم رفع صورة المتسلل وإحداثيات الموقع مباشرة لحساب تليجرام`/g, "`[${translateInline(lang, 'Telegram Photo', 'صورة تليجرام')}] ${translateInline(lang, 'Intruder photo and location coordinates uploaded directly to Telegram account', 'تم رفع صورة المتسلل وإحداثيات الموقع مباشرة لحساب تليجرام')}`");

text = text.replace(/`\[إلغاء وضع السرقة\] تم استعادة الجهاز بنجاح وفك القفل عبر البصمة المعتمدة للمالك`/g, "`[${translateInline(lang, 'Cancel Theft Mode', 'إلغاء وضع السرقة')}] ${translateInline(lang, 'Device successfully restored and unlocked via owner verified fingerprint', 'تم استعادة الجهاز بنجاح وفك القفل عبر البصمة المعتمدة للمالك')}`");

fs.writeFileSync('src/App.tsx', text);
