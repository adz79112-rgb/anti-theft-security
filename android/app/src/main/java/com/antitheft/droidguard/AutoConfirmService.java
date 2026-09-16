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
import java.util.List;

public class AutoConfirmService extends AccessibilityService {

    public static final String KEY_AUTO_ENABLE_LOCATION_UNTIL = "auto_enable_location_until";
    private static volatile long sAutoEnableLocationUntil = 0L;

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

        // Only handle window state changes (when new windows/dialogs appear)
        // Never handle TYPE_WINDOW_CONTENT_CHANGED (fires on every render/scroll and causes massive lag)
        if (event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            return;
        }

        // 2. Anti-Theft Power Menu Interception
        boolean isSystemUI = currentPackage.equals("android") || 
                             currentPackage.equals("com.android.systemui") || 
                             currentPackage.contains("globalactions") ||
                             currentPackage.contains("power");

        if (isSystemUI) {
            SharedPreferences prefs = getSharedPreferences(EmergencySmsPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            boolean isAntiShutdownEnabled = prefs.getBoolean(EmergencySmsPlugin.KEY_ANTI_SHUTDOWN_ENABLED, false);
            long bypassUntil = prefs.getLong(EmergencySmsPlugin.KEY_ANTI_SHUTDOWN_BYPASS_UNTIL, 0L);

            // Only inspect the window if protection is actually enabled and bypass is expired
            if (isAntiShutdownEnabled && System.currentTimeMillis() > bypassUntil) {
                AccessibilityNodeInfo root = getRootInActiveWindow();
                if (root != null) {
                    boolean hasPowerOff = !root.findAccessibilityNodeInfosByText("Power off").isEmpty() ||
                                          !root.findAccessibilityNodeInfosByText("إيقاف التشغيل").isEmpty() ||
                                          !root.findAccessibilityNodeInfosByText("Power Off").isEmpty() ||
                                          !root.findAccessibilityNodeInfosByText("Restart").isEmpty() ||
                                          !root.findAccessibilityNodeInfosByText("إعادة التشغيل").isEmpty() ||
                                          !root.findAccessibilityNodeInfosByText("Eteindre").isEmpty() ||
                                          !root.findAccessibilityNodeInfosByText("Redémarrer").isEmpty();

                    if (hasPowerOff) {
                        // Dismiss the system power menu
                        performGlobalAction(GLOBAL_ACTION_HOME);

                        // Launch our authentication challenge
                        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
                        if (launchIntent != null) {
                            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            launchIntent.putExtra("TRIGGER_POWER_LOCK", true);
                            startActivity(launchIntent);
                        }

                        root.recycle();
                        return;
                    }
                    root.recycle();
                }
            }
        }

        // 3. Automated Force-Enable Location (GPS) when Theft Mode or Emergency is triggered
        if (isAutoEnableLocationArmed(this)) {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                boolean handled = handleAutoEnableLocation(root, currentPackage);
                root.recycle();
                if (handled) {
                    return;
                }
            }
        }

        // 4. Auto-Confirm ONLY for OEM security dialogs (Oppo, Realme, Xiaomi, Google/AOSP permission controllers)
        boolean isOemPermissionDialog = currentPackage.equals("com.oplus.securitypermission") ||
                                       currentPackage.equals("com.coloros.securitypermission") ||
                                       currentPackage.equals("com.miui.securitycenter") ||
                                       currentPackage.equals("com.android.permissioncontroller") ||
                                       currentPackage.equals("com.google.android.permissioncontroller");

        if (!isOemPermissionDialog) {
            return;
        }

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        clickButtonByText(root, "إرسال");
        clickButtonByText(root, "Send");
        clickButtonByText(root, "السماح");
        clickButtonByText(root, "Allow");

        root.recycle();
    }

    private boolean handleAutoEnableLocation(AccessibilityNodeInfo root, String currentPackage) {
        if (root == null) return false;

        // A. Check if Location is already active in the system
        LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        boolean isLocationOn = false;
        if (lm != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                try {
                    isLocationOn = lm.isLocationEnabled();
                } catch (Exception ignored) {}
            }
            if (!isLocationOn) {
                try {
                    isLocationOn = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                                   lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
                } catch (Exception ignored) {}
            }
        }

        if (isLocationOn) {
            disarmAutoEnableLocation(this);
            finishAndReturnToApp();
            return true;
        }

        // B. Check if this is a dialog window requesting confirmation (Google Play Services / Android Dialog)
        String[] confirmTexts = new String[]{
            "موافق", "تشغيل", "تفعيل", "أوافق", "قبول", "السماح", "نعم", "تم",
            "OK", "Turn on", "Agree", "Allow", "Accept", "Yes", "Enable", "Done", "Turn On"
        };
        for (String txt : confirmTexts) {
            if (clickButtonByText(root, txt)) {
                disarmAutoEnableLocation(this);
                finishAndReturnToApp();
                return true;
            }
        }

        // C. Check Location Settings screen for toggle switch
        boolean toggled = scanAndToggleLocationSwitch(root, 0);
        if (toggled) {
            disarmAutoEnableLocation(this);
            finishAndReturnToApp();
            return true;
        }

        return false;
    }

    private boolean scanAndToggleLocationSwitch(AccessibilityNodeInfo node, int depth) {
        if (node == null || depth > 12) return false;

        // 1. Direct Switch / ToggleButton detection
        CharSequence className = node.getClassName();
        if (className != null) {
            String cls = className.toString();
            if (cls.contains("Switch") || cls.contains("ToggleButton") || cls.contains("CompoundButton") || cls.contains("CheckBox")) {
                if (!node.isChecked()) {
                    if (node.isClickable()) {
                        return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                    AccessibilityNodeInfo parent = node.getParent();
                    if (parent != null) {
                        if (parent.isClickable()) {
                            boolean res = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            parent.recycle();
                            return res;
                        }
                        parent.recycle();
                    }
                }
            }
        }

        // 2. Keyword detection on rows / labels ("Use location" / "استخدام الموقع" / "تشغيل الموقع" / etc.)
        CharSequence text = node.getText();
        CharSequence desc = node.getContentDescription();
        String label = ((text != null ? text.toString() : "") + " " + (desc != null ? desc.toString() : "")).trim();
        if (!label.isEmpty()) {
            String lower = label.toLowerCase();
            boolean isLocationLabel = lower.contains("استخدام الموقع") ||
                                      lower.contains("use location") ||
                                      lower.contains("تشغيل الموقع") ||
                                      lower.contains("تفعيل الموقع") ||
                                      lower.contains("خدمات الموقع") ||
                                      lower.contains("موقع الجهاز") ||
                                      lower.contains("location access");

            if (isLocationLabel) {
                if (node.isClickable()) {
                    return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
                AccessibilityNodeInfo parent = node.getParent();
                if (parent != null) {
                    if (parent.isClickable()) {
                        boolean res = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        parent.recycle();
                        return res;
                    }
                    // Check siblings for the switch
                    for (int s = 0; s < parent.getChildCount(); s++) {
                        AccessibilityNodeInfo sibling = parent.getChild(s);
                        if (sibling != null) {
                            CharSequence sibCls = sibling.getClassName();
                            if (sibCls != null && (sibCls.toString().contains("Switch") || sibCls.toString().contains("ToggleButton") || sibCls.toString().contains("CompoundButton"))) {
                                if (!sibling.isChecked()) {
                                    boolean res = sibling.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                                    sibling.recycle();
                                    parent.recycle();
                                    return res;
                                }
                            }
                            sibling.recycle();
                        }
                    }
                    parent.recycle();
                }
            }
        }

        // 3. Scan children recursively
        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                boolean done = scanAndToggleLocationSwitch(child, depth + 1);
                child.recycle();
                if (done) return true;
            }
        }

        return false;
    }

    private void finishAndReturnToApp() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                performGlobalAction(GLOBAL_ACTION_BACK);
            } catch (Exception ignored) {}

            try {
                Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    startActivity(launchIntent);
                }
            } catch (Exception ignored) {}
        }, 400);
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

    @Override
    public void onInterrupt() {}
}
