package com.antitheft.droidguard;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.util.Log;

/**
 * Required system receiver to qualify as a Default SMS Application.
 * Receives incoming MMS / WAP push messages.
 */
public class MmsReceiver extends BroadcastReceiver {
    private static final String TAG = "DroidGuardMmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION.equals(intent.getAction())) {
            Log.d(TAG, "Incoming WAP Push MMS delivered");
        }
    }
}
