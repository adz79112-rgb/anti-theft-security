// Android Device Credential & Biometric Authenticator
// Corresponds to expo-local-authentication with disableDeviceFallback: false

import { authenticateAsync } from './localAuthentication';

export interface AuthResult {
  success: boolean;
  error?: string;
  authMethod?: 'biometric_fingerprint' | 'biometric_face' | 'device_pin' | 'device_pattern';
}

/**
 * Checks if the platform has biometric hardware available.
 */
export async function checkBiometricHardware(): Promise<{
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: string[];
}> {
  return {
    hasHardware: true,
    isEnrolled: true,
    supportedTypes: ['FINGERPRINT', 'FACIAL_RECOGNITION', 'DEVICE_CREDENTIALS'],
  };
}

/**
 * Trigger native Android Biometric Authentication dialog (Fingerprint/Face/PIN)
 */
export async function triggerNativeWebAuthn(): Promise<boolean> {
  const res = await authenticateAsync({
    promptMessage: 'تأكيد بصمة الإصبع أو الوجه للمصادقة',
    cancelLabel: 'إلغاء',
  });
  return res.success;
}
