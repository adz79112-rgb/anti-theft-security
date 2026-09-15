package com.antitheft.droidguard;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * DroidGuardProtectionService
 * Persistent Foreground Service with unkillable notification:
 * "DroidGuard: الحماية نشطة في الخلفية"
 * Configured with START_STICKY and AlarmManager self-revival onTaskRemoved
 * to guarantee resilience against task swiping and OEM memory cleansers.
 */
public class DroidGuardProtectionService extends Service {
    private static final String TAG = "DroidGuardProtectSvc";
    private static final String CHANNEL_ID = "droidguard_persistent_protection_channel";
    private static final int NOTIFICATION_ID = 9922;
    private static volatile boolean isServiceRunning = false;

    public static boolean isRunning() {
        return isServiceRunning;
    }

    public static void startProtection(Context context) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, DroidGuardProtectionService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            Log.i(TAG, "Requested start of DroidGuardProtectionService");
        } catch (Throwable t) {
            Log.e(TAG, "Error starting DroidGuardProtectionService: " + t.getMessage());
        }
    }

    public static void stopProtection(Context context) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, DroidGuardProtectionService.class);
            context.stopService(intent);
        } catch (Throwable ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
        Log.i(TAG, "DroidGuardProtectionService created");
        ensureForegroundNotification();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        isServiceRunning = true;
        ensureForegroundNotification();
        Log.i(TAG, "DroidGuardProtectionService onStartCommand - START_STICKY active");
        return START_STICKY;
    }

    private void ensureForegroundNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "DroidGuard: حماية النظام في الخلفية",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("خدمة الحماية الدائمة ضد السرقة والمراقبة في الخلفية");
                channel.setShowBadge(false);
                channel.setSound(null, null);
                nm.createNotificationChannel(channel);
            }

            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            PendingIntent pendingIntent = null;
            if (launchIntent != null) {
                int pFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    pFlags |= PendingIntent.FLAG_IMMUTABLE;
                }
                pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, pFlags);
            }

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("DroidGuard: الحماية نشطة في الخلفية")
                .setContentText("نظام الحماية ضد السرقة يعمل في الخلفية ومستعد لاستقبال رسائل الطوارئ")
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setOngoing(true)
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setContentIntent(pendingIntent)
                .build();

            // Permanent flags to prevent swipe dismissal
            notification.flags |= Notification.FLAG_ONGOING_EVENT | Notification.FLAG_NO_CLEAR;

            startForeground(NOTIFICATION_ID, notification);
            Log.i(TAG, "Foreground notification posted: DroidGuard: الحماية نشطة في الخلفية");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to start foreground notification: " + t.getMessage(), t);
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.w(TAG, "User swiped app from Recent Apps! Reviving DroidGuardProtectionService immediately...");
        isServiceRunning = false;
        
        // Immediate self-revival via AlarmManager
        try {
            Intent restartIntent = new Intent(getApplicationContext(), DroidGuardProtectionService.class);
            restartIntent.setPackage(getPackageName());
            int flags = PendingIntent.FLAG_ONE_SHOT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent restartPendingIntent = PendingIntent.getService(
                getApplicationContext(),
                8833,
                restartIntent,
                flags
            );

            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                long triggerAt = SystemClock.elapsedRealtime() + 500;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, restartPendingIntent);
                } else {
                    am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, restartPendingIntent);
                }
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error scheduling revival Alarm: " + t.getMessage());
        }

        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        Log.w(TAG, "DroidGuardProtectionService onDestroy called");
        isServiceRunning = false;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
