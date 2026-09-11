const fs = require('fs');
let text = fs.readFileSync('src/components/TriggerTerminal.tsx', 'utf-8');

text = text.replace(/title=توليد رقم عشوائي لاختبار الاستجابة/g, "title={translateInline(lang, 'Generate random number for test', 'توليد رقم عشوائي لاختبار الاستجابة')}");
text = text.replace(/<span>رقم عشوائي<\/span>/g, "<span>{translateInline(lang, 'Random Number', 'رقم عشوائي')}</span>");
text = text.replace(/<span>✓ الرد التلقائي سيعود مباشرة لهذا الرقم<\/span>/g, "<span>{translateInline(lang, '✓ Auto-reply will return directly to this number', '✓ الرد التلقائي سيعود مباشرة لهذا الرقم')}</span>");
text = text.replace(/<span>اختر رقم مرسل مختلف لتجربة الرد التلقائي عليه:<\/span>/g, "<span>{translateInline(lang, 'Choose a different sender number to test auto-reply:', 'اختر رقم مرسل مختلف لتجربة الرد التلقائي عليه:')}</span>");

text = text.replace(/<span className="text-\[10px\] text-cyan-400 font-black">★ مسار مزدوج:<\/span>/g, "<span className=\"text-[10px] text-cyan-400 font-black\">{translateInline(lang, '★ Dual Path:', '★ مسار مزدوج:')}</span>");
text = text.replace(/<span className="text-\[10px\] text-rose-400 font-bold">1\. سرقة:<\/span>/g, "<span className=\"text-[10px] text-rose-400 font-bold\">{translateInline(lang, '1. Theft:', '1. سرقة:')}</span>");
text = text.replace(/<span className="text-\[10px\] text-emerald-400 font-bold">2\. كاميرا:<\/span>/g, "<span className=\"text-[10px] text-emerald-400 font-bold\">{translateInline(lang, '2. Camera:', '2. كاميرا:')}</span>");
text = text.replace(/<span className="text-\[10px\] text-amber-400 font-bold">3\. رمز خاطئ:<\/span>/g, "<span className=\"text-[10px] text-amber-400 font-bold\">{translateInline(lang, '3. Invalid Code:', '3. رمز خاطئ:')}</span>");

text = text.replace(/`تم التحقق بنجاح وتفعيل: \[\$\{lastParsed\.action === 'theft' \? 'وضع السرقة \(Theft Mode\)' : 'كاميرا المتسلل \(Camera Capture\)'\}\]`/g, "`تم التحقق بنجاح وتفعيل: [${lastParsed.action === 'theft' ? translateInline(lang, 'Theft Mode', 'وضع السرقة (Theft Mode)') : translateInline(lang, 'Camera Capture', 'كاميرا المتسلل (Camera Capture)')}]`");
text = text.replace(/'فشل التحقق من الرسالة \(Security Rejection\)'/g, "translateInline(lang, 'Message verification failed (Security Rejection)', 'فشل التحقق من الرسالة (Security Rejection)')");

text = text.replace(/سبب الرفض: /g, "{translateInline(lang, 'Rejection Reason: ', 'سبب الرفض: ')}");
text = text.replace(/<span className="text-slate-300">الرد التلقائي:<\/span>/g, "<span className=\"text-slate-300\">{translateInline(lang, 'Auto-reply:', 'الرد التلقائي:')}</span>");

text = text.replace(/تم إرسال بلاغ الطوارئ والإحداثيات مباشرة لنفس الرقم/g, "{translateInline(lang, 'Emergency report and coordinates sent directly to the same number', 'تم إرسال بلاغ الطوارئ والإحداثيات مباشرة لنفس الرقم')}");

fs.writeFileSync('src/components/TriggerTerminal.tsx', text);
