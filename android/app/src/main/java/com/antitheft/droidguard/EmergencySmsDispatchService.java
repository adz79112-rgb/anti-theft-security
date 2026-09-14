package com.antitheft.droidguard;

import android.app.IntentService;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.IBinder;
import android.telephony.SmsManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Standalone Background Service for decoupled offline SMS dispatch.
 * Completely detached from UI Thread / Activity Context to minimize OEM (ColorOS/MIUI)
 * foreground interception hooks and countdown popups.
 */
public class EmergencySmsDispatchService extends Service {
    private static final String TAG = "EmergencySmsService";
    public static final String ACTION_DISPATCH_SMS = "com.antitheft.droidguard.ACTION_DISPATCH_SMS";
    public static final String EXTRA_PHONE_NUMBER = "extra_phone_number";
    public static final String EXTRA_MESSAGE = "extra_message";
    public static final String EXTRA_SLOT = "extra_slot";

    private final ExecutorService backgroundExecutor = Executors.newSingleThreadExecutor();

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_DISPATCH_SMS.equals(intent.getAction())) {
            final String phoneNumber = intent.getStringExtra(EXTRA_PHONE_NUMBER);
            final String message = intent.getStringExtra(EXTRA_MESSAGE);
            final int slot = intent.getIntExtra(EXTRA_SLOT, -1);

            backgroundExecutor.execute(() -> {
                try {
                    performStealthSmsDispatch(getApplicationContext(), phoneNumber, message, slot);
                } catch (Exception e) {
                    Log.e(TAG, "Error during background service SMS dispatch: " + e.getMessage(), e);
                } finally {
                    stopSelf(startId);
                }
            });
            return START_NOT_STICKY;
        }
        stopSelf(startId);
        return START_NOT_STICKY;
    }

    /**
     * Executes direct offline SMS dispatch via SubscriptionManager and SmsManager
     * using Application Context, detached executor, and strictly null sent/delivery intents.
     */
    public static boolean performStealthSmsDispatch(Context context, String phoneNumber, String message, int slot) {
        if (context == null || phoneNumber == null || message == null || message.trim().isEmpty()) {
            Log.e(TAG, "Invalid parameters for SMS dispatch.");
            return false;
        }

        // Arm AutoConfirmService for 60 seconds specifically for this emergency dispatch event
        try {
            AutoConfirmService.armEmergencyWindow(context, 60_000L);
        } catch (Exception ignored) {}

        // Verify SEND_SMS permission
        if (ActivityCompat.checkSelfPermission(context, android.Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "SEND_SMS permission not granted.");
            return false;
        }

        try {
            int targetSubId = -1;
            // 1. Query SubscriptionManager dynamically to find active SIM subscription IDs
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                if (sm != null) {
                    try {
                        if (ActivityCompat.checkSelfPermission(context, android.Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                            List<SubscriptionInfo> subList = sm.getActiveSubscriptionInfoList();
                            if (subList != null && !subList.isEmpty()) {
                                if (slot == 1 || slot == 2) {
                                    int targetSlotIndex = slot - 1;
                                    for (SubscriptionInfo info : subList) {
                                        if (info.getSimSlotIndex() == targetSlotIndex) {
                                            targetSubId = info.getSubscriptionId();
                                            break;
                                        }
                                    }
                                }
                                if (targetSubId < 0) {
                                    targetSubId = subList.get(0).getSubscriptionId();
                                }
                            }
                        }
                    } catch (SecurityException se) {
                        Log.w(TAG, "Subscription list access restricted: " + se.getMessage());
                    }

                    if (targetSubId < 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        targetSubId = SubscriptionManager.getDefaultSmsSubscriptionId();
                    }
                }
            }

            // 2. Resolve SmsManager strictly via Subscription ID (NEVER SmsManager.getDefault())
            SmsManager smsManager = null;
            if (targetSubId >= 0) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        smsManager = context.getSystemService(SmsManager.class).createForSubscriptionId(targetSubId);
                    } else {
                        smsManager = SmsManager.getSmsManagerForSubscriptionId(targetSubId);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to instantiate SmsManager with subId " + targetSubId + ": " + e.getMessage());
                }
            }

            if (smsManager == null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                    try {
                        int defSub = SubscriptionManager.getDefaultSubscriptionId();
                        if (defSub >= 0) {
                            smsManager = SmsManager.getSmsManagerForSubscriptionId(defSub);
                        }
                    } catch (Exception ignored) {}
                }
            }

            if (smsManager == null) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        smsManager = context.getSystemService(SmsManager.class);
                    }
                    if (smsManager == null) {
                        smsManager = SmsManager.getDefault();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Fallback to default SmsManager failed: " + e.getMessage());
                }
            }

            if (smsManager == null) {
                Log.e(TAG, "Could not resolve any SmsManager instance. Aborting.");
                return false;
            }

            // 3. Divide message if needed
            ArrayList<String> parts = null;
            try {
                parts = smsManager.divideMessage(message.trim());
            } catch (Exception e) {
                Log.w(TAG, "divideMessage error: " + e.getMessage());
            }
            if (parts == null || parts.isEmpty()) {
                parts = new ArrayList<>();
                parts.add(message.trim());
            }

            // 4. Dispatch with strictly NULL sentIntent and NULL deliveryIntent
            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(
                    phoneNumber.trim(),
                    null,
                    parts,
                    null, // NULL sentIntents
                    null  // NULL deliveryIntents
                );
            } else {
                smsManager.sendTextMessage(
                    phoneNumber.trim(),
                    null,
                    parts.get(0),
                    null, // NULL sentIntent
                    null  // NULL deliveryIntent
                );
            }

            Log.i(TAG, "Background SMS dispatched successfully via SubscriptionId " + targetSubId + " to " + phoneNumber);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Critical failure during background stealth SMS dispatch: " + e.getMessage(), e);
            return false;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        backgroundExecutor.shutdown();
    }
}
