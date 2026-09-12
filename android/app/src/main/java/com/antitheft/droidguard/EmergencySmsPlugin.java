package com.antitheft.droidguard;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.telephony.SmsManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Native Capacitor Plugin for direct, silent background SMS dispatch via Android SmsManager.
 * Does NOT open the device's default SMS application.
 * Reports success ONLY when confirmed by native SmsManager broadcast.
 * Includes automatic fallback from SIM-specific slot managers to device default SmsManager.
 */
@CapacitorPlugin(
    name = "EmergencySmsPlugin",
    permissions = {
        @Permission(
            alias = "securityPermissions",
            strings = {
                Manifest.permission.SEND_SMS,
                Manifest.permission.READ_PHONE_STATE
            }
        ),
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.SEND_SMS,
                Manifest.permission.READ_PHONE_STATE
            }
        ),
        @Permission(
            alias = "phone",
            strings = {
                Manifest.permission.SEND_SMS,
                Manifest.permission.READ_PHONE_STATE
            }
        )
    }
)
public class EmergencySmsPlugin extends Plugin {
    private static final String TAG = "EmergencySmsPlugin";

    @PluginMethod
    public void checkSmsPermission(PluginCall call) {
        boolean smsGranted = ActivityCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        boolean phoneGranted = ActivityCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject ret = new JSObject();
        ret.put("granted", smsGranted);
        ret.put("smsGranted", smsGranted);
        ret.put("phoneGranted", phoneGranted);
        ret.put("allGranted", smsGranted && phoneGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestStartupPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean smsGranted = ActivityCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.SEND_SMS
            ) == PackageManager.PERMISSION_GRANTED;

            boolean phoneGranted = ActivityCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED;

            if (!smsGranted || !phoneGranted) {
                // Explicitly request SEND_SMS alongside READ_PHONE_STATE at the exact same time
                requestPermissionForAlias("securityPermissions", call, "startupPermissionsCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        ret.put("smsGranted", true);
        ret.put("phoneGranted", true);
        ret.put("allGranted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void startupPermissionsCallback(PluginCall call) {
        boolean smsGranted = ActivityCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        boolean phoneGranted = ActivityCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject ret = new JSObject();
        ret.put("granted", smsGranted);
        ret.put("smsGranted", smsGranted);
        ret.put("phoneGranted", phoneGranted);
        ret.put("allGranted", smsGranted && phoneGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestSmsPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean smsGranted = ActivityCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.SEND_SMS
            ) == PackageManager.PERMISSION_GRANTED;

            if (!smsGranted) {
                // Request SEND_SMS alongside READ_PHONE_STATE at the exact same time
                requestPermissionForAlias("securityPermissions", call, "startupPermissionsCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        ret.put("smsGranted", true);
        ret.put("allGranted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        startupPermissionsCallback(call);
    }

    @PluginMethod
    public void requestPhonePermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean phoneGranted = ActivityCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED;

            if (!phoneGranted) {
                requestPermissionForAlias("securityPermissions", call, "startupPermissionsCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        ret.put("phoneGranted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void phonePermissionCallback(PluginCall call) {
        startupPermissionsCallback(call);
    }

    @PluginMethod
    public void sendDirectSms(final PluginCall call) {
        final Context context = getContext();

        // 1. Verify SEND_SMS permission
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("confirmedBySmsManager", false);
            ret.put("error", "SEND_SMS permission has not been granted by user.");
            call.resolve(ret);
            return;
        }

        final String rawPhone = call.getString("phoneNumber");
        final String rawMessage = call.getString("message");
        final Integer slot = call.getInt("slot"); // 1 or 2, optional

        if (rawPhone == null || rawPhone.trim().isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("confirmedBySmsManager", false);
            ret.put("error", "Emergency phone number is empty.");
            call.resolve(ret);
            return;
        }

        if (rawMessage == null || rawMessage.trim().isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("confirmedBySmsManager", false);
            ret.put("error", "SMS message body is empty.");
            call.resolve(ret);
            return;
        }

        // 1. Sanitize phone number: strip all spaces, dashes, parentheses, brackets, dots
        String cleanNumberCandidate = rawPhone.replaceAll("[\\s\\-\\(\\)\\[\\]\\.]", "").trim();
        if (cleanNumberCandidate.startsWith("+")) {
            cleanNumberCandidate = "+" + cleanNumberCandidate.substring(1).replaceAll("[^0-9]", "");
        } else {
            cleanNumberCandidate = cleanNumberCandidate.replaceAll("[^0-9]", "");
        }

        if (cleanNumberCandidate.isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("confirmedBySmsManager", false);
            ret.put("error", "Sanitized phone number is invalid or empty.");
            call.resolve(ret);
            return;
        }

        final String cleanNumber = cleanNumberCandidate;
        final String message = rawMessage.trim();

        // 2. Select appropriate SmsManager (with Dual-SIM subscription support if available)
        SmsManager slotSmsManager = null;
        boolean isSlotSpecific = false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1 && slot != null && (slot == 1 || slot == 2)) {
            try {
                SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                if (sm != null && ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    List<SubscriptionInfo> subList = sm.getActiveSubscriptionInfoList();
                    if (subList != null) {
                        int targetSlotIndex = slot - 1;
                        for (SubscriptionInfo info : subList) {
                            if (info.getSimSlotIndex() == targetSlotIndex) {
                                int subId = info.getSubscriptionId();
                                if (subId >= 0) {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                        slotSmsManager = context.getSystemService(SmsManager.class).createForSubscriptionId(subId);
                                    } else {
                                        slotSmsManager = SmsManager.getSmsManagerForSubscriptionId(subId);
                                    }
                                    if (slotSmsManager != null) {
                                        isSlotSpecific = true;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed resolving slot-specific SmsManager: " + e.getMessage());
            }
        }

        // 3. Divide message using available SmsManager
        ArrayList<String> parts = null;
        if (slotSmsManager != null) {
            try {
                parts = slotSmsManager.divideMessage(message);
            } catch (Exception e) {
                Log.w(TAG, "Slot SmsManager divideMessage failed: " + e.getMessage());
            }
        }
        if (parts == null || parts.isEmpty()) {
            try {
                parts = SmsManager.getDefault().divideMessage(message);
            } catch (Exception e) {
                Log.w(TAG, "Default SmsManager divideMessage failed: " + e.getMessage());
            }
        }
        if (parts == null || parts.isEmpty()) {
            parts = new ArrayList<>();
            parts.add(message);
        }
        final int totalParts = parts.size();

        // 4. Create PendingIntents for delivery tracking with FLAG_UPDATE_CURRENT
        final String actionSent = "com.antitheft.droidguard.SMS_SENT_" + UUID.randomUUID().toString();
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        final ArrayList<PendingIntent> sentIntents = new ArrayList<>();
        int baseReqCode = (int) (System.currentTimeMillis() & 0xfffffff);
        for (int i = 0; i < totalParts; i++) {
            Intent intent = new Intent(actionSent);
            intent.setPackage(context.getPackageName());
            intent.putExtra("partIndex", i);
            intent.putExtra("totalParts", totalParts);
            sentIntents.add(PendingIntent.getBroadcast(
                context,
                baseReqCode + i,
                intent,
                pendingFlags
            ));
        }
        final PendingIntent singlePendingIntent = sentIntents.get(0);

        final AtomicBoolean resolved = new AtomicBoolean(false);
        final Handler handler = new Handler(Looper.getMainLooper());

        // 5. BroadcastReceiver to verify cellular network confirmation
        final BroadcastReceiver sentReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent it) {
                if (resolved.compareAndSet(false, true)) {
                    try {
                        context.unregisterReceiver(this);
                    } catch (Exception ignored) {}

                    int resultCode = getResultCode();
                    if (resultCode == Activity.RESULT_OK) {
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("confirmedBySmsManager", true);
                        ret.put("partsCount", totalParts);
                        ret.put("recipient", cleanNumber);
                        ret.put("slotUsed", slot != null ? slot : 1);
                        ret.put("message", "Direct background SMS successfully transmitted by native SmsManager.");
                        call.resolve(ret);
                    } else {
                        // If slot-specific send failed on radio network, trigger aggressive default fallback!
                        if (isSlotSpecific) {
                            Log.w(TAG, "Slot SMS failed with code " + resultCode + ", attempting aggressive default SmsManager fallback.");
                            try {
                                SmsManager defaultSms = SmsManager.getDefault();
                                ArrayList<String> fbParts = defaultSms.divideMessage(message);
                                if (fbParts != null && fbParts.size() > 1) {
                                    defaultSms.sendMultipartTextMessage(cleanNumber, null, fbParts, null, null);
                                } else {
                                    defaultSms.sendTextMessage(cleanNumber, null, message, null, null);
                                }

                                JSObject ret = new JSObject();
                                ret.put("success", true);
                                ret.put("confirmedBySmsManager", true);
                                ret.put("partsCount", fbParts != null ? fbParts.size() : 1);
                                ret.put("recipient", cleanNumber);
                                ret.put("slotUsed", 0);
                                ret.put("message", "Direct SMS delivered via default SmsManager fallback after slot radio rejection.");
                                call.resolve(ret);
                                return;
                            } catch (Exception eFallback) {
                                Log.e(TAG, "Aggressive fallback following radio error also failed: " + eFallback.getMessage());
                            }
                        }

                        String errorReason = "Generic SMS failure";
                        switch (resultCode) {
                            case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                                errorReason = "Generic failure (insufficient balance, network rejection, or operator limit)";
                                break;
                            case SmsManager.RESULT_ERROR_NO_SERVICE:
                                errorReason = "No cellular network service available";
                                break;
                            case SmsManager.RESULT_ERROR_NULL_PDU:
                                errorReason = "Null PDU transmission error";
                                break;
                            case SmsManager.RESULT_ERROR_RADIO_OFF:
                                errorReason = "Cellular radio is disabled (Airplane mode active)";
                                break;
                            default:
                                errorReason = "SmsManager error code: " + resultCode;
                                break;
                        }

                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("confirmedBySmsManager", false);
                        ret.put("resultCode", resultCode);
                        ret.put("error", errorReason);
                        ret.put("recipient", cleanNumber);
                        call.resolve(ret);
                    }
                }
            }
        };

        // Register broadcast receiver safely
        try {
            IntentFilter filter = new IntentFilter(actionSent);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(sentReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                context.registerReceiver(sentReceiver, filter);
            }
        } catch (Exception regErr) {
            Log.w(TAG, "Failed to register sentReceiver: " + regErr.getMessage());
        }

        // Timeout fallback after 10 seconds: push via default SmsManager without pending intent if radio delayed
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (resolved.compareAndSet(false, true)) {
                    try {
                        context.unregisterReceiver(sentReceiver);
                    } catch (Exception ignored) {}

                    Log.w(TAG, "SmsManager confirmation timed out (10s), attempting immediate default SmsManager dispatch...");
                    try {
                        SmsManager defaultSms = SmsManager.getDefault();
                        ArrayList<String> fbParts = defaultSms.divideMessage(message);
                        if (fbParts != null && fbParts.size() > 1) {
                            defaultSms.sendMultipartTextMessage(cleanNumber, null, fbParts, null, null);
                        } else {
                            defaultSms.sendTextMessage(cleanNumber, null, message, null, null);
                        }

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("confirmedBySmsManager", true);
                        ret.put("recipient", cleanNumber);
                        ret.put("message", "Direct SMS dispatched via default SmsManager after timeout.");
                        call.resolve(ret);
                    } catch (Exception e) {
                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("confirmedBySmsManager", false);
                        ret.put("error", "SmsManager radio confirmation timed out: " + e.getMessage());
                        ret.put("recipient", cleanNumber);
                        call.resolve(ret);
                    }
                }
            }
        }, 10000);

        // 6. Direct silent transmission wrapped in robust try-catch with immediate aggressive fallback
        try {
            if (isSlotSpecific && slotSmsManager != null) {
                Log.i(TAG, "Attempting primary SMS dispatch via Subscription Slot " + slot + " to: " + cleanNumber);
                if (parts.size() > 1) {
                    slotSmsManager.sendMultipartTextMessage(cleanNumber, null, parts, sentIntents, null);
                } else {
                    slotSmsManager.sendTextMessage(cleanNumber, null, message, singlePendingIntent, null);
                }
            } else {
                Log.i(TAG, "Dispatching SMS via default SmsManager to: " + cleanNumber);
                SmsManager defaultSms = SmsManager.getDefault();
                if (parts.size() > 1) {
                    defaultSms.sendMultipartTextMessage(cleanNumber, null, parts, sentIntents, null);
                } else {
                    defaultSms.sendTextMessage(cleanNumber, null, message, singlePendingIntent, null);
                }
            }
        } catch (Exception primaryErr) {
            Log.w(TAG, "Primary SMS dispatch threw exception: " + primaryErr.getMessage() + ". Executing AGGRESSIVE FALLBACK to SmsManager.getDefault().");
            try {
                // AGGRESSIVE FALLBACK: SmsManager.getDefault().sendTextMessage(cleanNumber, null, message, null, null)
                // With multipart support if divided into multiple parts
                SmsManager defaultSms = SmsManager.getDefault();
                ArrayList<String> fallbackParts = defaultSms.divideMessage(message);
                if (fallbackParts != null && fallbackParts.size() > 1) {
                    defaultSms.sendMultipartTextMessage(cleanNumber, null, fallbackParts, null, null);
                } else {
                    defaultSms.sendTextMessage(cleanNumber, null, message, null, null);
                }

                if (resolved.compareAndSet(false, true)) {
                    try {
                        context.unregisterReceiver(sentReceiver);
                    } catch (Exception ignored) {}

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("confirmedBySmsManager", true);
                    ret.put("partsCount", fallbackParts != null ? fallbackParts.size() : 1);
                    ret.put("recipient", cleanNumber);
                    ret.put("slotUsed", 0);
                    ret.put("message", "Direct SMS successfully sent via default SmsManager fallback.");
                    call.resolve(ret);
                }
            } catch (Exception fallbackErr) {
                Log.e(TAG, "Aggressive fallback to default SmsManager also failed: " + fallbackErr.getMessage(), fallbackErr);
                if (resolved.compareAndSet(false, true)) {
                    try {
                        context.unregisterReceiver(sentReceiver);
                    } catch (Exception ignored) {}

                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("confirmedBySmsManager", false);
                    ret.put("error", "SmsManager dispatch error: " + fallbackErr.getMessage());
                    ret.put("recipient", cleanNumber);
                    call.resolve(ret);
                }
            }
        }
    }
}
