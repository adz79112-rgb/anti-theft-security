/**
 * Native Android & Device Screen Lock / Biometric Authentication
 * Invokes the official Android system lock prompt (Fingerprint, Face, or device PIN/Pattern)
 */

export interface DeviceAuthResult {
  success: boolean;
  method?: 'system_biometrics' | 'system_screen_lock' | 'device_pin';
  error?: string;
}

/**
 * Triggers the official Android / Platform Screen Lock or Biometric prompt
 * using WebAuthn / Credential Management API with userVerification: "required".
 */
export async function triggerNativeDeviceAuth(promptTitle: string = 'DroidGuard'): Promise<DeviceAuthResult> {
  // 1. Try standard WebAuthn user verification (invokes Android BiometricPrompt / Screen Lock)
  if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
    try {
      // Check if user verifying platform authenticator (Fingerprint/PIN) is available
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => true);
      
      if (isAvailable) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // Attempt WebAuthn get credential with required user verification (triggers Android fingerprint / device PIN prompt)
        try {
          const credential = await navigator.credentials.get({
            publicKey: {
              challenge,
              timeout: 60000,
              userVerification: 'required',
              allowCredentials: [],
            },
          });

          if (credential) {
            return {
              success: true,
              method: 'system_biometrics',
            };
          }
        } catch {
          // If get() has no enrolled credentials, attempt create() which triggers the Android Screen Lock confirmation
          const userId = new Uint8Array(16);
          window.crypto.getRandomValues(userId);

          const regCred = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: promptTitle, id: window.location.hostname },
              user: {
                id: userId,
                name: 'device.owner',
                displayName: 'Device Owner',
              },
              pubKeyCredParams: [
                { alg: -7, type: 'public-key' },  // ES256
                { alg: -257, type: 'public-key' }, // RS256
              ],
              authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
              },
              timeout: 60000,
            },
          });

          if (regCred) {
            return {
              success: true,
              method: 'system_screen_lock',
            };
          }
        }
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || '';
      console.log('[DeviceAuth] Native WebAuthn completed/fallback:', errorMsg);
      // If user cancelled, don't fallback to auto-success
      if (errorMsg.includes('cancel') || errorMsg.includes('AbortError') || errorMsg.includes('NotAllowedError')) {
        return {
          success: false,
          error: 'User cancelled authentication',
        };
      }
    }
  }

  // 2. Return fallback flag so UI presents native Android system dialog
  return {
    success: false,
    error: 'FALLBACK_TO_SYSTEM_DIALOG',
  };
}
