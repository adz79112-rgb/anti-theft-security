const fs = require('fs');
let text = fs.readFileSync('src/App.tsx', 'utf-8');

text = text.replace(/REMOTE_CAMERA_TRIGGER \(كاميرا\)/g, "REMOTE_CAMERA_TRIGGER");

fs.writeFileSync('src/App.tsx', text);
