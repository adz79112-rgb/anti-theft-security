package com.antitheft.droidguard;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

/**
 * Required system headless service for quick responses to incoming calls via SMS.
 */
public class HeadlessSmsSendService extends Service {
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
