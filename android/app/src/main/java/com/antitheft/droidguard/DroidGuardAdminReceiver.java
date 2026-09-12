package com.antitheft.droidguard;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.Toast;

/**
 * DroidGuard Device Administrator Receiver
 * Grants elevated system privileges to maintain anti-theft persistence,
 * allow instant hardware screen locks on command, and elevate background process priority.
 */
public class DroidGuardAdminReceiver extends DeviceAdminReceiver {
    private static final String TAG = "DroidGuardAdminReceiver";

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Log.i(TAG, "DroidGuard Device Administrator rights activated successfully.");
        Toast.makeText(context, "DroidGuard Anti-Theft: Device Admin Protection Active", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        Log.w(TAG, "User or system requested disabling Device Administrator rights.");
        return "Warning: Deactivating Device Administrator will disable immediate anti-theft lockdown and background emergency protection.";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Log.w(TAG, "DroidGuard Device Administrator rights deactivated.");
        Toast.makeText(context, "DroidGuard Anti-Theft: Device Admin Protection Disabled", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onPasswordFailed(Context context, Intent intent) {
        super.onPasswordFailed(context, intent);
        Log.w(TAG, "Lock screen PIN / password attempt failed.");
    }

    @Override
    public void onPasswordSucceeded(Context context, Intent intent) {
        super.onPasswordSucceeded(context, intent);
        Log.i(TAG, "Lock screen PIN / password attempt succeeded.");
    }
}
