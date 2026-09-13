package com.antitheft.droidguard;

/**
 * Fallback SMS Receiver for receiving standard SMS_RECEIVED broadcasts
 * when DroidGuard is running in background or awaiting default app assignment.
 * Inherits full processing, storage, and notification logic from SmsReceiver.
 */
public class FallbackSmsReceiver extends SmsReceiver {
}
