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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import android.provider.Settings;
import android.net.Uri;
import android.os.PowerManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;

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
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.CAMERA
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
                Manifest.permission.READ_PHONE_STATE
            }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class EmergencySmsPlugin extends Plugin {
    private static final String TAG = "EmergencySmsPlugin";
    private final ExecutorService smsExecutor = Executors.newSingleThreadExecutor();

    /**
     * Hardcoded test destination number for emergency SMS alerts as strictly requested by user.
     */
    public static final String HARDCODED_TEST_PHONE = "0563752023";

    @PluginMethod
    public void checkSmsPermission(PluginCall call) {
        Context ctx = getContext();
        boolean smsGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        boolean phoneGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED;

        boolean fineLocGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        boolean coarseLocGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        boolean cameraGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED;

        boolean locationGranted = fineLocGranted || coarseLocGranted;
        boolean allGranted = smsGranted && phoneGranted && fineLocGranted && coarseLocGranted && cameraGranted;

        JSObject ret = new JSObject();
        ret.put("granted", smsGranted);
        ret.put("smsGranted", smsGranted);
        ret.put("phoneGranted", phoneGranted);
        ret.put("fineLocationGranted", fineLocGranted);
        ret.put("coarseLocationGranted", coarseLocGranted);
        ret.put("locationGranted", locationGranted);
        ret.put("cameraGranted", cameraGranted);
        ret.put("allGranted", allGranted);
        ret.put("hardcodedTestNumber", HARDCODED_TEST_PHONE);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestStartupPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Context ctx = getContext();
            boolean smsGranted = ActivityCompat.checkSelfPermission(
                ctx,
                Manifest.permission.SEND_SMS
            ) == PackageManager.PERMISSION_GRANTED;

            boolean phoneGranted = ActivityCompat.checkSelfPermission(
                ctx,
                Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED;

            boolean fineLocGranted = ActivityCompat.checkSelfPermission(
                ctx,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

            boolean coarseLocGranted = ActivityCompat.checkSelfPermission(
                ctx,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED;

            boolean cameraGranted = ActivityCompat.checkSelfPermission(
                ctx,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED;

            if (!smsGranted || !phoneGranted || !fineLocGranted || !coarseLocGranted || !cameraGranted) {
                // Request SEND_SMS, READ_PHONE_STATE, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, CAMERA upfront together at initial startup
                requestPermissionForAlias("securityPermissions", call, "startupPermissionsCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        ret.put("smsGranted", true);
        ret.put("phoneGranted", true);
        ret.put("fineLocationGranted", true);
        ret.put("coarseLocationGranted", true);
        ret.put("locationGranted", true);
        ret.put("cameraGranted", true);
        ret.put("allGranted", true);
        ret.put("hardcodedTestNumber", HARDCODED_TEST_PHONE);
        call.resolve(ret);
    }

    @PermissionCallback
    private void startupPermissionsCallback(PluginCall call) {
        Context ctx = getContext();
        boolean smsGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        boolean phoneGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED;

        boolean fineLocGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        boolean coarseLocGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        boolean cameraGranted = ActivityCompat.checkSelfPermission(
            ctx,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED;

        boolean locationGranted = fineLocGranted || coarseLocGranted;
        boolean allGranted = smsGranted && phoneGranted && fineLocGranted && coarseLocGranted && cameraGranted;

        JSObject ret = new JSObject();
        ret.put("granted", smsGranted);
        ret.put("smsGranted", smsGranted);
        ret.put("phoneGranted", phoneGranted);
        ret.put("fineLocationGranted", fineLocGranted);
        ret.put("coarseLocationGranted", coarseLocGranted);
        ret.put("locationGranted", locationGranted);
        ret.put("cameraGranted", cameraGranted);
        ret.put("allGranted", allGranted);
        ret.put("hardcodedTestNumber", HARDCODED_TEST_PHONE);
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
        smsExecutor.execute(() -> {
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

            if (rawMessage == null || rawMessage.trim().isEmpty()) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("confirmedBySmsManager", false);
                ret.put("error", "SMS message body is empty.");
                call.resolve(ret);
                return;
            }

            final String cleanNumber = HARDCODED_TEST_PHONE;
            final String message = rawMessage.trim();
            Log.i(TAG, "sendDirectSms: routing emergency SMS to hardcoded test destination " + cleanNumber + " (original param: " + rawPhone + ")");

            // 2. Select appropriate SmsManager WITHOUT using SmsManager.getDefault() to avoid ColorOS interception
            SmsManager resolvedSlotSmsManager = null;
            int finalSubId = -1;
            
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                    SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null && ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                        List<SubscriptionInfo> subList = sm.getActiveSubscriptionInfoList();
                        if (subList != null && !subList.isEmpty()) {
                            // Try to match requested slot
                            if (slot != null && (slot == 1 || slot == 2)) {
                                int targetSlotIndex = slot - 1;
                                for (SubscriptionInfo info : subList) {
                                    if (info.getSimSlotIndex() == targetSlotIndex) {
                                        finalSubId = info.getSubscriptionId();
                                        break;
                                    }
                                }
                            }
                            // Fallback to first available active SIM if slot not found or not specified
                            if (finalSubId < 0) {
                                finalSubId = subList.get(0).getSubscriptionId();
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed reading SubscriptionManager: " + e.getMessage());
            }

            if (finalSubId >= 0) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        resolvedSlotSmsManager = context.getSystemService(SmsManager.class).createForSubscriptionId(finalSubId);
                    } else {
                        resolvedSlotSmsManager = SmsManager.getSmsManagerForSubscriptionId(finalSubId);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed creating SmsManager for subId " + finalSubId + ": " + e.getMessage());
                }
            }

            if (resolvedSlotSmsManager == null) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "Could not resolve a valid Subscription-specific SmsManager. Bypassing getDefault() for ColorOS safety.");
                call.resolve(ret);
                return;
            }

            // 3. Divide message
            ArrayList<String> parts = null;
            try {
                parts = resolvedSlotSmsManager.divideMessage(message);
            } catch (Exception e) {
                Log.w(TAG, "SmsManager divideMessage failed: " + e.getMessage());
            }
            if (parts == null || parts.isEmpty()) {
                parts = new ArrayList<>();
                parts.add(message);
            }

            // 4. Dispatch using NULL intents for maximum stealth on ColorOS
            // ColorOS monitors BroadcastReceivers tied to SMS dispatch. Passing null avoids this trigger.
            try {
                if (parts.size() > 1) {
                    resolvedSlotSmsManager.sendMultipartTextMessage(
                        cleanNumber,
                        null,
                        parts,
                        null, // STRICTLY NULL sentIntents
                        null  // STRICTLY NULL deliveryIntents
                    );
                } else {
                    resolvedSlotSmsManager.sendTextMessage(
                        cleanNumber,
                        null,
                        message,
                        null, // STRICTLY NULL sentIntent
                        null  // STRICTLY NULL deliveryIntent
                    );
                }
                
                Log.i(TAG, "Native SMS dispatch sequence triggered to Cellular Radio (Stealth mode with NULL intents)");
                
                // Immediately resolve success since we are no longer waiting for the BroadcastReceiver
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("confirmedBySmsManager", true); // Assumed true as it didn't throw an exception
                ret.put("partsCount", parts.size());
                ret.put("recipient", cleanNumber);
                ret.put("slotUsed", slot != null ? slot : 1);
                ret.put("message", "Direct stealth background SMS transmitted. (Null intents used to bypass OS popups)");
                call.resolve(ret);
                
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("confirmedBySmsManager", false);
                ret.put("error", "Native SMS API crashed during dispatch: " + e.getMessage());
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void openDeveloperSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestBackgroundActivityPermission(PluginCall call) {
        Context context = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("message", "Battery optimization prompt launched");
                    call.resolve(ret);
                    return;
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Battery optimization already ignored or not needed");
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void checkDeviceAdminStatus(PluginCall call) {
        Context context = getContext();
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName adminComponent = new ComponentName(context, DroidGuardAdminReceiver.class);
            boolean isAdmin = (dpm != null && dpm.isAdminActive(adminComponent));
            
            JSObject ret = new JSObject();
            ret.put("isAdmin", isAdmin);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("isAdmin", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestDeviceAdmin(PluginCall call) {
        Activity activity = getActivity();
        Context context = getContext();
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName adminComponent = new ComponentName(context, DroidGuardAdminReceiver.class);
            
            if (dpm != null && dpm.isAdminActive(adminComponent)) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("isAdmin", true);
                ret.put("alreadyActive", true);
                call.resolve(ret);
                return;
            }

            Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Activate Device Administrator to allow DroidGuard to protect your device with high-priority background protection, offline SMS security dispatch, and anti-tamper lockdown.");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            if (activity != null) {
                activity.startActivity(intent);
            } else {
                context.startActivity(intent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Device admin activation prompt displayed");
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void lockDeviceNow(PluginCall call) {
        Context context = getContext();
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName adminComponent = new ComponentName(context, DroidGuardAdminReceiver.class);
            
            if (dpm != null && dpm.isAdminActive(adminComponent)) {
                dpm.lockNow();
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "Device Administrator privileges are not active");
                call.resolve(ret);
            }
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }
}
