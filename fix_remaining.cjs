const fs = require('fs');

const files = [
  'src/components/DeviceAuthDialog.tsx',
  'src/components/CyberpunkConsole.tsx',
  'src/components/IntruderGallery.tsx',
  'src/components/DispatchLog.tsx'
];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf-8');
  if (!text.includes('translateInline')) {
    text = text.replace(/import React/, "import { translateInline } from '../utils/translateInline';\nimport React");
  }
  
  if (file === 'src/components/DispatchLog.tsx') {
    text = text.replace(/سجل البلاغات والتقارير المرسلة آلياً \(SMS & Telegram\)/g, "{translateInline(lang, 'Log of automated emergency reports (SMS & Telegram)', 'سجل البلاغات والتقارير المرسلة آلياً (SMS & Telegram)')}");
    text = text.replace(/>\s*مسح السجل\s*</g, ">{translateInline(lang, 'Clear Log', 'مسح السجل')}<");
    text = text.replace(/عند استلام أي أمر طوارئ، سيتم تسجيل رسائل الرد التلقائية وإشعارات تليجرام هنا/g, "{translateInline(lang, 'Upon receiving any emergency command, automated reply messages and Telegram notifications will be logged here', 'عند استلام أي أمر طوارئ، سيتم تسجيل رسائل الرد التلقائية وإشعارات تليجرام هنا')}");
  }
  
  if (file === 'src/components/IntruderGallery.tsx') {
    text = text.replace(/`🚨 \[بلاغ أمني طارئ - تطبيق مكافحة السرقة\]\\nتم التقاط صورة للممسك بالهاتف في:\\n\$\{capture\.timestamp\}\\nالموقع الجغرافي:\\n\$\{capture\.location\.mapsUrl\}`/g, "`🚨 [${translateInline(lang, 'Emergency Security Report - Anti-Theft App', 'بلاغ أمني طارئ - تطبيق مكافحة السرقة')}]\\n${translateInline(lang, 'Photo of the person holding the phone captured at:', 'تم التقاط صورة للممسك بالهاتف في:')}\\n${capture.timestamp}\\n${translateInline(lang, 'Geographical Location:', 'الموقع الجغرافي:')}\\n${capture.location.mapsUrl}`");
    
    text = text.replace(/`🚨 \[بلاغ أمني DroidGuard\] تم التقاط صورة للممسك بالهاتف\\n⏰ الوقت: \$\{capture\.timestamp\}\\n📍 الموقع: \$\{capture\.location\.mapsUrl\}`/g, "`🚨 [${translateInline(lang, 'DroidGuard Security Report', 'بلاغ أمني DroidGuard')}] ${translateInline(lang, 'Photo of the person holding the phone captured', 'تم التقاط صورة للممسك بالهاتف')}\\n⏰ ${translateInline(lang, 'Time:', 'الوقت:')} ${capture.timestamp}\\n📍 ${translateInline(lang, 'Location:', 'الموقع:')} ${capture.location.mapsUrl}`");
    
    text = text.replace(/\{captures\.length\} \{captures\.length === 1 \? 'صورة ملتقطة' : 'صور ملتقطة'\} عبر الكاميرا الأمامية/g, "{captures.length} {captures.length === 1 ? translateInline(lang, 'captured photo', 'صورة ملتقطة') : translateInline(lang, 'captured photos', 'صور ملتقطة')} {translateInline(lang, 'via front camera', 'عبر الكاميرا الأمامية')}");
    
    text = text.replace(/>\s*مسح الكل\s*</g, ">{translateInline(lang, 'Clear All', 'مسح الكل')}<");
    text = text.replace(/>\s*سجل المتسللين\s*</g, ">{translateInline(lang, 'Intruders Gallery', 'سجل المتسللين')}<");
    text = text.replace(/عند استلام أمر "كاميرا" أو حدوث إنذار، سيتم التقاط صورة صامتة وحفظها هنا/g, "{translateInline(lang, 'Upon receiving a \\'camera\\' command or an alarm trigger, a silent photo will be captured and saved here', 'عند استلام أمر \"كاميرا\" أو حدوث إنذار، سيتم التقاط صورة صامتة وحفظها هنا')}");
    
    text = text.replace(/>\s*المرسل:\s*</g, ">{translateInline(lang, 'Sender:', 'المرسل:')}<");
    text = text.replace(/>\s*الخريطة\s*</g, ">{translateInline(lang, 'Map', 'الخريطة')}<");
    text = text.replace(/title="مشاركة عبر تليجرام"/g, "title={translateInline(lang, 'Share via Telegram', 'مشاركة عبر تليجرام')}");
    text = text.replace(/>\s*تليجرام\s*</g, ">{translateInline(lang, 'Telegram', 'تليجرام')}<");
    text = text.replace(/>\s*واتساب\s*</g, ">{translateInline(lang, 'WhatsApp', 'واتساب')}<");
    text = text.replace(/title="تحميل الصورة"/g, "title={translateInline(lang, 'Download Photo', 'تحميل الصورة')}");
    text = text.replace(/title="حذف"/g, "title={translateInline(lang, 'Delete', 'حذف')}");
    
    text = text.replace(/>\s*تفاصيل صورة المتسلل\s*</g, ">{translateInline(lang, 'Intruder Photo Details', 'تفاصيل صورة المتسلل')}<");
    text = text.replace(/>\s*إغلاق\s*</g, ">{translateInline(lang, 'Close', 'إغلاق')}<");
    text = text.replace(/<p>الوقت: /g, "<p>{translateInline(lang, 'Time: ', 'الوقت: ')}");
    text = text.replace(/<p>الرقم المحرك: /g, "<p>{translateInline(lang, 'Trigger Number: ', 'الرقم المحرك: ')}");
    text = text.replace(/<p>الموقع: /g, "<p>{translateInline(lang, 'Location: ', 'الموقع: ')}");
    text = text.replace(/<p>رابط خرائط Google: /g, "<p>{translateInline(lang, 'Google Maps Link: ', 'رابط خرائط Google: ')}");
  }

  if (file === 'src/components/CyberpunkConsole.tsx') {
    text = text.replace(/title="نسخ الكود"/g, "title={translateInline(lang, 'Copy Code', 'نسخ الكود')}");
    text = text.replace(/\{testResult\.userEmail \|\| 'غير محدد'\}/g, "{testResult.userEmail || translateInline(lang, 'Not configured', 'غير محدد')}");
    text = text.replace(/<p>✓ رابط موقع GPS على Google Maps<\/p>/g, "<p>{translateInline(lang, '✓ Google Maps GPS Link', '✓ رابط موقع GPS على Google Maps')}</p>");
    text = text.replace(/<p>✓ صورة حية ملتقطة عبر الكاميرا الأمامية<\/p>/g, "<p>{translateInline(lang, '✓ Live photo captured via front camera', '✓ صورة حية ملتقطة عبر الكاميرا الأمامية')}</p>");
    text = text.replace(/\{testResult\.telegramPhotoSent \? '✓ صورة المتسلل مرفوعة' : '• لم يتم الإرسال'\}/g, "{testResult.telegramPhotoSent ? translateInline(lang, '✓ Intruder photo uploaded', '✓ صورة المتسلل مرفوعة') : translateInline(lang, '• Not sent', '• لم يتم الإرسال')}");
    text = text.replace(/\{testResult\.telegramLocationSent \? '✓ إحداثيات GPS المباشرة' : '• لم يتم الإرسال'\}/g, "{testResult.telegramLocationSent ? translateInline(lang, '✓ Live GPS coordinates', '✓ إحداثيات GPS المباشرة') : translateInline(lang, '• Not sent', '• لم يتم الإرسال')}");
  }

  if (file === 'src/components/DeviceAuthDialog.tsx') {
    text = text.replace(/title = 'تأكيد هوية مالك الجهاز \(Android System\)'/g, "title = translateInline(lang, 'Verify Device Owner Identity (Android System)', 'تأكيد هوية مالك الجهاز (Android System)')");
    text = text.replace(/subtitle = 'استخدم بصمة الإصبع أو الوجه أو قفل شاشة الهاتف'/g, "subtitle = translateInline(lang, 'Use Fingerprint, Face ID, or Screen Lock', 'استخدم بصمة الإصبع أو الوجه أو قفل شاشة الهاتف')");
    
    text = text.replace(/'🚨 \[تم التقاط صورة المتسلل صامتاً في الخلفية!\] تم استنفاد 3 محاولات فاشلة\. تم إرسال لقطة الكاميرا وإحداثيات الموقع مباشرة إلى تليجرام، بريد Gmail، ورسائل الطوارئ Dual-SMS\.'/g, "translateInline(lang, '🚨 [Intruder photo captured silently in background!] 3 failed attempts exhausted. Camera snapshot and location coordinates sent directly to Telegram, Gmail, and Dual-SMS emergency contacts.', '🚨 [تم التقاط صورة المتسلل صامتاً في الخلفية!] تم استنفاد 3 محاولات فاشلة. تم إرسال لقطة الكاميرا وإحداثيات الموقع مباشرة إلى تليجرام، بريد Gmail، ورسائل الطوارئ Dual-SMS.')");
    
    text = text.replace(/`\$\{reasonText\} \(محاولة فاشلة \$\{res\.newCount\} من 3\)\. سيتم التقاط صورة المتسلل وإرسال تقارير الطوارئ عند المحاولة الثالثة\.`/g, "`${reasonText} ${translateInline(lang, `(Failed attempt ${res.newCount} of 3). Intruder photo will be captured and emergency reports sent on the third attempt.`, `(محاولة فاشلة ${res.newCount} من 3). سيتم التقاط صورة المتسلل وإرسال تقارير الطوارئ عند المحاولة الثالثة.`)}`");
    
    text = text.replace(/'بصمة غير مطابقة لهوية مالك الجهاز'/g, "translateInline(lang, 'Fingerprint does not match device owner', 'بصمة غير مطابقة لهوية مالك الجهاز')");
    text = text.replace(/'رمز PIN قفل الشاشة غير صحيح'/g, "translateInline(lang, 'Incorrect screen lock PIN', 'رمز PIN قفل الشاشة غير صحيح')");
    text = text.replace(/'نمط قفل الشاشة غير صحيح'/g, "translateInline(lang, 'Incorrect screen lock pattern', 'نمط قفل الشاشة غير صحيح')");
    
    text = text.replace(/>\s*بصمة\s*</g, ">{translateInline(lang, 'Fingerprint', 'بصمة')}<");
    text = text.replace(/>\s*الوجه\s*</g, ">{translateInline(lang, 'Face ID', 'الوجه')}<");
    text = text.replace(/>\s*PIN الجهاز\s*</g, ">{translateInline(lang, 'Device PIN', 'PIN الجهاز')}<");
    text = text.replace(/>\s*النمط\s*</g, ">{translateInline(lang, 'Pattern', 'النمط')}<");
    
    text = text.replace(/'تم التحقق من بصمة الجهاز بنجاح!'/g, "translateInline(lang, 'Device fingerprint verified successfully!', 'تم التحقق من بصمة الجهاز بنجاح!')");
    text = text.replace(/'جاري التحقق من بصمة الإصبع عبر نظام Android\.\.\.'/g, "translateInline(lang, 'Verifying fingerprint via Android system...', 'جاري التحقق من بصمة الإصبع عبر نظام Android...')");
    text = text.replace(/'المس مستشعر البصمة للمصادقة عبر أمان الهاتف \(بصمة المالك\)'/g, "translateInline(lang, 'Touch fingerprint sensor to authenticate via phone security (Owner Fingerprint)', 'المس مستشعر البصمة للمصادقة عبر أمان الهاتف (بصمة المالك)')");
    
    text = text.replace(/>\s*محاكاة بصمة دخيل غير مطابقة \(اختبار الإنذار\)\s*</g, ">{translateInline(lang, 'Simulate unmatched intruder fingerprint (Alarm Test)', 'محاكاة بصمة دخيل غير مطابقة (اختبار الإنذار)')}<");
    
    text = text.replace(/'تم التعرف على الوجه بنجاح!'/g, "translateInline(lang, 'Face recognized successfully!', 'تم التعرف على الوجه بنجاح!')");
    text = text.replace(/'جاري مطابقة ملامح الوجه المعتمدة بالجهاز\.\.\.'/g, "translateInline(lang, 'Matching device approved face features...', 'جاري مطابقة ملامح الوجه المعتمدة بالجهاز...')");
    text = text.replace(/'انظر إلى الكاميرا للتحقق عبر Face Unlock \(وجه المالك\)'/g, "translateInline(lang, 'Look at the camera to verify via Face Unlock (Owner Face)', 'انظر إلى الكاميرا للتحقق عبر Face Unlock (وجه المالك)')");
    
    text = text.replace(/>\s*مسح وجه المالك\s*</g, ">{translateInline(lang, 'Scan Owner Face', 'مسح وجه المالك')}<");
    text = text.replace(/'ملامح وجه غير مطابقة لمالك الجهاز'/g, "translateInline(lang, 'Facial features do not match device owner', 'ملامح وجه غير مطابقة لمالك الجهاز')");
    text = text.replace(/>\s*محاكاة وجه متسلل\s*</g, ">{translateInline(lang, 'Simulate Intruder Face', 'محاكاة وجه متسلل')}<");
    
    text = text.replace(/أدخل رمز قفل الهاتف \(رمز المالك: <span className="font-mono-code font-bold text-emerald-400">\{ownerPinHint\}<\/span>\):/g, "{translateInline(lang, 'Enter phone lock code (Owner Code:', 'أدخل رمز قفل الهاتف (رمز المالك:')} <span className=\"font-mono-code font-bold text-emerald-400\">{ownerPinHint}</span>):");
    
    text = text.replace(/>\s*مسح\s*</g, ">{translateInline(lang, 'Clear', 'مسح')}<");
    text = text.replace(/'تم إدخال رمز PIN خاطئ'/g, "translateInline(lang, 'Incorrect PIN entered', 'تم إدخال رمز PIN خاطئ')");
    text = text.replace(/>\s*محاكاة إدخال رمز خاطئ \(اختبار رصد الدخيل\)\s*</g, ">{translateInline(lang, 'Simulate incorrect PIN entry (Intruder Detection Test)', 'محاكاة إدخال رمز خاطئ (اختبار رصد الدخيل)')}<");
    
    text = text.replace(/ارسم نمط قفل الجهاز \(حدد 4 نقاط على الأقل\):/g, "{translateInline(lang, 'Draw device lock pattern (Connect at least 4 dots):', 'ارسم نمط قفل الجهاز (حدد 4 نقاط على الأقل):')}");
    text = text.replace(/>\s*إعادة رسم النمط\s*</g, ">{translateInline(lang, 'Redraw Pattern', 'إعادة رسم النمط')}<");
    text = text.replace(/>\s*تم التقاط صورة المتسلل صامتاً\s*</g, ">{translateInline(lang, 'Intruder photo captured silently', 'تم التقاط صورة المتسلل صامتاً')}<");
    text = text.replace(/يستخدم أمان نظام التشغيل Android المدمج • لا يتم طلب أي رمز خاص بالتطبيق/g, "{translateInline(lang, 'Uses built-in Android OS security • No app-specific code required', 'يستخدم أمان نظام التشغيل Android المدمج • لا يتم طلب أي رمز خاص بالتطبيق')}");
  }

  fs.writeFileSync(file, text);
}
