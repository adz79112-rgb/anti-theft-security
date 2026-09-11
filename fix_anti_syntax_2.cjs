const fs = require('fs');
let text = fs.readFileSync('src/components/AntiUninstallProtectionCard.tsx', 'utf-8');

// I will just replace the bad nested translateInline with the correct string for the third parameter.

text = text.replace(/translateInline\(lang, 'Deactivate Admin \(Requires Biometrics\)', '\$\{translateInline\(lang, 'Deactivate Protection \(Biometrics Required\)', 'تعطيل الحماية \(يتطلب التحقق البيومتري\)'\)\}'\)/g, "translateInline(lang, 'Deactivate Protection (Biometrics Required)', 'تعطيل الحماية (يتطلب التحقق البيومتري)')");
text = text.replace(/translateInline\(lang, 'Activate Anti-Uninstall Protection', '\$\{translateInline\(lang, 'Activate Anti-Uninstall Protection Now', 'تفعيل حماية إلغاء التثبيت الآن'\)\}'\)/g, "translateInline(lang, 'Activate Anti-Uninstall Protection Now', 'تفعيل حماية إلغاء التثبيت الآن')");
text = text.replace(/translateInline\(lang, '⚡ Simulate Android Settings Uninstall Attempt', '\$\{translateInline\(lang, '⚡ Simulate Uninstall Attempt from Android Settings', '⚡ محاكاة محاولة إلغاء التثبيت من إعدادات أندرويد'\)\}'\)/g, "translateInline(lang, '⚡ Simulate Uninstall Attempt from Android Settings', '⚡ محاكاة محاولة إلغاء التثبيت من إعدادات أندرويد')");
text = text.replace(/translateInline\(lang, 'Do you want to uninstall DroidGuard\?', '\$\{translateInline\(lang, 'Do you want to uninstall DroidGuard\?', 'هل تريد إلغاء تثبيت تطبيق DroidGuard\?'\)\}'\)/g, "translateInline(lang, 'Do you want to uninstall DroidGuard?', 'هل تريد إلغاء تثبيت تطبيق DroidGuard؟')");
text = text.replace(/translateInline\(lang, 'Simulating thief pressing Uninstall in Android Apps Settings\.', '\$\{translateInline\(lang, 'Simulation of thief or intruder pressing uninstall button in phone settings\.', 'محاكاة لضغط السارق أو المتطفل على زر إلغاء التثبيت داخل إعدادات الهاتف\.'\)\}'\)/g, "translateInline(lang, 'Simulation of thief or intruder pressing uninstall button in phone settings.', 'محاكاة لضغط السارق أو المتطفل على زر إلغاء التثبيت داخل إعدادات الهاتف.')");

fs.writeFileSync('src/components/AntiUninstallProtectionCard.tsx', text);
