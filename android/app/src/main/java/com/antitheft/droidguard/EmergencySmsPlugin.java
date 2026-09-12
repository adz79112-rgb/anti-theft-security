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
 */
@CapacitorPlugin(
    name = "EmergencySmsPlugin",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.SEND_SMS }
        )
    }
)
public class EmergencySmsPlugin extends Plugin {

    @PluginMethod
    public void checkSmsPermission(PluginCall call) {
        boolean granted = ActivityCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestSmsPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("sms", call, "smsPermissionCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        boolean granted = ActivityCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void sendDirectSms(final PluginCall call) {
        final Context context = getContext();

        // 1. Verify SEND_SMS permission
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("confirmedBySmsManager", false);
            ret.put("error", "SEND_SMS permission has not been granted by the user.");
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

        final String phoneNumber = rawPhone.trim();
        final String message = rawMessage.trim();

        // 2. Select appropriate SmsManager (with Dual-SIM subscription support if available)
        SmsManager smsManager = null;
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
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    smsManager = context.getSystemService(SmsManager.class).createForSubscriptionId(subId);
                                } else {
                                    smsManager = SmsManager.getSmsManagerForSubscriptionId(subId);
                                }
                                break;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        if (smsManager == null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = context.getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }
        }

        if (smsManager == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("confirmedBySmsManager", false);
            ret.put("error", "Android SmsManager service is unavailable on this device.");
            call.resolve(ret);
            return;
        }

        // 3. Divide message into standard SMS segments
        ArrayList<String> parts;
        try {
            parts = smsManager.divideMessage(message);
        } catch (Exception e) {
            parts = new ArrayList<>();
            parts.add(message);
        }
        final int totalParts = (parts != null && !parts.isEmpty()) ? parts.size() : 1;

        // 4. Create single-shot PendingIntent with unique Action to capture radio confirmation
        final String actionSent = "com.antitheft.droidguard.SMS_SENT_" + UUID.randomUUID().toString();
        Intent sentIntent = new Intent(actionSent);
        sentIntent.setPackage(context.getPackageName());

        int pendingFlags = PendingIntent.FLAG_ONE_SHOT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent sentPendingIntent = PendingIntent.getBroadcast(
            context,
            (int) (System.currentTimeMillis() & 0xfffffff),
            sentIntent,
            pendingFlags
        );

        final ArrayList<PendingIntent> sentIntents = new ArrayList<>();
        for (int i = 0; i < totalParts; i++) {
            sentIntents.add(sentPendingIntent);
        }

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
                        ret.put("recipient", phoneNumber);
                        ret.put("slotUsed", slot != null ? slot : 1);
                        ret.put("message", "Direct background SMS successfully transmitted by native SmsManager.");
                        call.resolve(ret);
                    } else {
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
                        ret.put("recipient", phoneNumber);
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
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("confirmedBySmsManager", false);
            ret.put("error", "Failed to register SMS sent receiver: " + regErr.getMessage());
            call.resolve(ret);
            return;
        }

        // Timeout fallback after 15 seconds
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (resolved.compareAndSet(false, true)) {
                    try {
                        context.unregisterReceiver(sentReceiver);
                    } catch (Exception ignored) {}

                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("confirmedBySmsManager", false);
                    ret.put("error", "SmsManager confirmation timed out (cellular network did not confirm within 15 seconds).");
                    call.resolve(ret);
                }
            }
        }, 15000);

        // 6. Direct silent transmission without opening any UI
        try {
            if (parts != null && parts.size() > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, sentPendingIntent, null);
            }
        } catch (Exception sendErr) {
            if (resolved.compareAndSet(false, true)) {
                try {
                    context.unregisterReceiver(sentReceiver);
                } catch (Exception ignored) {}

                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("confirmedBySmsManager", false);
                ret.put("error", "Exception during direct SMS dispatch: " + sendErr.getMessage());
                call.resolve(ret);
            }
        }
    }
}
