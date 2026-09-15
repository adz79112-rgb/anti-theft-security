package com.antitheft.droidguard;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * BootReceiver
 * Restarts DroidGuardProtectionService automatically on device boot,
 * package replacement/update, or quick-boot.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "DroidGuardBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || context == null) return;
        String action = intent.getAction();
        Log.i(TAG, "BootReceiver triggered with action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            DroidGuardProtectionService.startProtection(context);
        }
    }
}
