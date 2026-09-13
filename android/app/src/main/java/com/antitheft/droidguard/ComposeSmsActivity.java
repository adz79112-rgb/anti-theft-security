package com.antitheft.droidguard;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/**
 * Standard Compose Activity required by Android OS for Default SMS role.
 * Forwards external "sms:" or "smsto:" intents straight into DroidGuard's Google Messages UI.
 */
public class ComposeSmsActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent incomingIntent = getIntent();
        String recipient = "";
        String messageBody = "";

        if (incomingIntent != null) {
            Uri data = incomingIntent.getData();
            if (data != null) {
                String schemeSpecific = data.getSchemeSpecificPart();
                if (schemeSpecific != null) {
                    recipient = schemeSpecific;
                }
            }
            if (incomingIntent.hasExtra(Intent.EXTRA_TEXT)) {
                messageBody = incomingIntent.getStringExtra(Intent.EXTRA_TEXT);
            }
            if (incomingIntent.hasExtra("sms_body")) {
                messageBody = incomingIntent.getStringExtra("sms_body");
            }
        }

        // Redirect directly to MainActivity inside Messages Tab
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setAction(Intent.ACTION_MAIN);
        launchIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra("NAVIGATE_TAB", "messages");
        if (recipient != null && !recipient.isEmpty()) {
            launchIntent.putExtra("ACTIVE_SENDER", recipient);
        }
        if (messageBody != null && !messageBody.isEmpty()) {
            launchIntent.putExtra("PREFILL_BODY", messageBody);
        }

        startActivity(launchIntent);
        finish();
    }
}
