package com.antitheft.droidguard;

import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Native Capacitor Plugin for Android BiometricPrompt & Device Security (PIN/Pattern/Password).
 * Directly invokes androidx.biometric.BiometricPrompt on the BridgeActivity window.
 * Supports Fingerprint, Face, Iris, and automatic fallback to Device Screen Lock (PIN/Pattern).
 */
@CapacitorPlugin(name = "BiometricPlugin")
public class BiometricPlugin extends Plugin {
    private static final String TAG = "BiometricPlugin";
    private BiometricPrompt activePrompt;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void checkBiometry(PluginCall call) {
        Context context = getContext();
        BiometricManager biometricManager = BiometricManager.from(context);

        int authenticators;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG
                           | BiometricManager.Authenticators.BIOMETRIC_WEAK
                           | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        } else {
            authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK;
        }

        int canAuth = biometricManager.canAuthenticate(authenticators);
        boolean isAvailable = (canAuth == BiometricManager.BIOMETRIC_SUCCESS);
        boolean hasHardware = (canAuth != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE && canAuth != BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE);

        JSObject ret = new JSObject();
        ret.put("isAvailable", isAvailable);
        ret.put("hasHardware", hasHardware);
        ret.put("canAuthenticateResult", canAuth);
        call.resolve(ret);
    }

    @PluginMethod
    public void authenticate(final PluginCall call) {
        final FragmentActivity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Activity is not available");
            call.resolve(ret);
            return;
        }

        final String title = call.getString("title", "Confirm Owner Identity");
        final String subtitle = call.getString("subtitle", "Anti-Theft Device Security");
        final String description = call.getString("reason", "Scan biometric or enter device PIN/Pattern to unlock");
        final String cancelTitle = call.getString("cancelTitle", "Cancel");
        final boolean allowDeviceCredential = call.getBoolean("allowDeviceCredential", true);

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Executor executor = ContextCompat.getMainExecutor(activity);
                    final AtomicBoolean isFinished = new AtomicBoolean(false);

                    activePrompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            super.onAuthenticationError(errorCode, errString);
                            if (isFinished.compareAndSet(false, true)) {
                                Log.w(TAG, "Biometric error: " + errorCode + " - " + errString);
                                JSObject ret = new JSObject();
                                ret.put("success", false);
                                ret.put("errorCode", errorCode);
                                ret.put("error", errString.toString());
                                call.resolve(ret);
                            }
                        }

                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            super.onAuthenticationSucceeded(result);
                            if (isFinished.compareAndSet(false, true)) {
                                Log.i(TAG, "Biometric authentication succeeded");
                                JSObject ret = new JSObject();
                                ret.put("success", true);
                                call.resolve(ret);
                            }
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            super.onAuthenticationFailed();
                            Log.w(TAG, "Biometric authentication failed (unrecognized finger/face)");
                            // Notice: BiometricPrompt keeps the dialog open on mismatch so user can try again or use PIN
                        }
                    });

                    BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder();
                    builder.setTitle(title != null && !title.isEmpty() ? title : "Confirm Owner Identity");
                    if (subtitle != null && !subtitle.isEmpty()) {
                        builder.setSubtitle(subtitle);
                    }
                    if (description != null && !description.isEmpty()) {
                        builder.setDescription(description);
                    }

                    if (allowDeviceCredential) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            // Android 11+
                            builder.setAllowedAuthenticators(
                                BiometricManager.Authenticators.BIOMETRIC_STRONG
                                | BiometricManager.Authenticators.BIOMETRIC_WEAK
                                | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                            );
                        } else {
                            // Android 10 (API 29)
                            builder.setDeviceCredentialAllowed(true);
                        }
                        // Android explicitly requires NO negative button text when device credential is allowed
                    } else {
                        builder.setNegativeButtonText(cancelTitle != null && !cancelTitle.isEmpty() ? cancelTitle : "Cancel");
                    }

                    builder.setConfirmationRequired(false);

                    BiometricPrompt.PromptInfo promptInfo = builder.build();
                    activePrompt.authenticate(promptInfo);

                    // Safety guard: If prompt is dismissed or idle after 90 seconds without callback, resolve safely
                    mainHandler.postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            if (isFinished.compareAndSet(false, true)) {
                                Log.w(TAG, "Biometric prompt timed out after 90s");
                                if (activePrompt != null) {
                                    try {
                                        activePrompt.cancelAuthentication();
                                    } catch (Exception ignored) {}
                                }
                                JSObject ret = new JSObject();
                                ret.put("success", false);
                                ret.put("error", "Authentication prompt timed out");
                                call.resolve(ret);
                            }
                        }
                    }, 90000);

                } catch (Exception e) {
                    Log.e(TAG, "Failed to launch BiometricPrompt", e);
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", e.getMessage() != null ? e.getMessage() : "Failed to launch BiometricPrompt");
                    call.resolve(ret);
                }
            }
        });
    }

    @PluginMethod
    public void cancelAuthentication(PluginCall call) {
        FragmentActivity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (activePrompt != null) {
                        try {
                            activePrompt.cancelAuthentication();
                        } catch (Exception e) {
                            Log.w(TAG, "Error cancelling biometric auth", e);
                        }
                    }
                    call.resolve();
                }
            });
        } else {
            call.resolve();
        }
    }
}
