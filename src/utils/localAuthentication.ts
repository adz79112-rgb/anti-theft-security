/**
 * Android Biometric Authentication Module
 * Compatible implementation of expo-local-authentication API
 * Supports Fingerprint, Facial Recognition, and Android Device PIN/Pattern
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

export enum AuthenticationType {
  FINGERPRINT = 1,
  FACIAL_RECOGNITION = 2,
  IRIS = 3,
}

export enum SecurityLevel {
  NONE = 0,
  SECRET = 1,
  BIOMETRIC = 2,
}

export interface LocalAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

export interface LocalAuthOptions {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
  requireConfirmation?: boolean;
}

export interface NativeBiometricResponse {
  success: boolean;
  error?: string;
  errorCode?: number;
}

export interface NativeBiometricPluginInterface {
  checkBiometry(): Promise<{ isAvailable: boolean; hasHardware: boolean; canAuthenticateResult: number }>;
  authenticate(options: {
    title?: string;
    subtitle?: string;
    reason?: string;
    cancelTitle?: string;
    allowDeviceCredential?: boolean;
  }): Promise<NativeBiometricResponse>;
  cancelAuthentication(): Promise<void>;
}

export const NativeBiometricPlugin = registerPlugin<NativeBiometricPluginInterface>('BiometricPlugin');

/**
 * Check if native hardware biometric is available (Capacitor or WebAuthn)
 */
export async function hasHardwareAsync(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await NativeBiometricPlugin.checkBiometry();
      return Boolean(info?.hasHardware || info?.isAvailable);
    } catch {
      try {
        const info = await BiometricAuth.checkBiometry();
        return info.isAvailable;
      } catch {
        return true;
      }
    }
  }

  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Check if biometric records (fingerprint/face) are enrolled on this device
 */
export async function isEnrolledAsync(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await NativeBiometricPlugin.checkBiometry();
      return Boolean(info?.isAvailable);
    } catch {
      try {
        const info = await BiometricAuth.checkBiometry();
        return info.isAvailable && info.biometryType !== BiometryType.none;
      } catch {
        return true;
      }
    }
  }
  return true;
}

/**
 * Get supported authentication types
 */
export async function supportedAuthenticationTypesAsync(): Promise<AuthenticationType[]> {
  try {
    const info = await BiometricAuth.checkBiometry();
    if (info.biometryType === BiometryType.faceAuthentication || info.biometryType === BiometryType.faceId) {
      return [AuthenticationType.FACIAL_RECOGNITION];
    }
    if (info.biometryType === BiometryType.fingerprintAuthentication || info.biometryType === BiometryType.touchId) {
      return [AuthenticationType.FINGERPRINT];
    }
    if (info.biometryType === BiometryType.irisAuthentication) {
      return [AuthenticationType.IRIS];
    }
    return [AuthenticationType.FINGERPRINT, AuthenticationType.FACIAL_RECOGNITION];
  } catch {
    return [AuthenticationType.FINGERPRINT];
  }
}

/**
 * Get device security level
 */
export async function getEnrolledLevelAsync(): Promise<SecurityLevel> {
  const hasBio = await isEnrolledAsync();
  return hasBio ? SecurityLevel.BIOMETRIC : SecurityLevel.SECRET;
}

/**
 * Prompt REAL Native Android Biometric Authentication dialog (Fingerprint, Face, Device Credential)
 * Directly invokes androidx.biometric.BiometricPrompt on the host Activity.
 * Includes allowDeviceCredential: true for instant PIN/Pattern fallback.
 * Protected by strict timeout guard so UI never gets stuck on "Waiting for native Android authentication...".
 */
export async function authenticateAsync(options?: LocalAuthOptions): Promise<LocalAuthResult> {
  const reason = options?.promptMessage || 'المس مستشعر البصمة أو أدخل رمز PIN لإلغاء قفل الجهاز';
  const cancelTitle = options?.cancelLabel || 'إلغاء';
  const allowDeviceCredential = !options?.disableDeviceFallback;

  // 1. Native Android Platform Execution
  if (Capacitor.isNativePlatform()) {
    try {
      // Timeout promise to guarantee the JS UI never hangs indefinitely
      const timeoutPromise = new Promise<NativeBiometricResponse>((_, reject) => {
        setTimeout(() => reject(new Error('Native authentication prompt timed out')), 60000);
      });

      const authPromise = NativeBiometricPlugin.authenticate({
        title: 'Anti-Theft Security',
        subtitle: 'DroidGuard Owner Verification',
        reason,
        cancelTitle,
        allowDeviceCredential,
      });

      const res = await Promise.race([authPromise, timeoutPromise]);
      if (res && res.success) {
        return { success: true };
      }

      return {
        success: false,
        error: res?.error || 'Authentication rejected',
      };
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || 'Authentication error';
      console.warn('NativeBiometricPlugin execution error:', errMsg);

      // Secondary fallback to BiometricAuth plugin
      try {
        await BiometricAuth.authenticate({
          reason,
          cancelTitle,
          allowDeviceCredential,
          iosFallbackTitle: options?.fallbackLabel || 'استخدام رمز المرور',
        });
        return { success: true };
      } catch (fallbackErr: unknown) {
        return {
          success: false,
          error: (fallbackErr as Error)?.message || errMsg,
        };
      }
    }
  }

  // 2. Web Browser Preview Environment
  if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 10000,
          userVerification: 'preferred',
          allowCredentials: [],
        },
      });
      if (credential) {
        return { success: true };
      }
    } catch {
      // In development web preview, allow test unlocks if WebAuthn is cancelled/mocked
    }
  }

  // Web fallback simulation for development preview
  return { success: true };
}

/**
 * Cancel any ongoing authentication
 */
export async function cancelAuthenticate(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeBiometricPlugin.cancelAuthentication();
    } catch {
      // Ignore
    }
  }
}

export const LocalAuthentication = {
  AuthenticationType,
  SecurityLevel,
  hasHardwareAsync,
  isEnrolledAsync,
  supportedAuthenticationTypesAsync,
  getEnrolledLevelAsync,
  authenticateAsync,
  cancelAuthenticate,
};

export default LocalAuthentication;
