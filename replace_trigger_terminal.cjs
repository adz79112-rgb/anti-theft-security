const fs = require('fs');
const content = fs.readFileSync('src/components/TriggerTerminal.tsx', 'utf-8');

let newContent = content;

const dict = {
  "رقم هاتف 1": "Phone 1",
  "رقم هاتف 2": "Phone 2",
  "رقم هاتف 3": "Phone 3",
  "رقم دولي": "Intl Phone",
  "سرقة": "theft", // this is a command word, maybe should remain untranslated or translated as theft? The command parsing checks for 'theft' or 'سرقة'.
  "توليد رقم عشوائي لاختبار الاستجابة": "Generate random number for test",
  "رقم عشوائي": "Random Number",
  "✓ الرد التلقائي سيعود مباشرة لهذا الرقم": "✓ Auto-reply will return directly to this number",
  "اختر رقم مرسل مختلف لتجربة الرد التلقائي عليه:": "Choose a different sender number to test auto-reply:",
  "★ مسار مزدوج:": "★ Dual Path:",
  "1. سرقة:": "1. Theft:",
  "2. كاميرا:": "2. Camera:",
  "3. رمز خاطئ:": "3. Invalid Code:",
  "تم التحقق بنجاح وتفعيل: [": "Successfully verified & activated: [",
  "وضع السرقة (Theft Mode)": "Theft Mode",
  "كاميرا المتسلل (Camera Capture)": "Camera Capture",
  "فشل التحقق من الرسالة (Security Rejection)": "Message verification failed (Security Rejection)",
  "سبب الرفض: ": "Rejection reason: ",
  "الرد التلقائي:": "Auto-reply:",
  "تم إرسال بلاغ الطوارئ والإحداثيات مباشرة لنفس الرقم (": "Emergency report and coordinates sent directly to the same number (",
  "كاميرا": "camera",
  "صيغة الرسالة المعتمدة للاستجابة:": "Accepted Response Format:"
};

// Also replace the command parsing to use the translated strings in TriggerTerminal
// Wait, the input strings have 'سرقة' and 'كاميرا'. The simulator sends these directly to parseTriggerCommand.

