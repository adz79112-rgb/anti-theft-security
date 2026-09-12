const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'android/app/src/main/java/com/antitheft/droidguard/EmergencySmsPlugin.java');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace('        smsExecutor.execute(() -> {\n', '');
fs.writeFileSync(filePath, content, 'utf8');
