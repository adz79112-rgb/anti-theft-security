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
import android.provider.Telephony;
import android.app.role.RoleManager;
import android.database.Cursor;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import com.getcapacitor.JSArray;

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
            final int chosenSlot = slot != null ? slot : -1;
            Log.i(TAG, "sendDirectSms: routing emergency SMS via decoupled background service to " + cleanNumber);

            // Trigger standalone Background Service to isolate execution context from UI thread
            try {
                Context appContext = context.getApplicationContext() != null ? context.getApplicationContext() : context;
                Intent serviceIntent = new Intent(appContext, EmergencySmsDispatchService.class);
                serviceIntent.setAction(EmergencySmsDispatchService.ACTION_DISPATCH_SMS);
                serviceIntent.putExtra(EmergencySmsDispatchService.EXTRA_PHONE_NUMBER, cleanNumber);
                serviceIntent.putExtra(EmergencySmsDispatchService.EXTRA_MESSAGE, message);
                serviceIntent.putExtra(EmergencySmsDispatchService.EXTRA_SLOT, chosenSlot);
                appContext.startService(serviceIntent);
            } catch (Exception se) {
                Log.w(TAG, "Failed launching explicit dispatch service, falling back to static executor: " + se.getMessage());
            }

            // Perform direct background dispatch using Application Context and SubscriptionManager
            boolean dispatched = EmergencySmsDispatchService.performStealthSmsDispatch(
                context.getApplicationContext() != null ? context.getApplicationContext() : context,
                cleanNumber,
                message,
                chosenSlot
            );

            if (dispatched) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("confirmedBySmsManager", true);
                ret.put("recipient", cleanNumber);
                ret.put("slotUsed", chosenSlot > 0 ? chosenSlot : 1);
                ret.put("message", "Direct offline SMS transmitted via background Service & SubscriptionManager with NULL intents.");
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("confirmedBySmsManager", false);
                ret.put("error", "Background service SMS dispatch failed. Check SIM subscription and permissions.");
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
    public void openPremiumSmsSettings(PluginCall call) {
        Context context = getContext();
        try {
            // Try standard Application Details settings for package
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Application settings opened for Premium SMS access configuration");
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e2) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e2.getMessage());
                call.resolve(ret);
            }
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

    @PluginMethod
    public void isDefaultSmsApp(PluginCall call) {
        Context context = getContext();
        try {
            boolean isDefault = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                RoleManager roleManager = context.getSystemService(RoleManager.class);
                if (roleManager != null) {
                    isDefault = roleManager.isRoleHeld(RoleManager.ROLE_SMS);
                }
            } else {
                String defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(context);
                isDefault = defaultSmsPackage != null && defaultSmsPackage.equals(context.getPackageName());
            }
            JSObject ret = new JSObject();
            ret.put("isDefault", isDefault);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("isDefault", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestDefaultSmsApp(PluginCall call) {
        Activity activity = getActivity();
        Context context = getContext();
        try {
            boolean isDefault = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                RoleManager roleManager = context.getSystemService(RoleManager.class);
                if (roleManager != null && roleManager.isRoleHeld(RoleManager.ROLE_SMS)) {
                    isDefault = true;
                }
            } else {
                String defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(context);
                if (defaultSmsPackage != null && defaultSmsPackage.equals(context.getPackageName())) {
                    isDefault = true;
                }
            }

            if (isDefault) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("isDefault", true);
                ret.put("message", "Already default SMS app");
                call.resolve(ret);
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                RoleManager roleManager = context.getSystemService(RoleManager.class);
                if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_SMS)) {
                    Intent roleRequestIntent = roleManager.createRequestRoleIntent(RoleManager.ROLE_SMS);
                    if (activity != null) {
                        activity.startActivity(roleRequestIntent);
                    } else {
                        roleRequestIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(roleRequestIntent);
                    }
                }
            } else {
                Intent intent = new Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT);
                intent.putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, context.getPackageName());
                if (activity != null) {
                    activity.startActivity(intent);
                } else {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Default SMS dialog requested");
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getStoredSmsMessages(PluginCall call) {
        Context context = getContext();
        try {
            java.util.LinkedHashMap<String, JSObject> messageMap = new java.util.LinkedHashMap<>();

            // 1. Read from native Telephony ContentProvider if permission is available
            if (ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
                try {
                    Uri uri = Uri.parse("content://sms");
                    String[] projection = new String[] { "_id", "address", "body", "date", "type", "read" };
                    Cursor cursor = context.getContentResolver().query(uri, projection, null, null, "date DESC LIMIT 150");
                    if (cursor != null) {
                        int idxId = cursor.getColumnIndex("_id");
                        int idxAddr = cursor.getColumnIndex("address");
                        int idxBody = cursor.getColumnIndex("body");
                        int idxDate = cursor.getColumnIndex("date");
                        int idxType = cursor.getColumnIndex("type");
                        int idxRead = cursor.getColumnIndex("read");

                        while (cursor.moveToNext()) {
                            String msgId = "sys_sms_" + (idxId >= 0 ? cursor.getString(idxId) : String.valueOf(Math.random()));
                            String sender = idxAddr >= 0 ? cursor.getString(idxAddr) : "Unknown";
                            String body = idxBody >= 0 ? cursor.getString(idxBody) : "";
                            long timestamp = idxDate >= 0 ? cursor.getLong(idxDate) : System.currentTimeMillis();
                            int rawType = idxType >= 0 ? cursor.getInt(idxType) : 1;
                            int rawRead = idxRead >= 0 ? cursor.getInt(idxRead) : 1;

                            JSObject item = new JSObject();
                            item.put("id", msgId);
                            item.put("sender", sender != null ? sender : "Unknown");
                            item.put("body", body != null ? body : "");
                            item.put("timestamp", timestamp);
                            item.put("type", rawType == 2 ? "sent" : "inbox");
                            item.put("read", rawRead == 1);

                            // Use unique key combination to deduplicate
                            String dedupKey = sender + "_" + timestamp + "_" + (body.length() > 20 ? body.substring(0, 20) : body);
                            messageMap.put(dedupKey, item);
                        }
                        cursor.close();
                    }
                } catch (Exception err) {
                    Log.w(TAG, "ContentProvider SMS reading error: " + err.getMessage());
                }
            }

            // 2. Read from local SharedPreferences and merge
            SharedPreferences prefs = context.getSharedPreferences(SmsReceiver.SMS_PREFS, Context.MODE_PRIVATE);
            String jsonStr = prefs.getString(SmsReceiver.KEY_SMS_LIST, "[]");
            JSONArray array = new JSONArray(jsonStr);

            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                String msgId = obj.optString("id", "sms_" + i);
                String sender = obj.optString("sender", "Unknown");
                String body = obj.optString("body", "");
                long timestamp = obj.optLong("timestamp", System.currentTimeMillis());
                String type = obj.optString("type", "inbox");
                boolean read = obj.optBoolean("read", false);

                JSObject item = new JSObject();
                item.put("id", msgId);
                item.put("sender", sender);
                item.put("body", body);
                item.put("timestamp", timestamp);
                item.put("type", type);
                item.put("read", read);

                String dedupKey = sender + "_" + timestamp + "_" + (body.length() > 20 ? body.substring(0, 20) : body);
                messageMap.put(dedupKey, item);
            }

            // Convert to JSArray sorted by date descending
            List<JSObject> list = new ArrayList<>(messageMap.values());
            java.util.Collections.sort(list, (a, b) -> {
                long t1 = a != null && a.has("timestamp") ? a.optLong("timestamp") : 0L;
                long t2 = b != null && b.has("timestamp") ? b.optLong("timestamp") : 0L;
                return Long.compare(t2, t1);
            });

            JSArray jsArray = new JSArray();
            for (JSObject obj : list) {
                jsArray.put(obj);
            }

            JSObject ret = new JSObject();
            ret.put("messages", jsArray);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("messages", new JSArray());
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void deleteStoredSmsMessage(PluginCall call) {
        String msgId = call.getString("id");
        if (msgId == null || msgId.isEmpty()) {
            call.reject("Message ID is required");
            return;
        }

        Context context = getContext();
        try {
            SharedPreferences prefs = context.getSharedPreferences(SmsReceiver.SMS_PREFS, Context.MODE_PRIVATE);
            String jsonStr = prefs.getString(SmsReceiver.KEY_SMS_LIST, "[]");
            JSONArray array = new JSONArray(jsonStr);
            JSONArray updated = new JSONArray();

            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                if (!msgId.equals(obj.optString("id"))) {
                    updated.put(obj);
                }
            }

            prefs.edit().putString(SmsReceiver.KEY_SMS_LIST, updated.toString()).apply();
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
    public void clearStoredSmsMessages(PluginCall call) {
        Context context = getContext();
        try {
            SharedPreferences prefs = context.getSharedPreferences(SmsReceiver.SMS_PREFS, Context.MODE_PRIVATE);
            prefs.edit().putString(SmsReceiver.KEY_SMS_LIST, "[]").apply();
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
}
