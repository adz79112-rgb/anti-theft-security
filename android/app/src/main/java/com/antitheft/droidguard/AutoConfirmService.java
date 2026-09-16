package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Toast;
import android.content.SharedPreferences;
import android.content.Context;
import android.content.Intent;
import java.util.List;

public class AutoConfirmService extends AccessibilityService {

    private String lastPackageName = "";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        CharSequence packageNameSeq = event.getPackageName();
        String currentPackage = "";
        if (packageNameSeq != null) {
            currentPackage = packageNameSeq.toString();
        }

        // 1. Check for Power Menu interception (Anti-Theft Power Lock)
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || event.getEventType() == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            boolean isSystemApp = currentPackage.equals("android") || 
                                  currentPackage.equals("com.android.systemui") || 
                                  currentPackage.contains("globalactions") ||
                                  currentPackage.contains("power");
            
            if (isSystemApp) {
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
                        SharedPreferences prefs = getSharedPreferences(EmergencySmsPlugin.PREFS_NAME, Context.MODE_PRIVATE);
                        boolean isAntiShutdownEnabled = prefs.getBoolean(EmergencySmsPlugin.KEY_ANTI_SHUTDOWN_ENABLED, false);
                        long bypassUntil = prefs.getLong(EmergencySmsPlugin.KEY_ANTI_SHUTDOWN_BYPASS_UNTIL, 0L);
                        
                        if (isAntiShutdownEnabled && System.currentTimeMillis() > bypassUntil) {
                            // Block the power menu!
                            performGlobalAction(GLOBAL_ACTION_HOME);
                            
                            // Launch our app to the auth screen
                            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
                            if (launchIntent != null) {
                                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                                launchIntent.putExtra("TRIGGER_POWER_LOCK", true);
                                startActivity(launchIntent);
                            }
                            
                            root.recycle();
                            return; // Stop processing
                        }
                    }
                    root.recycle();
                }
            }
        }

        // ONLY allow clicking on the specific Oppo security package or our own app for auto-confirm
        if (!currentPackage.equals("com.oplus.securitypermission") && !currentPackage.equals("com.antitheft.droidguard")) {
            return;
        }

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        boolean clicked = clickButtonByText(root, "إرسال") || 
                          clickButtonByText(root, "Send") || 
                          clickButtonByText(root, "السماح") || 
                          clickButtonByText(root, "Allow");

        if (clicked) {
            // Optional: log success or perform other actions
        }

        root.recycle();
    }

    private boolean clickButtonByText(AccessibilityNodeInfo root, String text) {
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(text);
        if (nodes != null && !nodes.isEmpty()) {
            for (AccessibilityNodeInfo node : nodes) {
                if (node.isClickable()) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    return true;
                } else {
                    AccessibilityNodeInfo parent = node.getParent();
                    while (parent != null) {
                        if (parent.isClickable()) {
                            parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            parent.recycle();
                            return true;
                        }
                        AccessibilityNodeInfo oldParent = parent;
                        parent = parent.getParent();
                        oldParent.recycle();
                    }
                }
            }
        }
        return false;
    }

    @Override
    public void onInterrupt() {}
}
