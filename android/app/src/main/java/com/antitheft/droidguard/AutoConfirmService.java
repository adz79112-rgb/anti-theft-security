package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Path;
import android.graphics.Rect;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * DroidGuard Ironclad High-Precision Security & Auto-Confirm Accessibility Service
 * 
 * 7-LAYER DEFENSE IN DEPTH:
 * 1. ZERO INTERFERENCE BLACKLIST: Instant early-exit on all messaging, social, banking, browser, and media apps.
 * 2. INPUT METHOD ISOLATION: Immune to virtual keyboards, IME editors, and text fields.
 * 3. SETTINGS APP SHIELD: Settings app is restricted only to verified ColorOS/MIUI/HyperOS security count-down modals.
 * 4. SYSTEM PACKAGE WHITELIST: Strict containment to verified OEM security frameworks and telephony.
 * 5. IRREVERSIBLE NEGATIVE FILTER: Absolute rejection of any node containing disable/cancel/deny/stop commands.
 * 6. MODAL & INTENT VALIDATION: Confirms authentic OS warning dialogues before evaluating positive buttons.
 * 7. FAIL-SAFE SMART CLICK ENGINE: Direct -> Parent -> Gesture tap with automatic node recycling to prevent memory leaks.
 */
public class AutoConfirmService extends AccessibilityService {
    private static final String TAG = "DroidGuard-AutoConfirm";
    public static volatile AutoConfirmService instance = null;

    private static final String PREFS_NAME = "droidguard_security_prefs";
    private static final String KEY_EMERGENCY_ARMED_UNTIL = "emergency_armed_until";
    public static final String ACTION_ARM_EMERGENCY = "com.antitheft.droidguard.ACTION_ARM_EMERGENCY";
    public static final String ACTION_OPEN_POWER_MENU = "com.antitheft.droidguard.ACTION_OPEN_POWER_MENU";

    private static final AtomicLong emergencyArmedUntilMemory = new AtomicLong(0L);
    private static final AtomicLong lastActionTimestamp = new AtomicLong(0L);
    private static final long ACTION_DEBOUNCE_MS = 250L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean isColorOsWatcherRunning = new AtomicBoolean(false);
    private final AtomicBoolean isSmsWatcherRunning = new AtomicBoolean(false);

    // LAYER 1: STRICT BLACKLIST - USER & SENSITIVE APPS ARE NEVER TOUCHED
    private static final Set<String> USER_APPS_BLACKLIST;
    static {
        Set<String> set = new HashSet<>();
        // Social & Messaging
        set.add("com.facebook.orca");
        set.add("com.facebook.katana");
        set.add("com.facebook.lite");
        set.add("com.facebook.mlite");
        set.add("com.whatsapp");
        set.add("com.whatsapp.w4b");
        set.add("org.telegram.messenger");
        set.add("org.thunderdog.challegram");
        set.add("com.instagram.android");
        set.add("com.zhiliaoapp.musically");
        set.add("com.ss.android.ugc.trill");
        set.add("com.ss.android.ugc.aweme");
        set.add("com.ss.android.ugc.live");
        set.add("com.tiktok.studio");
        set.add("com.bytedance");
        set.add("com.google.android.talk");
        set.add("com.google.android.gm");
        set.add("com.viber.voip");
        set.add("com.snapchat.android");
        set.add("com.twitter.android");
        set.add("com.discord");
        set.add("com.imo.android.imoim");
        set.add("com.skype.raider");
        set.add("com.tencent.mm");
        set.add("com.linecorp.line");
        set.add("com.truecaller");
        // Browsers & Payment
        set.add("com.android.chrome");
        set.add("org.mozilla.firefox");
        set.add("com.opera.browser");
        set.add("com.microsoft.emmx");
        set.add("com.google.android.apps.walletnfcrel");
        set.add("com.paypal.android.p2pmobile");
        set.add("com.binance.dev");
        USER_APPS_BLACKLIST = Collections.unmodifiableSet(set);
    }

    // LAYER 4: STRICT WHITELIST - SYSTEM SECURITY, PERMISSIONS & TELEPHONY PACKAGES
    private static final String[] SYSTEM_SECURITY_PACKAGES = new String[] {
        "android",
        "com.android.systemui",
        "com.android.permissioncontroller",
        "com.google.android.permissioncontroller",
        "com.android.packageinstaller",
        "com.samsung.android.permissioncontroller",
        "com.miui.securitycenter",
        "com.miui.securityadd",
        "com.lbe.security.miui",
        "com.miui.powerkeeper",
        "com.android.phone",
        "com.android.server.telecom",
        "com.oplus.securitypermission",
        "com.coloros.securitypermission",
        "com.oplus.safecenter",
        "com.coloros.safecenter",
        "com.nearme.safecenter",
        "com.oppo.safecenter",
        "com.realme.safecenter",
        "com.coloros.securityguard",
        "com.vivo.permissionmanager",
        "com.iqoo.secure",
        "com.transsion.phonemanager",
        "com.transsion.security",
        "com.huawei.systemmanager",
        "com.honor.systemmanager",
        "com.antitheft.droidguard"
    };

    // Strict unambiguous system SMS modal phrases
    private static final String[] SMS_SYSTEM_WARNING_PHRASES = new String[] {
        "سيرسل رسالة sms",
        "سيرسل رسالة قصيرة",
        "سيرسل رسالة",
        "تطبيق حماية الهاتف 5",
        "تطبيق حماية الهاتف",
        "droidguard",
        "قد تتسبب في فرض رسوم",
        "قد يؤدي هذا إلى فرض رسوم",
        "فرض رسوم على فاتورة الجوال",
        "رسوم مشغل شبكة الجوال",
        "محاولة إرسال رسالة قصيرة",
        "souhaite envoyer un sms",
        "peut entraîner des frais",
        "des frais peuvent s'appliquer",
        "frais sur votre facture",
        "sms surtaxé",
        "would like to send an sms",
        "would like to send a message",
        "charges may apply",
        "carrier charges may apply",
        "send premium sms",
        "is attempting to send an sms"
    };

    // LAYER 5: STRICT DANGEROUS/NEGATIVE WORDS - NEVER CLICK ANY BUTTON WITH THESE
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

    // Known positive button View IDs in OEM system dialogs
    private static final String[] POSITIVE_VIEW_IDS = new String[] {
        "android:id/button1",
        "android:id/button_positive",
        "android:id/ok",
        "android:id/button_yes",
        "com.android.permissioncontroller:id/permission_allow_button",
        "com.android.permissioncontroller:id/permission_allow_always_button",
        "com.google.android.permissioncontroller:id/permission_allow_button",
        "com.google.android.permissioncontroller:id/permission_allow_always_button",
        "com.android.packageinstaller:id/permission_allow_button",
        "com.samsung.android.permissioncontroller:id/permission_allow_button",
        "com.samsung.android.permissioncontroller:id/permission_allow_always_button",
        "com.miui.securitycenter:id/accept",
        "com.miui.securitycenter:id/btn_allow",
        "com.miui.securitycenter:id/positive_btn",
        "com.miui.securitycenter:id/ok",
        "com.miui.securitycenter:id/intercept_btn_allow",
        "com.miui.securitycenter:id/send_btn",
        "com.miui.securitycenter:id/button1",
        "com.miui.securityadd:id/button1",
        "com.android.phone:id/button1",
        "com.android.phone:id/positive_button",
        "com.oplus.safecenter:id/btn_continue",
        "com.coloros.safecenter:id/btn_continue",
        "com.oplus.securitypermission:id/permission_allow_button",
        "com.coloros.securitypermission:id/permission_allow_button",
        "com.oplus.securitypermission:id/btn_allow",
        "com.coloros.securitypermission:id/btn_allow",
        "com.oplus.securitypermission:id/button1",
        "com.coloros.securitypermission:id/button1"
    };

    // Explicit Positive Button Phrases (Multi-lingual)
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

    // Checkbox IDs for "Remember my choice" / "Do not ask again"
    private static final String[] CHECKBOX_VIEW_IDS = new String[] {
        "com.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.google.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.samsung.android.permissioncontroller:id/do_not_ask_again_checkbox",
        "com.samsung.android.messaging:id/remember_choice",
        "com.miui.securitycenter:id/remember",
        "com.miui.securitycenter:id/remember_choice",
        "com.oplus.safecenter:id/checkbox",
        "com.coloros.safecenter:id/checkbox"
    };

    public static void armEmergencyAutoConfirm(Context context, long durationMs) {
        long until = System.currentTimeMillis() + durationMs;
        emergencyArmedUntilMemory.set(until);
        try {
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putLong(KEY_EMERGENCY_ARMED_UNTIL, until).apply();
            }
        } catch (Exception ignored) {}
    }

    public static void armEmergencyWindow(Context context, long durationMs) {
        armEmergencyAutoConfirm(context, durationMs);
    }

    public static boolean isEmergencyWindowActive(Context context) {
        long now = System.currentTimeMillis();
        if (emergencyArmedUntilMemory.get() > now) {
            return true;
        }
        try {
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                long stored = prefs.getLong(KEY_EMERGENCY_ARMED_UNTIL, 0L);
                return stored > now;
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
                emergencyArmedUntilMemory.set(until);
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
        Log.i(TAG, "✅ AutoConfirmService connected & fortified with 7-layer defense.");
    }

    @Override
    public void onDestroy() {
        if (instance == this) instance = null;
        isColorOsWatcherRunning.set(false);
        isSmsWatcherRunning.set(false);
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

    private boolean containsDangerousWord(String text) {
        if (text == null || text.trim().isEmpty()) return false;
        String clean = text.toLowerCase(Locale.ROOT).trim();
        for (String bad : DANGEROUS_NEGATIVE_WORDS) {
            if (clean.contains(bad)) {
                return true;
            }
        }
        return false;
    }

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

    /**
     * Checks whether the current dialog is the ColorOS / Realme Accessibility Security Warning.
     */
    private boolean isAccessibilitySecurityDialog(AccessibilityNodeInfo root) {
        if (root == null) return false;
        try {
            List<AccessibilityNodeInfo> warningHeaders = root.findAccessibilityNodeInfosByText("أمانك المالي");
            if (warningHeaders != null && !warningHeaders.isEmpty()) {
                safeRecycleList(warningHeaders);
                return true;
            }
            safeRecycleList(warningHeaders);

            List<AccessibilityNodeInfo> riskNodes = root.findAccessibilityNodeInfosByText("خطرا على خصوصيتك");
            if (riskNodes != null && !riskNodes.isEmpty()) {
                safeRecycleList(riskNodes);
                return true;
            }
            safeRecycleList(riskNodes);

            List<AccessibilityNodeInfo> riskNodes2 = root.findAccessibilityNodeInfosByText("خطرًا على خصوصيتك");
            if (riskNodes2 != null && !riskNodes2.isEmpty()) {
                safeRecycleList(riskNodes2);
                return true;
            }
            safeRecycleList(riskNodes2);

            List<AccessibilityNodeInfo> keepNodes = root.findAccessibilityNodeInfosByText("استمرار التشغيل");
            if (keepNodes != null && !keepNodes.isEmpty()) {
                safeRecycleList(keepNodes);
                return true;
            }
            safeRecycleList(keepNodes);
        } catch (Throwable ignored) {}
        return false;
    }

    /**
     * Handles ColorOS / Realme Accessibility Warning Dialog safely.
     */
    private boolean handleAccessibilitySecurityDialog(AccessibilityNodeInfo root) {
        if (root == null) return false;

        AccessibilityNodeInfo continueBtn = null;
        List<AccessibilityNodeInfo> byId = null;
        try {
            byId = root.findAccessibilityNodeInfosByViewId("com.oplus.safecenter:id/btn_continue");
            if (byId != null && !byId.isEmpty()) {
                continueBtn = byId.get(0);
            }
        } catch (Throwable ignored) {
        } finally {
            if (byId != null && byId.size() > 1) {
                for (int i = 1; i < byId.size(); i++) safeRecycle(byId.get(i));
            }
        }

        if (continueBtn == null) {
            List<AccessibilityNodeInfo> byText = null;
            try {
                byText = root.findAccessibilityNodeInfosByText("استمرار التشغيل");
                if (byText != null && !byText.isEmpty()) {
                    for (AccessibilityNodeInfo n : byText) {
                        if (!isDangerousNode(n)) {
                            continueBtn = n;
                            break;
                        }
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                if (byText != null) {
                    for (AccessibilityNodeInfo n : byText) {
                        if (n != continueBtn) safeRecycle(n);
                    }
                }
            }
        }

        if (continueBtn != null) {
            try {
                if (continueBtn.isEnabled()) {
                    boolean clicked = performSmartClick(continueBtn);
                    if (clicked) {
                        Log.i(TAG, "🎉 Successfully confirmed 'استمرار التشغيل'!");
                        isColorOsWatcherRunning.set(false);
                        return true;
                    }
                }
            } finally {
                safeRecycle(continueBtn);
            }
        }

        startColorOsContinueWatcher();
        return true;
    }

    /**
     * Active Polling Watcher for ColorOS countdown dialog.
     */
    private void startColorOsContinueWatcher() {
        if (!isColorOsWatcherRunning.compareAndSet(false, true)) return;

        final long startTime = SystemClock.uptimeMillis();
        final long MAX_WATCH_TIME_MS = 8000L;

        final Runnable watchRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isColorOsWatcherRunning.get()) return;

                long elapsed = SystemClock.uptimeMillis() - startTime;
                if (elapsed > MAX_WATCH_TIME_MS) {
                    isColorOsWatcherRunning.set(false);
                    return;
                }

                AccessibilityNodeInfo root = null;
                try {
                    root = findBestRootNode(null);
                    if (root != null) {
                        if (!isAccessibilitySecurityDialog(root)) {
                            isColorOsWatcherRunning.set(false);
                            return;
                        }

                        AccessibilityNodeInfo btn = findContinueButton(root);
                        if (btn != null) {
                            try {
                                if (btn.isEnabled() && !isDangerousNode(btn)) {
                                    boolean clicked = performSmartClick(btn);
                                    if (clicked) {
                                        Log.i(TAG, "🎯 Watcher successfully confirmed 'استمرار التشغيل'!");
                                        isColorOsWatcherRunning.set(false);
                                        return;
                                    }
                                }
                            } finally {
                                safeRecycle(btn);
                            }
                        }
                    }
                } catch (Throwable ignored) {
                } finally {
                    safeRecycle(root);
                }

                if (isColorOsWatcherRunning.get()) {
                    mainHandler.postDelayed(this, 250L);
                }
            }
        };

        mainHandler.post(watchRunnable);
    }

    private AccessibilityNodeInfo findContinueButton(AccessibilityNodeInfo root) {
        if (root == null) return null;
        String[] ids = new String[] {
            "com.oplus.safecenter:id/btn_continue",
            "com.coloros.safecenter:id/btn_continue",
            "android:id/button1"
        };
        for (String id : ids) {
            List<AccessibilityNodeInfo> list = null;
            try {
                list = root.findAccessibilityNodeInfosByViewId(id);
                if (list != null && !list.isEmpty()) {
                    AccessibilityNodeInfo found = list.get(0);
                    for (int i = 1; i < list.size(); i++) safeRecycle(list.get(i));
                    return found;
                }
            } catch (Throwable ignored) {
            } finally {
                safeRecycleList(list);
            }
        }
        List<AccessibilityNodeInfo> textList = null;
        try {
            textList = root.findAccessibilityNodeInfosByText("استمرار التشغيل");
            if (textList == null || textList.isEmpty()) {
                textList = root.findAccessibilityNodeInfosByText("استمرار");
            }
            if (textList != null && !textList.isEmpty()) {
                for (AccessibilityNodeInfo n : textList) {
                    if (!isDangerousNode(n)) {
                        return n;
                    }
                }
            }
        } catch (Throwable ignored) {
        } finally {
            safeRecycleList(textList);
        }
        return null;
    }

    /**
     * Active Polling Watcher for SMS confirmation countdown dialogs.
     */
    private void startSmsConfirmWatcher() {
        if (!isSmsWatcherRunning.compareAndSet(false, true)) return;

        final long startTime = SystemClock.uptimeMillis();
        final long MAX_SMS_WATCH_TIME_MS = 12000L;

        final Runnable smsRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isSmsWatcherRunning.get()) return;

                long elapsed = SystemClock.uptimeMillis() - startTime;
                if (elapsed > MAX_SMS_WATCH_TIME_MS) {
                    isSmsWatcherRunning.set(false);
                    return;
                }

                AccessibilityNodeInfo root = null;
                try {
                    root = findBestRootNode(null);
                    if (root != null) {
                        if (checkIsSmsDialog(root)) {
                            autoCheckRememberChoice(root);

                            AccessibilityNodeInfo positiveBtn = findSmsPositiveButton(root);
                            if (positiveBtn != null) {
                                try {
                                    if (!isDangerousNode(positiveBtn)) {
                                        boolean clicked = performSmartClick(positiveBtn);
                                        if (clicked) {
                                            Log.i(TAG, "🎯 [SMS Watcher] Successfully confirmed and clicked Send button!");
                                            isSmsWatcherRunning.set(false);
                                            return;
                                        }
                                    }
                                } finally {
                                    safeRecycle(positiveBtn);
                                }
                            }
                        } else {
                            isSmsWatcherRunning.set(false);
                            return;
                        }
                    }
                } catch (Throwable t) {
                    Log.w(TAG, "Error in SMS watcher tick: " + t.getMessage());
                } finally {
                    safeRecycle(root);
                }

                if (isSmsWatcherRunning.get()) {
                    mainHandler.postDelayed(this, 200L);
                }
            }
        };

        mainHandler.post(smsRunnable);
    }

    /**
     * Multi-tier algorithm to find the root node
     */
    private AccessibilityNodeInfo findBestRootNode(AccessibilityEvent event) {
        AccessibilityNodeInfo root = null;
        try {
            root = getRootInActiveWindow();
        } catch (Throwable ignored) {}
        if (root != null) return root;

        if (event != null) {
            try {
                root = event.getSource();
            } catch (Throwable ignored) {}
            if (root != null) return root;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                List<AccessibilityWindowInfo> windows = getWindows();
                if (windows != null) {
                    for (AccessibilityWindowInfo win : windows) {
                        if (win != null && (win.getType() == AccessibilityWindowInfo.TYPE_APPLICATION || 
                                             win.getType() == AccessibilityWindowInfo.TYPE_SYSTEM)) {
                            AccessibilityNodeInfo winRoot = win.getRoot();
                            if (winRoot != null) return winRoot;
                        }
                    }
                }
            } catch (Throwable ignored) {}
        }
        return null;
    }

    /**
     * Rigorous check for a system SMS confirmation modal dialog:
     * 1. Must contain an exact system warning phrase (e.g. "سيرسل رسالة SMS" or "قد يؤدي هذا إلى فرض رسوم").
     * 2. Must contain an explicit cancel/deny button ("إلغاء" / "رفض" / "Cancel" / "Deny").
     * This guarantees normal messaging chats (which lack a Cancel button) are NEVER treated as dialogs.
     */
    private boolean checkIsSmsDialog(AccessibilityNodeInfo root) {
        if (root == null) return false;
        try {
            // Step 1: Check warning phrases
            boolean hasWarningPhrase = false;
            for (String phrase : SMS_SYSTEM_WARNING_PHRASES) {
                List<AccessibilityNodeInfo> nodes = null;
                try {
                    nodes = root.findAccessibilityNodeInfosByText(phrase);
                    if (nodes != null && !nodes.isEmpty()) {
                        hasWarningPhrase = true;
                        break;
                    }
                } catch (Throwable ignored) {
                } finally {
                    safeRecycleList(nodes);
                }
            }

            if (!hasWarningPhrase) return false;

            // Step 2: Confirmation dialogs ALWAYS have a Cancel/Deny button (إلغاء / رفض)
            boolean hasCancelButton = false;
            String[] cancelWords = new String[] { "إلغاء", "الغاء", "رفض", "cancel", "deny", "annuler" };
            for (String cWord : cancelWords) {
                List<AccessibilityNodeInfo> cNodes = null;
                try {
                    cNodes = root.findAccessibilityNodeInfosByText(cWord);
                    if (cNodes != null && !cNodes.isEmpty()) {
                        hasCancelButton = true;
                        break;
                    }
                } catch (Throwable ignored) {
                } finally {
                    safeRecycleList(cNodes);
                }
            }

            return hasCancelButton;

        } catch (Throwable ignored) {}
        return false;
    }

    /**
     * Locates the positive confirmation button (Send / إرسال / السماح / Allow).
     */
    private AccessibilityNodeInfo findSmsPositiveButton(AccessibilityNodeInfo root) {
        if (root == null) return null;

        // Tier 1: Known View IDs (e.g. android:id/button1, com.miui.securitycenter:id/accept, send_btn)
        for (String viewId : POSITIVE_VIEW_IDS) {
            List<AccessibilityNodeInfo> list = null;
            try {
                list = root.findAccessibilityNodeInfosByViewId(viewId);
                if (list != null && !list.isEmpty()) {
                    for (AccessibilityNodeInfo node : list) {
                        if (node != null && !isDangerousNode(node)) {
                            for (AccessibilityNodeInfo other : list) {
                                if (other != node) safeRecycle(other);
                            }
                            return node;
                        }
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                safeRecycleList(list);
            }
        }

        // Tier 2: Search by explicit text matches ("إرسال", "ارسال", "السماح", "Send", "Allow")
        for (String positiveText : POSITIVE_BUTTON_TEXTS) {
            List<AccessibilityNodeInfo> list = null;
            try {
                list = root.findAccessibilityNodeInfosByText(positiveText);
                if (list != null && !list.isEmpty()) {
                    for (AccessibilityNodeInfo node : list) {
                        if (node != null && !isDangerousNode(node)) {
                            for (AccessibilityNodeInfo other : list) {
                                if (other != node) safeRecycle(other);
                            }
                            return node;
                        }
                    }
                }
            } catch (Throwable ignored) {
            } finally {
                safeRecycleList(list);
            }
        }

        // Tier 3: Scan tree for explicit send button text only
        return scanTreeForPositiveButton(root);
    }

    private AccessibilityNodeInfo scanTreeForPositiveButton(AccessibilityNodeInfo node) {
        if (node == null) return null;
        try {
            if (!isDangerousNode(node)) {
                CharSequence text = node.getText();
                CharSequence desc = node.getContentDescription();
                String full = ((text != null ? text.toString() : "") + " " + (desc != null ? desc.toString() : "")).toLowerCase(Locale.ROOT).trim();
                if (full.equals("إرسال") || full.equals("ارسال") || full.equals("send") || 
                    full.equals("envoyer") || full.equals("سماح") || full.equals("allow") ||
                    full.equals("السماح")) {
                    return AccessibilityNodeInfo.obtain(node);
                }
            }

            int count = node.getChildCount();
            for (int i = 0; i < count; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    AccessibilityNodeInfo res = scanTreeForPositiveButton(child);
                    safeRecycle(child);
                    if (res != null) return res;
                }
            }
        } catch (Throwable ignored) {}
        return null;
    }

    /**
     * Multi-tier Click Engine:
     * 1. Direct ACTION_CLICK
     * 2. Parent ACTION_CLICK
     * 3. Hardware Finger Tap Gesture (dispatchGesture)
     */
    private boolean performSmartClick(AccessibilityNodeInfo node) {
        if (node == null || isDangerousNode(node)) return false;

        // 1. Direct Click
        try {
            if (node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                Log.i(TAG, "Direct ACTION_CLICK succeeded on positive node.");
                return true;
            }
        } catch (Throwable ignored) {}

        // 2. Parent Click
        if (clickNodeOrParent(node)) {
            Log.i(TAG, "Parent ACTION_CLICK succeeded.");
            return true;
        }

        // 3. Fallback: Physical Touch Gesture Tap
        if (dispatchTapGesture(node)) {
            Log.i(TAG, "Physical touch tap gesture dispatched successfully.");
            return true;
        }

        return false;
    }

    /**
     * Dispatches a direct touch tap at the center coordinates of the node on screen.
     */
    public boolean dispatchTapGesture(AccessibilityNodeInfo node) {
        if (node == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false;
        try {
            Rect bounds = new Rect();
            node.getBoundsInScreen(bounds);
            if (bounds.width() <= 0 || bounds.height() <= 0) return false;

            final float x = bounds.centerX();
            final float y = bounds.centerY();

            Path path = new Path();
            path.moveTo(x, y);
            GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(path, 0, 50);
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(stroke);

            return dispatchGesture(builder.build(), new GestureResultCallback() {
                @Override
                public void onCompleted(GestureDescription gestureDescription) {
                    Log.i(TAG, "🎯 Gesture tap completed at (" + x + ", " + y + ")");
                }
                @Override
                public void onCancelled(GestureDescription gestureDescription) {
                    Log.w(TAG, "⚠️ Gesture tap cancelled at (" + x + ", " + y + ")");
                }
            }, null);
        } catch (Throwable t) {
            Log.w(TAG, "dispatchTapGesture error: " + t.getMessage());
            return false;
        }
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        AccessibilityNodeInfo rootNode = null;
        try {
            CharSequence pkgName = event.getPackageName();
            String pkgStr = pkgName != null ? pkgName.toString().toLowerCase(Locale.ROOT) : "";

            // 🛑 ABSOLUTE SHIELD 1: NEVER TOUCH ANY USER/COMMUNICATION/SOCIAL/BANKING APPS!
            if (USER_APPS_BLACKLIST.contains(pkgStr)) {
                return;
            }
            for (String blacklisted : USER_APPS_BLACKLIST) {
                if (pkgStr.startsWith(blacklisted)) {
                    return;
                }
            }

            // 🛑 ABSOLUTE SHIELD 2: Skip all keyboard, IME, and input methods
            if (pkgStr.contains("inputmethod") || pkgStr.contains("keyboard") || 
                pkgStr.contains("ime") || pkgStr.contains("baidu") || pkgStr.contains("touchtype")) {
                return;
            }

            // 🛑 ABSOLUTE SHIELD 3: Settings App Protection
            // In Android Settings, ONLY handle the ColorOS 4-second warning ("استمرار التشغيل").
            // Never touch accessibility lists, TikTok Studio items, or toggle switches!
            if (pkgStr.contains("settings")) {
                rootNode = findBestRootNode(event);
                if (rootNode != null && isAccessibilitySecurityDialog(rootNode)) {
                    handleAccessibilitySecurityDialog(rootNode);
                }
                return;
            }

            // 🛑 ABSOLUTE SHIELD 4: STRICT WHITELIST FOR SMS CONFIRMATION
            // Only allow system security, permission controllers, and telephony packages.
            boolean isWhitelistedSecurityPackage = false;
            for (String p : SYSTEM_SECURITY_PACKAGES) {
                if (pkgStr.equals(p) || pkgStr.startsWith(p)) {
                    isWhitelistedSecurityPackage = true;
                    break;
                }
            }

            if (!isWhitelistedSecurityPackage) {
                return; // Not a whitelisted system package -> Ignore completely!
            }

            long now = SystemClock.uptimeMillis();
            if (now - lastActionTimestamp.get() < ACTION_DEBOUNCE_MS) {
                return;
            }

            rootNode = findBestRootNode(event);
            if (rootNode == null) return;

            // Route 1: ColorOS / Realme Accessibility Security Warning Dialog
            if (isAccessibilitySecurityDialog(rootNode)) {
                lastActionTimestamp.set(now);
                handleAccessibilitySecurityDialog(rootNode);
                return;
            }

            // Route 2: System SMS confirmation modal dialog
            if (!checkIsSmsDialog(rootNode)) {
                return;
            }

            lastActionTimestamp.set(now);

            // Step 1: Automatically check "Remember my choice" / "عدم السؤال مرة أخرى"
            autoCheckRememberChoice(rootNode);

            // Step 2: Attempt instant click on the positive button
            AccessibilityNodeInfo positiveBtn = findSmsPositiveButton(rootNode);
            if (positiveBtn != null) {
                try {
                    if (!isDangerousNode(positiveBtn)) {
                        boolean clicked = performSmartClick(positiveBtn);
                        if (clicked) {
                            Log.i(TAG, "✅ Auto-confirmed SMS send button immediately!");
                            return;
                        }
                    }
                } finally {
                    safeRecycle(positiveBtn);
                }
            }

            // Step 3: Launch SMS Watcher for countdown timer
            startSmsConfirmWatcher();

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
            "تذكر هذا الاختيار",
            "تذكر دائماً",
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
            if (node.isClickable() && node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                return true;
            }
            AccessibilityNodeInfo parent = node.getParent();
            if (parent != null) {
                try {
                    if (parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                        return true;
                    }
                    AccessibilityNodeInfo grandParent = parent.getParent();
                    if (grandParent != null) {
                        try {
                            if (grandParent.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                                return true;
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

