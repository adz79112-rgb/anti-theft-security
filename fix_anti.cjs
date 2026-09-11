const fs = require('fs');
let text = fs.readFileSync('src/components/AntiUninstallProtectionCard.tsx', 'utf-8');

const dict = {
  "تأكيد الهوية البيومترية لإلغاء صلاحية مدير الجهاز \\(Device Admin Deactivation\\)": "Biometric verification required to deactivate Device Administrator",
  "تم تفعيل صلاحية مدير الجهاز وحماية إلغاء التثبيت بنجاح!": "Device Admin Policy & Anti-Uninstall activated successfully!",
  "تم التحقق من بصمة المالك وإلغاء صلاحية مدير الجهاز مؤقتاً.": "Owner biometric verified. Device Admin deactivated temporarily.",
  "✓ تم تأكيد هوية مالك الجهاز! في بيئة العمل الحقيقية يسمح فقط للمالك الأصلي بمتابعة الإجراء.": "✓ Owner identity verified! In a real environment, only the true owner can proceed.",
  "⛔ تم رفض العملية تلقائياً! تم حظر محاولة إلغاء التثبيت وحماية التطبيق وإعادة التوجيه للأمان.": "⛔ Operation rejected! Uninstallation blocked, app protected, and user redirected.",
  "\\[Anti-Uninstall Block\\] محاولة غير مصرح بها لإلغاء تثبيت DroidGuard أو تعطيل صلاحية مدير الجهاز. تم الرفض البيومتري وحماية التطبيق.": "[Anti-Uninstall Block] Unauthorized attempt to uninstall DroidGuard or disable Device Admin. Blocked by biometrics and app protected.",
  "حماية إلغاء التثبيت وصلاحية مدير الجهاز": "Anti-Uninstall & Device Admin Policy",
  "منع إلغاء تثبيت التطبيق من إعدادات أندرويد مع التحقق البيومتري الإلزامي": "Prevent uninstallation from Android settings with mandatory biometric check",
  "🔒 صلاحية مدير الجهاز نشطة، تم إحباط العملية وإعادة توجيه المستخدم لحماية جهازك.": "🔒 Device Admin active, operation aborted and user redirected to protect device.",
  "وحدة مدير الجهاز \\(DevicePolicyManager\\):": "Device Admin Unit (DevicePolicyManager):",
  "مربوط بمكون DroidGuardDeviceAdminReceiver لمنع زر \"إلغاء التثبيت\" في نظام أندرويد من العمل.": "Bound to DroidGuardDeviceAdminReceiver to disable Android 'Uninstall' button.",
  "التحقق البيومتري \\(expo-local-authentication\\):": "Biometric Auth (expo-local-authentication):",
  "يشترط بصمة الإصبع، التعرف على الوجه، أو PIN النظام لأي محاولة تعطيل أو خروج.": "Requires Fingerprint, Face ID, or system PIN for any deactivation attempt.",
  "تعطيل الحماية \\(يتطلب التحقق البيومتري\\)": "Deactivate Protection (Biometrics Required)",
  "تفعيل حماية إلغاء التثبيت الآن": "Activate Anti-Uninstall Protection Now",
  "⚡ محاكاة محاولة إلغاء التثبيت من إعدادات أندرويد": "⚡ Simulate Uninstall Attempt from Android Settings",
  "هل تريد إلغاء تثبيت تطبيق DroidGuard؟": "Do you want to uninstall DroidGuard?",
  "محاكاة لضغط السارق أو المتطفل على زر إلغاء التثبيت داخل إعدادات الهاتف.": "Simulation of thief or intruder pressing uninstall button in phone settings.",
  "الحماية غير مفعلة، سيتم إلغاء التثبيت بدون مانع!": "Protection inactive, uninstallation allowed!",
  "موافق \\(إلغاء التثبيت\\)": "OK (Uninstall)",
  "تعذر إلغاء التثبيت \\(Device Admin Block\\)": "Cannot Uninstall (Device Admin Block)",
  "⚠️ لا يمكن إلغاء تثبيت DroidGuard لأن التطبيق مفعل كمدير لجهاز أندرويد \\(Device Administrator\\).": "⚠️ DroidGuard cannot be uninstalled because it is an active Device Administrator.",
  "لمتابعة إلغاء التثبيت، يجب إلغاء تفعيل صلاحية مدير الجهاز أولاً، وهو ما يتطلب اجتياز التحقق البيومتري الإلزامي \\(بصمة الإصبع أو الوجه أو PIN المالك\\).": "To uninstall, you must deactivate Device Admin first, which requires mandatory biometrics (Fingerprint, Face, or PIN).",
  "طلب إلغاء صلاحية مدير الجهاز لمحاولة إلغاء التثبيت": "Request deactivation of Device Admin for uninstall attempt",
  "محاولة إلغاء التفعيل والتحقق الآن": "Attempt deactivation and verify now",
  "إغلاق والرجوع للتطبيق": "Close and return to app",
  "Android Biometric Prompt • التحقق البيومتري الإلزامي": "Android Biometric Prompt • Mandatory Biometrics"
};

for (const [ar, en] of Object.entries(dict)) {
  const regex = new RegExp(ar, 'g');
  text = text.replace(regex, `\${translateInline(lang, '${en}', '${ar.replace(/\\/g, '')}')}`);
}

text = text.replace(
  /`🚨 \[\$\{translateInline\(lang, '\[Anti-Uninstall Block\] Unauthorized attempt to uninstall DroidGuard or disable Device Admin\. Blocked by biometrics and app protected\.', '\[Anti-Uninstall Block\] محاولة غير مصرح بها لإلغاء تثبيت DroidGuard أو تعطيل صلاحية مدير الجهاز\. تم الرفض البيومتري وحماية التطبيق\.'\)\}\]`/g,
  "`🚨 ${translateInline(lang, '[Anti-Uninstall Block] Unauthorized attempt to uninstall DroidGuard or disable Device Admin. Blocked by biometrics and app protected.', '[Anti-Uninstall Block] محاولة غير مصرح بها لإلغاء تثبيت DroidGuard أو تعطيل صلاحية مدير الجهاز. تم الرفض البيومتري وحماية التطبيق.')}`"
);

text = text.replace(/>\s*حماية إلغاء التثبيت وصلاحية مدير الجهاز\s*</g, ">{translateInline(lang, 'Anti-Uninstall & Device Admin Policy', 'حماية إلغاء التثبيت وصلاحية مدير الجهاز')}<");
text = text.replace(/>\s*منع إلغاء تثبيت التطبيق من إعدادات أندرويد مع التحقق البيومتري الإلزامي\s*</g, ">{translateInline(lang, 'Prevent uninstallation from Android settings with mandatory biometric check', 'منع إلغاء تثبيت التطبيق من إعدادات أندرويد مع التحقق البيومتري الإلزامي')}<");
text = text.replace(/>\s*🔒 صلاحية مدير الجهاز نشطة، تم إحباط العملية وإعادة توجيه المستخدم لحماية جهازك.\s*</g, ">{translateInline(lang, '🔒 Device Admin active, operation aborted and user redirected to protect device.', '🔒 صلاحية مدير الجهاز نشطة، تم إحباط العملية وإعادة توجيه المستخدم لحماية جهازك.')}<");
text = text.replace(/>\s*وحدة مدير الجهاز \(DevicePolicyManager\):\s*</g, ">{translateInline(lang, 'Device Admin Unit (DevicePolicyManager):', 'وحدة مدير الجهاز (DevicePolicyManager):')}<");
text = text.replace(/>\s*مربوط بمكون DroidGuardDeviceAdminReceiver لمنع زر "إلغاء التثبيت" في نظام أندرويد من العمل.\s*</g, ">{translateInline(lang, 'Bound to DroidGuardDeviceAdminReceiver to disable Android \"Uninstall\" button.', 'مربوط بمكون DroidGuardDeviceAdminReceiver لمنع زر \"إلغاء التثبيت\" في نظام أندرويد من العمل.')}<");
text = text.replace(/>\s*التحقق البيومتري \(expo-local-authentication\):\s*</g, ">{translateInline(lang, 'Biometric Auth (expo-local-authentication):', 'التحقق البيومتري (expo-local-authentication):')}<");
text = text.replace(/>\s*يشترط بصمة الإصبع، التعرف على الوجه، أو PIN النظام لأي محاولة تعطيل أو خروج.\s*</g, ">{translateInline(lang, 'Requires Fingerprint, Face ID, or system PIN for any deactivation attempt.', 'يشترط بصمة الإصبع، التعرف على الوجه، أو PIN النظام لأي محاولة تعطيل أو خروج.')}<");

text = text.replace(/>\s*⚡ محاكاة محاولة إلغاء التثبيت من إعدادات أندرويد\s*</g, ">{translateInline(lang, '⚡ Simulate Uninstall Attempt from Android Settings', '⚡ محاكاة محاولة إلغاء التثبيت من إعدادات أندرويد')}<");
text = text.replace(/>\s*هل تريد إلغاء تثبيت تطبيق DroidGuard؟\s*</g, ">{translateInline(lang, 'Do you want to uninstall DroidGuard?', 'هل تريد إلغاء تثبيت تطبيق DroidGuard؟')}<");
text = text.replace(/>\s*محاكاة لضغط السارق أو المتطفل على زر إلغاء التثبيت داخل إعدادات الهاتف.\s*</g, ">{translateInline(lang, 'Simulation of thief or intruder pressing uninstall button in phone settings.', 'محاكاة لضغط السارق أو المتطفل على زر إلغاء التثبيت داخل إعدادات الهاتف.')}<");

text = text.replace(/>\s*إلغاء\s*</g, ">{translateInline(lang, 'Cancel', 'إلغاء')}<");

text = text.replace(/>\s*موافق \(إلغاء التثبيت\)\s*</g, ">{translateInline(lang, 'OK (Uninstall)', 'موافق (إلغاء التثبيت)')}<");
text = text.replace(/>\s*تعذر إلغاء التثبيت \(Device Admin Block\)\s*</g, ">{translateInline(lang, 'Cannot Uninstall (Device Admin Block)', 'تعذر إلغاء التثبيت (Device Admin Block)')}<");
text = text.replace(/>\s*⚠️ لا يمكن إلغاء تثبيت DroidGuard لأن التطبيق مفعل كمدير لجهاز أندرويد \(Device Administrator\).\s*</g, ">{translateInline(lang, '⚠️ DroidGuard cannot be uninstalled because it is an active Device Administrator.', '⚠️ لا يمكن إلغاء تثبيت DroidGuard لأن التطبيق مفعل كمدير لجهاز أندرويد (Device Administrator).')}<");
text = text.replace(/>\s*لمتابعة إلغاء التثبيت، يجب إلغاء تفعيل صلاحية مدير الجهاز أولاً، وهو ما يتطلب اجتياز التحقق البيومتري الإلزامي \(بصمة الإصبع أو الوجه أو PIN المالك\).\s*</g, ">{translateInline(lang, 'To uninstall, you must deactivate Device Admin first, which requires mandatory biometrics (Fingerprint, Face, or PIN).', 'لمتابعة إلغاء التثبيت، يجب إلغاء تفعيل صلاحية مدير الجهاز أولاً، وهو ما يتطلب اجتياز التحقق البيومتري الإلزامي (بصمة الإصبع أو الوجه أو PIN المالك).')}<");
text = text.replace(/>\s*محاولة إلغاء التفعيل والتحقق الآن\s*</g, ">{translateInline(lang, 'Attempt deactivation and verify now', 'محاولة إلغاء التفعيل والتحقق الآن')}<");
text = text.replace(/>\s*إغلاق والرجوع للتطبيق\s*</g, ">{translateInline(lang, 'Close and return to app', 'إغلاق والرجوع للتطبيق')}<");

fs.writeFileSync('src/components/AntiUninstallProtectionCard.tsx', text);
