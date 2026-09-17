package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.content.SharedPreferences;
import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class AutoConfirmService extends AccessibilityService {

    public static final String KEY_AUTO_ENABLE_LOCATION_UNTIL = "auto_enable_location_until";
    private static volatile long sAutoEnableLocationUntil = 0L;
    private static volatile boolean sIsReturningToApp = false;

    // Window Inspector Debounce
    private static volatile String sLastInspectedKey = "";
    private static volatile long sLastInspectedTime = 0L;

    // Power Menu Intercept Debounce
    private static volatile long sLastPowerInterceptTime = 0L;

    // Oppo/Realme Accessibility Keep-On Watcher
    private static volatile boolean sIsWatchingCountdown = false;
    private static volatile int sCountdownRetries = 0;

    // Google Location Accuracy Watcher
    private static volatile boolean sIsWatchingGmsLocation = false;
    private static volatile int sGmsLocationRetries = 0;

    public static void armAutoEnableLocation(Context context, long durationMs) {
        sAutoEnableLocationUntil = System.currentTimeMillis() + durationMs;
        if (context != null) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(EmergencySmsPlugin.PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putLong(KEY_AUTO_ENABLE_LOCATION_UNTIL, sAutoEnableLocationUntil).apply();
            } catch (Exception ignored) {}
        }
    }

    public static boolean isAutoEnableLocationArmed(Context context) {
        if (System.currentTimeMillis() < sAutoEnableLocationUntil) {
            return true;
        }
        if (context != null) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(EmergencySmsPlugin.PREFS_NAME, Context.MODE_PRIVATE);
                long until = prefs.getLong(KEY_AUTO_ENABLE_LOCATION_UNTIL, 0L);
                if (System.currentTimeMillis() < until) {
                    sAutoEnableLocationUntil = until;
                    return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    public static void disarmAutoEnableLocation(Context context) {
        sAutoEnableLocationUntil = 0L;
        if (context != null) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(EmergencySmsPlugin.PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putLong(KEY_AUTO_ENABLE_LOCATION_UNTIL, 0L).apply();
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        CharSequence packageNameSeq = event.getPackageName();
        if (packageNameSeq == null) return;
        String currentPackage = packageNameSeq.toString();

        // 1. CRITICAL PERFORMANCE FIX: NEVER inspect or interact with our own app!
        // When AccessibilityService inspects WebView/Capacitor via getRootInActiveWindow(),
        // Chromium's accessibility bridge forces full DOM tree serialization over IPC on EVERY touch/scroll,
        // which completely freezes user interactions, scrolling, and button clicks.
        if (currentPackage.equals(getPackageName()) || currentPackage.equals("com.antitheft.droidguard")) {
            return;
        }

        // Only handle window state changes and window hierarchy changes (when new windows/dialogs appear)
        // Never handle TYPE_WINDOW_CONTENT_CHANGED (fires on every render/scroll and causes massive lag)
        if (event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            event.getEventType() != AccessibilityEvent.TYPE_WINDOWS_CHANGED) {
            return;
        }

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) {
            root = event.getSource();
        }
        if (root == null) return;

        try {
            // A. ON-SCREEN WINDOW INSPECTOR (Persists last inspected package & notifies UI, avoids spamming Toasts)
            showWindowInspector(event, root, currentPackage);

            // B. OPPO / REALME / COLOROS ACCESSIBILITY COUNTDOWN DIALOG (الصورة الثانية)
            if (handleColorOsAccessibilityCountdown(root, currentPackage)) {
                return;
            }

            // C. GOOGLE LOCATION ACCURACY DIALOG (الصورة الأولى)
            if (handleGoogleLocationAccuracyDialog(root, currentPackage)) {
                return;
            }

            // D. Anti-Theft Power Menu Interception (Realme, Oppo / ColorOS, Xiaomi, Samsung, Stock Android)
            if (isPowerMenuDialog(root, event, currentPackage)) {
                long now = System.currentTimeMillis();
                if (now - sLastPowerInterceptTime < 3000L) {
                    return;
                }
                sLastPowerInterceptTime = now;

                SharedPreferences prefs = getSharedPreferences(EmergencySmsPlugin.PREFS_NAME, Context.MODE_PRIVATE);
                boolean isAntiShutdownEnabled = prefs.getBoolean(EmergencySmsPlugin.KEY_ANTI_SHUTDOWN_ENABLED, true);
                long bypassUntil = prefs.getLong(EmergencySmsPlugin.KEY_ANTI_SHUTDOWN_BYPASS_UNTIL, 0L);

                // Only intercept if protection is enabled and bypass is expired
                if (isAntiShutdownEnabled && now > bypassUntil) {
                    // 1. Immediately dismiss system power dialog and close system dialogs
                    try {
                        Intent closeIntent = new Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS);
                        sendBroadcast(closeIntent);
                    } catch (Exception ignored) {}

                    performGlobalAction(GLOBAL_ACTION_BACK);

                    // 2. Notify EmergencySmsPlugin
                    EmergencySmsPlugin.notifyPowerOffIntercepted();

                    // 3. Launch our authentication challenge
                    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                        launchIntent.putExtra("TRIGGER_POWER_LOCK", true);
                        startActivity(launchIntent);
                    }
                    return;
                }
            }

            // E. Automated Force-Enable Location (GPS) when Theft Mode or Emergency is triggered
            if (isAutoEnableLocationArmed(this)) {
                boolean handled = handleAutoEnableLocation(root, currentPackage);
                if (handled) {
                    return;
                }
            }

            // F. Auto-Confirm ONLY for OEM security dialogs (Oppo, Realme, Xiaomi, Google/AOSP permission controllers)
            boolean isOemPermissionDialog = currentPackage.equals("com.oplus.securitypermission") ||
                                           currentPackage.equals("com.coloros.securitypermission") ||
                                           currentPackage.equals("com.miui.securitycenter") ||
                                           currentPackage.equals("com.android.permissioncontroller") ||
                                           currentPackage.equals("com.google.android.permissioncontroller");

            if (isOemPermissionDialog) {
                clickButtonByText(root, "إرسال");
                clickButtonByText(root, "Send");
                clickButtonByText(root, "السماح");
                clickButtonByText(root, "Allow");
            }
        } finally {
            root.recycle();
        }
    }

    private void showToast(String msg) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                Toast.makeText(getApplicationContext(), msg, Toast.LENGTH_LONG).show();
            } catch (Exception ignored) {}
        });
    }

    private void showWindowInspector(AccessibilityEvent event, AccessibilityNodeInfo root, String currentPackage) {
        try {
            CharSequence classNameSeq = event.getClassName();
            String className = classNameSeq != null ? classNameSeq.toString() : "Unknown";
            String key = currentPackage + "/" + className;
            long now = System.currentTimeMillis();
            if (key.equals(sLastInspectedKey) && (now - sLastInspectedTime < 2500L)) {
                return;
            }
            sLastInspectedKey = key;
            sLastInspectedTime = now;

            List<String> buttons = extractClickableTexts(root);
            String btnStr = buttons.isEmpty() ? "" : buttons.toString();

            // 1. Log cleanly to Android Logcat
            Log.d("AutoConfirmService", "Inspector: Package=" + currentPackage + " | Class=" + className + " | Buttons=" + btnStr);

            // 2. Persist to SharedPreferences so it can be read cleanly in the UI
            try {
                SharedPreferences prefs = getSharedPreferences(EmergencySmsPlugin.PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit()
                    .putString("last_inspected_package", currentPackage)
                    .putString("last_inspected_class", className)
                    .putString("last_inspected_buttons", btnStr)
                    .putLong("last_inspected_time", now)
                    .apply();
            } catch (Exception ignored) {}

            // Notify UI if app is open
            EmergencySmsPlugin.notifyWindowInspected(currentPackage, className, btnStr, now);
        } catch (Exception ignored) {}
    }

    private List<String> extractClickableTexts(AccessibilityNodeInfo root) {
        List<String> list = new ArrayList<>();
        if (root == null) return list;
        collectClickableTextsRecursive(root, list, 0);
        return list;
    }

    private void collectClickableTextsRecursive(AccessibilityNodeInfo node, List<String> list, int depth) {
        if (node == null || depth > 8 || list.size() >= 5) return;
        if (node.isClickable()) {
            CharSequence txt = node.getText();
            if (txt == null || txt.length() == 0) {
                txt = node.getContentDescription();
            }
            if (txt != null && txt.length() > 0) {
                String clean = txt.toString().trim();
                if (!clean.isEmpty() && !list.contains(clean)) {
                    list.add(clean);
                }
            }
        }
        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                collectClickableTextsRecursive(child, list, depth + 1);
                child.recycle();
            }
        }
    }

    /**
     * Handles Google Location Accuracy Dialog (الصورة الأولى):
     * Package: com.google.android.gms
     * Text: "للمتابعة، يجب تفعيل الإعداد 'دقة الموقع الجغرافي' في جهازك"
     * Positive Button: "تفعيل" / "Turn on" / "OK" / "Agree"
     * Negative Button: "لا، شكرًا" / "No thanks"
     */
    private boolean handleGoogleLocationAccuracyDialog(AccessibilityNodeInfo root, String currentPackage) {
        if (root == null) return false;

        boolean isGms = "com.google.android.gms".equals(currentPackage) ||
                        (currentPackage != null && currentPackage.contains("google") && currentPackage.contains("location"));

        // Check for location accuracy dialog signatures
        boolean hasLocationDialogText = 
            !root.findAccessibilityNodeInfosByText("دقة الموقع الجغرافي").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("دقة الموقع").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("الموقع الجغرافي").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("للمتابعة، يجب تفعيل").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("للمتابعة").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("Location accuracy").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("Location Accuracy").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("turn on device location").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("Google Location").isEmpty();

        // Also check if "لا، شكرًا" / "No thanks" exists on screen (GMS dialog signature)
        boolean hasNegativeButton = 
            !root.findAccessibilityNodeInfosByText("لا، شكرًا").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("لا، شكرا").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("لا شكرا").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("No thanks").isEmpty() ||
            !root.findAccessibilityNodeInfosByText("No Thanks").isEmpty();

        boolean isTargetDialog = (isGms && (hasLocationDialogText || hasNegativeButton)) ||
                                 (hasLocationDialogText && hasNegativeButton) ||
                                 (isGms && hasLocationDialogText);

        if (!isTargetDialog) {
            return false;
        }

        Log.d("AutoConfirmService", "Google Location Accuracy dialog detected in " + currentPackage);

        // Attempt clicking the positive "تفعيل" button only
        boolean clicked = clickLocationAccuracyPositiveButton(root);
        if (clicked) {
            Log.d("AutoConfirmService", "Google Location Accuracy: 'تفعيل' button clicked successfully!");
            showToast("🛡️ تم تفعيل دقة الموقع الجغرافي تلقائياً");
            disarmAutoEnableLocation(this);
            try {
                Intent explicitIntent = new Intent(this, MainActivity.class);
                explicitIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(explicitIntent);
            } catch (Exception ignored) {}
            return true;
        }

        // If not clicked immediately on initial frame, start quick watcher for async dialog inflation
        if (isGms && !sIsWatchingGmsLocation) {
            startGmsLocationWatcher();
        }

        return true;
    }

    private boolean clickLocationAccuracyPositiveButton(AccessibilityNodeInfo root) {
        if (root == null) return false;

        // 1. Search for positive button texts specifically
        String[] targetButtons = new String[]{
            "تفعيل", "تشغيل", "تمكين", "Turn on", "Turn On", "OK", "Agree", "Allow", "Enable", "موافق"
        };

        for (String btnText : targetButtons) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(btnText);
            if (nodes != null && !nodes.isEmpty()) {
                for (AccessibilityNodeInfo node : nodes) {
                    if (node == null) continue;
                    CharSequence txt = node.getText();
                    CharSequence desc = node.getContentDescription();
                    String full = ((txt != null ? txt.toString() : "") + " " + (desc != null ? desc.toString() : "")).trim();

                    // CRITICAL: NEVER click negative, cancel, or settings link items!
                    if (full.contains("لا،") || full.contains("شكرا") || full.contains("شكرًا") ||
                        full.contains("No thanks") || full.contains("إلغاء") || full.contains("Cancel") ||
                        full.contains("إدارة") || full.contains("الاطلاع") || full.contains("Learn more")) {
                        node.recycle();
                        continue;
                    }

                    boolean clicked = performClickCascade(node);
                    node.recycle();

                    if (clicked) {
                        return true;
                    }
                }
            }
        }

        // 2. Also check by standard Android / GMS button resource IDs
        String[] resIds = new String[]{
            "android:id/button1",
            "com.google.android.gms:id/positive_button",
            "com.google.android.gms:id/agree",
            "com.google.android.gms:id/button1",
            "com.google.android.gms:id/ok_button",
            "com.google.android.gms:id/confirm_button",
            "com.google.android.gms:id/accept_button"
        };
        for (String id : resIds) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(id);
            if (nodes != null && !nodes.isEmpty()) {
                for (AccessibilityNodeInfo n : nodes) {
                    if (n == null) continue;
                    boolean clicked = performClickCascade(n);
                    n.recycle();
                    if (clicked) {
                        return true;
                    }
                }
            }
        }

        // 3. Fallback: Recursive check for exact "تفعيل"
        return findAndClickExactTextRecursive(root, "تفعيل", 0);
    }

    private boolean findAndClickExactTextRecursive(AccessibilityNodeInfo node, String targetText, int depth) {
        if (node == null || depth > 8) return false;
        CharSequence txt = node.getText();
        CharSequence desc = node.getContentDescription();
        String nodeText = txt != null ? txt.toString().trim() : "";
        String nodeDesc = desc != null ? desc.toString().trim() : "";

        if (nodeText.equals(targetText) || nodeDesc.equals(targetText)) {
            if (performClickCascade(node)) {
                return true;
            }
        }

        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                boolean found = findAndClickExactTextRecursive(child, targetText, depth + 1);
                child.recycle();
                if (found) return true;
            }
        }
        return false;
    }

    private void startGmsLocationWatcher() {
        sIsWatchingGmsLocation = true;
        sGmsLocationRetries = 0;
        final Handler handler = new Handler(Looper.getMainLooper());
        final Runnable checkRunnable = new Runnable() {
            @Override
            public void run() {
                sGmsLocationRetries++;
                AccessibilityNodeInfo freshRoot = getRootInActiveWindow();
                boolean clicked = false;
                if (freshRoot != null) {
                    clicked = clickLocationAccuracyPositiveButton(freshRoot);
                    freshRoot.recycle();
                }

                if (clicked) {
                    Log.d("AutoConfirmService", "Google Location Accuracy clicked by watcher!");
                    showToast("🛡️ تم تفعيل دقة الموقع الجغرافي تلقائياً");
                    disarmAutoEnableLocation(AutoConfirmService.this);
                    sIsWatchingGmsLocation = false;
                    return;
                }

                if (sGmsLocationRetries < 10) { // Try for ~3.5 seconds
                    handler.postDelayed(this, 350L);
                } else {
                    sIsWatchingGmsLocation = false;
                }
            }
        };
        handler.postDelayed(checkRunnable, 200L);
    }

    /**
     * Handles Oppo/Realme/ColorOS Accessibility Permission Countdown Dialog (الصورة الثانية):
     * "تم منح تطبيق حماية الهاتف إذن إمكانية الوصول"
     * Buttons: "إيقاف تشغيل إمكانية الوصول" / "استمرار التشغيل (3)" -> "استمرار التشغيل"
     */
    private boolean handleColorOsAccessibilityCountdown(AccessibilityNodeInfo root, String currentPackage) {
        if (root == null) return false;

        boolean hasAccessibilityHint = !root.findAccessibilityNodeInfosByText("إمكانية الوصول").isEmpty() ||
                                       !root.findAccessibilityNodeInfosByText("إذن إمكانية الوصول").isEmpty() ||
                                       !root.findAccessibilityNodeInfosByText("تم منح").isEmpty() ||
                                       !root.findAccessibilityNodeInfosByText("Accessibility").isEmpty() ||
                                       !root.findAccessibilityNodeInfosByText("استمرار التشغيل").isEmpty();

        if (!hasAccessibilityHint) {
            return false;
        }

        // Try to click "استمرار التشغيل" / "Keep on" immediately
        boolean clicked = clickKeepOnButton(root);
        if (clicked) {
            Log.d("AutoConfirmService", "Keep-on button clicked immediately!");
            showToast("🛡️ تم تأكيد استمرار تشغيل حماية الهاتف تلقائياً");
            return true;
        }

        // If not clickable yet (countdown running e.g. "استمرار التشغيل (3)"), start watcher loop
        if (!sIsWatchingCountdown) {
            startCountdownWatcher();
        }
        return true;
    }

    private boolean clickKeepOnButton(AccessibilityNodeInfo root) {
        if (root == null) return false;
        String[] keepTexts = new String[]{
            "استمرار التشغيل", "استمرار", "Keep on", "Keep using", "Continue"
        };
        for (String targetText : keepTexts) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(targetText);
            if (nodes != null && !nodes.isEmpty()) {
                for (AccessibilityNodeInfo node : nodes) {
                    if (node == null) continue;
                    CharSequence txt = node.getText();
                    String fullText = txt != null ? txt.toString() : "";

                    // Critical safety: NEVER click "إيقاف تشغيل"!
                    if (fullText.contains("إيقاف") || fullText.contains("Stop") || fullText.contains("Disable") || fullText.contains("Turn off")) {
                        node.recycle();
                        continue;
                    }

                    boolean isClickable = node.isClickable();
                    boolean clicked = false;
                    if (isClickable) {
                        clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                    if (!clicked) {
                        AccessibilityNodeInfo parent = node.getParent();
                        if (parent != null) {
                            if (parent.isClickable()) {
                                clicked = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            }
                            parent.recycle();
                        }
                    }
                    node.recycle();
                    if (clicked) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private void startCountdownWatcher() {
        sIsWatchingCountdown = true;
        sCountdownRetries = 0;
        final Handler handler = new Handler(Looper.getMainLooper());
        final Runnable checkRunnable = new Runnable() {
            @Override
            public void run() {
                sCountdownRetries++;
                AccessibilityNodeInfo freshRoot = getRootInActiveWindow();
                boolean clicked = false;
                if (freshRoot != null) {
                    clicked = clickKeepOnButton(freshRoot);
                    freshRoot.recycle();
                }

                if (clicked) {
                    Log.d("AutoConfirmService", "Keep-on button clicked by countdown watcher!");
                    showToast("🛡️ تم تأكيد استمرار تشغيل حماية الهاتف تلقائياً");
                    sIsWatchingCountdown = false;
                    return;
                }

                if (sCountdownRetries < 12) { // Try for ~9 seconds
                    handler.postDelayed(this, 750L);
                } else {
                    sIsWatchingCountdown = false;
                }
            }
        };
        handler.postDelayed(checkRunnable, 750L);
    }

    private static final String[] PRIMARY_LOCATION_TITLES = new String[]{
        "استخدام الموقع الجغرافي",
        "استخدام الموقع",
        "Use location",
        "Use Location"
    };

    private static final String[] BLACKLIST_KEYWORDS = new String[]{
        "الخلفية",
        "خلفية",
        "تنبيه",
        "تنبيهات",
        "التنبيهات",
        "إشعار",
        "إشعارات",
        "background",
        "alert",
        "alerts",
        "notification",
        "notifications"
    };

    private boolean isLocationCurrentlyEnabled(LocationManager lm) {
        if (lm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                if (lm.isLocationEnabled()) return true;
            } catch (Exception ignored) {}
        }
        try {
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                   lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception ignored) {}
        return false;
    }

    private boolean isNodeBlacklisted(AccessibilityNodeInfo node) {
        if (node == null) return false;
        CharSequence text = node.getText();
        CharSequence desc = node.getContentDescription();
        String combined = ((text != null ? text.toString() : "") + " " +
                           (desc != null ? desc.toString() : "")).toLowerCase();
        for (String bl : BLACKLIST_KEYWORDS) {
            if (combined.contains(bl.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    private AccessibilityNodeInfo findSwitchInContainer(AccessibilityNodeInfo container) {
        if (container == null) return null;
        return searchSwitchRecursive(container, 0);
    }

    private AccessibilityNodeInfo searchSwitchRecursive(AccessibilityNodeInfo node, int depth) {
        if (node == null || depth > 8) return null;

        if (isNodeBlacklisted(node)) {
            return null;
        }

        CharSequence cls = node.getClassName();
        if (cls != null) {
            String clsStr = cls.toString();
            boolean isSwitch = clsStr.contains("Switch") ||
                               clsStr.contains("ToggleButton") ||
                               clsStr.contains("CompoundButton") ||
                               clsStr.contains("CheckBox") ||
                               node.isCheckable();
            if (isSwitch) {
                return AccessibilityNodeInfo.obtain(node);
            }
        }

        String resId = node.getViewIdResourceName();
        if (resId != null) {
            String lowerRes = resId.toLowerCase();
            if (lowerRes.contains("switch") || lowerRes.contains("toggle") || lowerRes.contains("checkbox")) {
                return AccessibilityNodeInfo.obtain(node);
            }
        }

        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                AccessibilityNodeInfo found = searchSwitchRecursive(child, depth + 1);
                child.recycle();
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private boolean performClickCascade(AccessibilityNodeInfo node) {
        if (node == null) return false;
        if (node.isClickable() && node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            return true;
        }
        AccessibilityNodeInfo parent = node.getParent();
        int depth = 0;
        while (parent != null && depth < 4) {
            if (parent.isClickable() && parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                parent.recycle();
                return true;
            }
            AccessibilityNodeInfo old = parent;
            parent = parent.getParent();
            old.recycle();
            depth++;
        }
        if (parent != null) {
            parent.recycle();
        }
        return false;
    }

    private boolean toggleMainLocationSwitchOnly(AccessibilityNodeInfo root) {
        if (root == null) return false;

        for (String targetTitle : PRIMARY_LOCATION_TITLES) {
            List<AccessibilityNodeInfo> matchingNodes = root.findAccessibilityNodeInfosByText(targetTitle);
            if (matchingNodes == null || matchingNodes.isEmpty()) continue;

            for (AccessibilityNodeInfo textNode : matchingNodes) {
                if (textNode == null) continue;

                // 1. Validate that this text node is NOT related to background alerts or secondary options
                if (isNodeBlacklisted(textNode)) {
                    textNode.recycle();
                    continue;
                }

                // Verify the text actually contains the primary title
                CharSequence nodeText = textNode.getText();
                CharSequence nodeDesc = textNode.getContentDescription();
                String label = ((nodeText != null ? nodeText.toString() : "") + " " +
                                (nodeDesc != null ? nodeDesc.toString() : "")).toLowerCase();
                if (!label.contains(targetTitle.toLowerCase())) {
                    textNode.recycle();
                    continue;
                }

                // 2. Find the Switch belonging strictly to this item
                // Search upwards in parent containers (the Preference row)
                AccessibilityNodeInfo currentContainer = textNode;
                AccessibilityNodeInfo targetSwitch = null;
                AccessibilityNodeInfo clickableRow = null;

                for (int level = 0; level < 4; level++) {
                    if (currentContainer == null) break;

                    // If any ancestor contains blacklisted words, stop searching this branch!
                    if (isNodeBlacklisted(currentContainer)) {
                        break;
                    }

                    // Check if this container is clickable
                    if (currentContainer.isClickable() && clickableRow == null) {
                        clickableRow = currentContainer;
                    }

                    // Look for a switch in this container
                    targetSwitch = findSwitchInContainer(currentContainer);
                    if (targetSwitch != null) {
                        break;
                    }

                    AccessibilityNodeInfo parent = currentContainer.getParent();
                    if (currentContainer != textNode && currentContainer != clickableRow) {
                        currentContainer.recycle();
                    }
                    currentContainer = parent;
                }

                if (currentContainer != null && currentContainer != textNode && currentContainer != clickableRow) {
                    currentContainer.recycle();
                }

                // 3. Process the found Switch
                if (targetSwitch != null) {
                    try {
                        if (targetSwitch.isChecked()) {
                            Log.d("AutoConfirmService", "Main location switch is already active (isChecked == true). Returning to lockdown.");
                            targetSwitch.recycle();
                            textNode.recycle();
                            finishAndReturnToApp(200);
                            return true;
                        }

                        Log.d("AutoConfirmService", "Found unchecked main location switch. Toggling ON!");
                        boolean clicked = false;
                        if (targetSwitch.isClickable()) {
                            clicked = targetSwitch.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        }
                        if (!clicked) {
                            clicked = targetSwitch.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        }
                        if (!clicked && clickableRow != null && clickableRow.isClickable()) {
                            clicked = clickableRow.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        }
                        if (!clicked) {
                            clicked = performClickCascade(targetSwitch);
                        }

                        targetSwitch.recycle();
                        textNode.recycle();
                        if (clicked) {
                            Log.d("AutoConfirmService", "GPS switch toggled! Navigating back to lockdown after 400ms.");
                            finishAndReturnToApp(400);
                            return true;
                        }
                    } catch (Exception e) {
                        Log.e("AutoConfirmService", "Error clicking main switch: " + e.getMessage());
                        targetSwitch.recycle();
                    }
                } else if (clickableRow != null && clickableRow.isClickable()) {
                    // Fallback: If switch node wasn't exposed separately, but the row for "استخدام الموقع الجغرافي" is clickable
                    if (!isNodeBlacklisted(clickableRow)) {
                        Log.d("AutoConfirmService", "Clicking clickable row for main location");
                        boolean clicked = clickableRow.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        textNode.recycle();
                        if (clicked) {
                            Log.d("AutoConfirmService", "GPS row clicked! Navigating back to lockdown after 400ms.");
                            finishAndReturnToApp(400);
                            return true;
                        }
                    }
                }

                textNode.recycle();
            }
        }

        return false;
    }

    private boolean handleDialogConfirmation(AccessibilityNodeInfo root) {
        if (root == null) return false;
        String[] confirmTexts = new String[]{
            "تفعيل", "تشغيل", "تمكين", "موافق", "أوافق", "قبول", "السماح", "نعم", "تم",
            "OK", "Turn on", "Turn On", "Enable", "Activate", "Agree", "Allow", "Accept", "Yes", "Done"
        };
        for (String txt : confirmTexts) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(txt);
            if (nodes != null && !nodes.isEmpty()) {
                for (AccessibilityNodeInfo node : nodes) {
                    if (node == null) continue;
                    CharSequence cls = node.getClassName();
                    boolean isButton = node.isClickable() || (cls != null && cls.toString().contains("Button"));
                    if (isButton && !isNodeBlacklisted(node)) {
                        boolean clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        if (!clicked) {
                            AccessibilityNodeInfo parent = node.getParent();
                            if (parent != null && parent.isClickable()) {
                                clicked = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                                parent.recycle();
                            }
                        }
                        node.recycle();
                        if (clicked) {
                            Log.d("AutoConfirmService", "Auto-confirmed dialog button: " + txt);
                            finishAndReturnToApp(400);
                            return true;
                        }
                    } else {
                        node.recycle();
                    }
                }
            }
        }
        return false;
    }

    private boolean isDeviceAdminScreen(AccessibilityNodeInfo root, String currentPackage) {
        if (root == null) return false;
        if (currentPackage != null) {
            String cp = currentPackage.toLowerCase();
            if (cp.contains("deviceadmin")) {
                return true;
            }
        }
        String[] adminKeywords = new String[]{
            "مسؤول الجهاز", "مشرف الجهاز", "تفعيل تطبيق مشرف الجهاز", "تفعيل مسؤول الجهاز",
            "Device admin", "Device administrator", "Activate this device admin app",
            "Activate device admin", "Device admin apps", "Device admin app"
        };
        for (String kw : adminKeywords) {
            try {
                List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(kw);
                if (nodes != null && !nodes.isEmpty()) {
                    for (AccessibilityNodeInfo n : nodes) {
                        n.recycle();
                    }
                    return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    private boolean isLocationRelatedScreen(AccessibilityNodeInfo root, String currentPackage) {
        if (root == null) return false;
        if (isDeviceAdminScreen(root, currentPackage)) {
            return false;
        }
        for (String title : PRIMARY_LOCATION_TITLES) {
            try {
                List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(title);
                if (nodes != null && !nodes.isEmpty()) {
                    for (AccessibilityNodeInfo n : nodes) {
                        n.recycle();
                    }
                    return true;
                }
            } catch (Exception ignored) {}
        }
        String[] dialogPrompts = new String[]{
            "خدمات الموقع", "تحسين دقة الموقع", "Use location", "Location accuracy", "Google Location"
        };
        for (String prompt : dialogPrompts) {
            try {
                List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(prompt);
                if (nodes != null && !nodes.isEmpty()) {
                    for (AccessibilityNodeInfo n : nodes) {
                        n.recycle();
                    }
                    return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    private boolean handleAutoEnableLocation(AccessibilityNodeInfo root, String currentPackage) {
        if (root == null) return false;

        // If this is the Device Admin activation screen, NEVER close or interfere with it!
        if (isDeviceAdminScreen(root, currentPackage)) {
            Log.d("AutoConfirmService", "Device Admin screen detected. Disarming auto-location and ignoring.");
            disarmAutoEnableLocation(this);
            return false;
        }

        // Only proceed if this screen is actually related to Location or GPS
        if (!isLocationRelatedScreen(root, currentPackage)) {
            return false;
        }

        // A. Check if Location is already active in the system
        LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (isLocationCurrentlyEnabled(lm)) {
            if (currentPackage != null && currentPackage.contains("settings") && !currentPackage.contains("droidguard")) {
                finishAndReturnToApp(150);
            } else {
                disarmAutoEnableLocation(this);
            }
            return true;
        }

        // B. Check if a confirmation dialog is already on screen (Google Play Services / Android Dialog)
        boolean dialogConfirmed = handleDialogConfirmation(root);
        if (dialogConfirmed) {
            return true;
        }

        // C. Target the primary Location Switch ("استخدام الموقع الجغرافي" / "Use location")
        boolean toggled = toggleMainLocationSwitchOnly(root);
        if (toggled) {
            return true;
        }

        return false;
    }

    private void finishAndReturnToApp() {
        finishAndReturnToApp(400);
    }

    private void finishAndReturnToApp(long delayMs) {
        disarmAutoEnableLocation(this);
        if (sIsReturningToApp) return;
        sIsReturningToApp = true;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            boolean isInSettings = false;
            try {
                AccessibilityNodeInfo root = getRootInActiveWindow();
                if (root != null) {
                    CharSequence pkg = root.getPackageName();
                    if (pkg != null) {
                        String pkgStr = pkg.toString().toLowerCase(Locale.ROOT);
                        if (pkgStr.contains("com.android.settings") || pkgStr.contains(".settings")) {
                            isInSettings = true;
                        }
                    }
                    root.recycle();
                }
            } catch (Exception ignored) {}

            if (isInSettings) {
                try {
                    performGlobalAction(GLOBAL_ACTION_BACK);
                } catch (Exception ignored) {}
            }

            try {
                Intent explicitIntent = new Intent(this, MainActivity.class);
                explicitIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(explicitIntent);
            } catch (Exception e) {
                try {
                    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                        startActivity(launchIntent);
                    }
                } catch (Exception ignored) {}
            } finally {
                new Handler(Looper.getMainLooper()).postDelayed(() -> sIsReturningToApp = false, 1200L);
            }
        }, delayMs);
    }

    private boolean clickButtonByText(AccessibilityNodeInfo root, String text) {
        if (root == null || text == null) return false;
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(text);
        if (nodes != null && !nodes.isEmpty()) {
            for (AccessibilityNodeInfo node : nodes) {
                if (node == null) continue;
                if (node.isClickable()) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    node.recycle();
                    return true;
                } else {
                    AccessibilityNodeInfo parent = node.getParent();
                    int depth = 0;
                    while (parent != null && depth < 5) {
                        if (parent.isClickable()) {
                            parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            parent.recycle();
                            node.recycle();
                            return true;
                        }
                        AccessibilityNodeInfo oldParent = parent;
                        parent = parent.getParent();
                        oldParent.recycle();
                        depth++;
                    }
                    if (parent != null) {
                        parent.recycle();
                    }
                }
                node.recycle();
            }
        }
        return false;
    }

    private boolean isPowerMenuDialog(AccessibilityNodeInfo root, AccessibilityEvent event, String currentPackage) {
        if (root == null && event == null) return false;

        // Check package name
        boolean isSystemUI = currentPackage.equals("android") || 
                             currentPackage.equals("com.android.systemui") || 
                             currentPackage.contains("globalactions") ||
                             currentPackage.contains("power") ||
                             currentPackage.contains("shutdown") ||
                             currentPackage.contains("systemui") ||
                             currentPackage.contains("sec.android.app");

        if (!isSystemUI) return false;

        // Check className of the event. Restrict to WINDOW_STATE_CHANGED to avoid 
        // false triggers from background content changes in SystemUI
        if (event != null && event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            CharSequence classNameSeq = event.getClassName();
            String className = classNameSeq != null ? classNameSeq.toString() : "";
            if (className.contains("GlobalActions") || className.contains("PowerDialog") || 
                className.contains("Shutdown") || className.contains("OplusGlobalActions") ||
                className.contains("ColorOsGlobalActions")) {
                return true;
            }
        }

        if (root == null) return false;

        // Check recursive nodes for text, contentDescription, or viewId using EXACT matching
        // (We do not use findAccessibilityNodeInfosByText because it performs a substring match
        // which triggers false positives on things like "إيقاف تشغيل الميكروفون")
        return inspectNodeForPowerMenu(root, 0);
    }

    private boolean isPowerKeywordMatch(String text) {
        if (text == null) return false;
        String t = text.toLowerCase(Locale.ROOT).trim();
        // Prevent false positives like "إيقاف تشغيل الميكروفون" (Turn off mic) 
        // by checking length and ensuring exact equality
        if (t.length() > 25) return false;
        
        return t.equals("power off") || t.equals("shutdown") || t.equals("shut down") ||
               t.equals("restart") || t.equals("reboot") ||
               t.equals("إيقاف التشغيل") || t.equals("ايقاف التشغيل") || 
               t.equals("إيقاف تشغيل") || t.equals("ايقاف تشغيل") || 
               t.equals("إعادة التشغيل") || t.equals("اعادة التشغيل") || 
               t.equals("إعادة تشغيل") || t.equals("اعادة تشغيل") || 
               t.equals("éteindre") || t.equals("eteindre") || 
               t.equals("arrêter") || t.equals("redémarrer") ||
               t.equals("طوارئ sos") || (t.length() < 15 && t.contains("طوارئ") && t.contains("sos"));
    }

    private boolean inspectNodeForPowerMenu(AccessibilityNodeInfo node, int depth) {
        if (node == null || depth > 12) return false;
        
        // CRITICAL: Ignore hidden views. SystemUI keeps many power/shutdown views 
        // in memory (e.g. in Quick Settings) but hidden. If we scan them, we get false positives!
        if (!node.isVisibleToUser()) return false;

        CharSequence text = node.getText();
        if (isPowerKeywordMatch(text != null ? text.toString() : null)) {
            return true;
        }

        CharSequence desc = node.getContentDescription();
        if (isPowerKeywordMatch(desc != null ? desc.toString() : null)) {
            return true;
        }

        String resId = node.getViewIdResourceName();
        if (resId != null) {
            String idLower = resId.toLowerCase(Locale.ROOT);
            if (idLower.contains("global_actions") || idLower.contains("power_dialog") ||
                idLower.contains("shutdown") || idLower.contains("oplus_power") || idLower.contains("coloros_power") ||
                idLower.contains("power_slider") || idLower.contains("emergency_sos")) {
                return true;
            }
        }

        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                if (inspectNodeForPowerMenu(child, depth + 1)) {
                    return true;
                }
            }
        }
        return false;
    }

    @Override
    public void onInterrupt() {}
}
