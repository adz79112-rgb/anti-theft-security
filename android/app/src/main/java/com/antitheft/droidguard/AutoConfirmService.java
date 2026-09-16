package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.content.SharedPreferences;
import android.content.Context;
import android.content.Intent;
import java.util.List;

public class AutoConfirmService extends AccessibilityService {

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

        // 3. Auto-Confirm ONLY for OEM security dialogs (Oppo, Realme, Xiaomi, Google/AOSP permission controllers)
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
