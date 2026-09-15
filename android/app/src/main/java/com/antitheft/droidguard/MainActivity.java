package com.antitheft.droidguard;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SimCardPlugin.class);
        registerPlugin(EmergencySmsPlugin.class);
        registerPlugin(BiometricPlugin.class);
        super.onCreate(savedInstanceState);

        // Start Persistent Background Protection Foreground Service
        DroidGuardProtectionService.startProtection(this);

        // Allow app to display over keyguard/lockscreen when an emergency or power-off lock is active
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra("TRIGGER_POWER_LOCK", false)) {
            EmergencySmsPlugin.notifyPowerOffIntercepted();
        }
    }
}

