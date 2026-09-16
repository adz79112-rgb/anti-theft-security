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
            if (isNodeBlacklisted(parent)) {
                parent.recycle();
                return false;
            }
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
                            Log.d("AutoConfirmService", "Main location switch is already active (isChecked == true).");
                            targetSwitch.recycle();
                            textNode.recycle();
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
            "موافق", "أوافق", "قبول", "السماح", "نعم", "تم",
            "OK", "Turn on", "Turn On", "Agree", "Allow", "Accept", "Yes", "Done"
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
                            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                                disarmAutoEnableLocation(AutoConfirmService.this);
                                finishAndReturnToApp();
                            }, 400);
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

    private boolean handleAutoEnableLocation(AccessibilityNodeInfo root, String currentPackage) {
        if (root == null) return false;

        // A. Check if Location is already active in the system
        LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (isLocationCurrentlyEnabled(lm)) {
            disarmAutoEnableLocation(this);
            finishAndReturnToApp();
            return true;
        }

        // B. First priority: Target the primary Location Switch ("استخدام الموقع الجغرافي" / "Use location")
        boolean toggled = toggleMainLocationSwitchOnly(root);
        if (toggled) {
            // Check after a brief delay if location became active or if confirmation dialog appeared
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                LocationManager checkLm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
                if (isLocationCurrentlyEnabled(checkLm)) {
                    disarmAutoEnableLocation(AutoConfirmService.this);
                    finishAndReturnToApp();
                } else {
                    // Check if a system confirmation dialog appeared after switch click
                    AccessibilityNodeInfo freshRoot = getRootInActiveWindow();
                    if (freshRoot != null) {
                        handleDialogConfirmation(freshRoot);
                        freshRoot.recycle();
                    }
                }
            }, 450);
            return true;
        }

        // C. Check if a confirmation dialog is already on screen (Google Play Services / Android Dialog)
        boolean dialogConfirmed = handleDialogConfirmation(root);
        if (dialogConfirmed) {
            return true;
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
