package com.antitheft.droidguard;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Enhanced Full-Fledged SMS Receiver:
 * 1. Captures BOTH SMS_DELIVER (when DroidGuard is Default SMS App) AND SMS_RECEIVED (standard broadcast).
 * 2. Writes incoming SMS directly into Android Telephony Provider database (content://sms/inbox) so the phone's native database stays 100% updated.
 * 3. Saves message in fast internal storage for instant Google Messages UI rendering in real-time.
 * 4. Displays an immediate Android Heads-Up notification at the top with Sender, Full Message text, and direct tap-to-open.
 */
public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "DroidGuardSmsReceiver";
    public static final String SMS_PREFS = "droidguard_sms_storage";
    public static final String KEY_SMS_LIST = "stored_messages_json";
    public static final String CHANNEL_ID = "droidguard_sms_notifications";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();

        if (Telephony.Sms.Intents.SMS_DELIVER_ACTION.equals(action) ||
            Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(action) ||
            "android.provider.Telephony.SMS_RECEIVED".equals(action)) {
            try {
                SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
                if (messages != null && messages.length > 0) {
                    StringBuilder fullBody = new StringBuilder();
                    String sender = messages[0].getDisplayOriginatingAddress();
                    long timestamp = messages[0].getTimestampMillis();
                    if (timestamp <= 0) timestamp = System.currentTimeMillis();

                    for (SmsMessage msg : messages) {
                        if (msg != null && msg.getMessageBody() != null) {
                            fullBody.append(msg.getMessageBody());
                        }
                    }

                    String messageBody = fullBody.toString();
                    Log.d(TAG, "Incoming Real Phone SMS from [" + sender + "]: " + messageBody);

                    // 1. Write to Android System Telephony Provider if we have write permission / default app
                    writeToSystemTelephonyProvider(context, sender, messageBody, timestamp);

                    // 2. Store message in local app storage for instantaneous Google Messages UI list
                    storeIncomingSms(context, sender, messageBody, timestamp);

                    // 3. Show instant system Heads-Up notification at the top of the phone
                    showSmsNotification(context, sender, messageBody, timestamp);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing incoming SMS: " + e.getMessage(), e);
            }
        }
    }

    private void writeToSystemTelephonyProvider(Context context, String sender, String body, long timestamp) {
        try {
            ContentValues values = new ContentValues();
            values.put(Telephony.Sms.ADDRESS, sender != null ? sender : "Unknown");
            values.put(Telephony.Sms.BODY, body != null ? body : "");
            values.put(Telephony.Sms.DATE, timestamp);
            values.put(Telephony.Sms.READ, 0);
            values.put(Telephony.Sms.TYPE, Telephony.Sms.MESSAGE_TYPE_INBOX);
            
            Uri uri = context.getContentResolver().insert(Telephony.Sms.Inbox.CONTENT_URI, values);
            Log.d(TAG, "Written to Telephony SMS Provider: " + uri);
        } catch (Exception e) {
            Log.w(TAG, "Could not write to Telephony Provider (likely not default app or missing write permission): " + e.getMessage());
        }
    }

    private void storeIncomingSms(Context context, String sender, String body, long timestamp) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(SMS_PREFS, Context.MODE_PRIVATE);
            String existingJson = prefs.getString(KEY_SMS_LIST, "[]");
            JSONArray array = new JSONArray(existingJson);

            JSONObject newMsg = new JSONObject();
            newMsg.put("id", "sms_" + timestamp + "_" + (int)(Math.random() * 1000));
            newMsg.put("sender", sender != null ? sender : "Unknown");
            newMsg.put("body", body != null ? body : "");
            newMsg.put("timestamp", timestamp);
            newMsg.put("type", "inbox");
            newMsg.put("read", false);

            // Prepend new message so it appears immediately at the top
            JSONArray updated = new JSONArray();
            updated.put(newMsg);
            for (int i = 0; i < array.length() && i < 250; i++) {
                updated.put(array.get(i));
            }

            prefs.edit().putString(KEY_SMS_LIST, updated.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Failed to store incoming SMS locally: " + e.getMessage());
        }
    }

    private void showSmsNotification(Context context, String sender, String body, long timestamp) {
        try {
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Messages / رسائل SMS",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Notifications for incoming SMS messages on this device");
                channel.enableVibration(true);
                channel.setShowBadge(true);
                channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                notificationManager.createNotificationChannel(channel);
            }

            // Intent to launch MainActivity and automatically jump directly to the Messages Tab
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setAction(Intent.ACTION_MAIN);
            launchIntent.addCategory(Intent.CATEGORY_LAUNCHER);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            launchIntent.putExtra("NAVIGATE_TAB", "messages");
            launchIntent.putExtra("ACTIVE_SENDER", sender);

            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                (int) System.currentTimeMillis(),
                launchIntent,
                pendingFlags
            );

            String title = (sender != null && !sender.isEmpty()) ? sender : "New SMS Message";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.sym_action_chat)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setWhen(timestamp)
                .setContentIntent(pendingIntent);

            int notifId = (int) (timestamp % 100000);
            notificationManager.notify(notifId, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Error displaying SMS notification: " + e.getMessage());
        }
    }
}
