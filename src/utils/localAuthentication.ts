/**
 * Android Biometric Authentication Module
 * Compatible implementation of expo-local-authentication API
 * Supports Fingerprint, Facial Recognition, and Android Device PIN/Pattern
 */

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

/**
 * Check if native hardware biometric is available (Capacitor or WebAuthn)
 */
export async function hasHardwareAsync(): Promise<boolean> {
  try {
    const info = await BiometricAuth.checkBiometry();
    return info.isAvailable;
  } catch {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Check if biometric records (fingerprint/face) are enrolled on this device
 */
export async function isEnrolledAsync(): Promise<boolean> {
  try {
    const info = await BiometricAuth.checkBiometry();
    return info.isAvailable && info.biometryType !== BiometryType.none;
  } catch {
    return false;
  }
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
 * Strictly verifies against Android BiometricPrompt hardware.
 */
export async function authenticateAsync(options?: LocalAuthOptions): Promise<LocalAuthResult> {
  const reason = options?.promptMessage || 'المس مستشعر البصمة أو وجهك للتحقق من هوية المالك';
  const cancelTitle = options?.cancelLabel || 'إلغاء';

  // 1. Try Native Capacitor Biometric Auth (Triggers Android BiometricPrompt Dialog)
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle,
      allowDeviceCredential: !options?.disableDeviceFallback,
      iosFallbackTitle: options?.fallbackLabel || 'استخدام رمز المرور',
    });
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = (err as Error)?.message || 'فشلت المصادقة البيومترية';
    console.warn('Native BiometricAuth returned:', errorMessage);

    // If native plugin is not implemented (e.g. running in pure web browser preview), fallback to WebAuthn
    if (
      errorMessage.includes('not implemented') ||
      errorMessage.includes('UNIMPLEMENTED') ||
      errorMessage.includes('plugin is not implemented')
    ) {
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          const credential = await navigator.credentials.get({
            publicKey: {
              challenge,
              timeout: 60000,
              userVerification: 'required',
              allowCredentials: [],
            },
          });
          if (credential) {
            return { success: true };
          }
        } catch (webAuthnErr: unknown) {
          return {
            success: false,
            error: (webAuthnErr as Error)?.message || 'فشلت مصادقة بصمة المتصفح',
          };
        }
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Cancel any ongoing authentication
 */
export async function cancelAuthenticate(): Promise<void> {
  // BiometricAuth handles dismissals natively
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
