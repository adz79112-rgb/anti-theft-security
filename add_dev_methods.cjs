const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'android/app/src/main/java/com/antitheft/droidguard/EmergencySmsPlugin.java');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = '    @PluginMethod\n    public void requestBackgroundActivityPermission(PluginCall call) {';

const newMethods = `    @PluginMethod
    public void openDeveloperSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestBackgroundActivityPermission(PluginCall call) {`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, newMethods);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully added openDeveloperSettings and openAppSettings");
} else {
    console.log("Could not find target string");
}
