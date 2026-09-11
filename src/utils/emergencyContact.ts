import { AsyncStorage, STORAGE_KEYS } from './storage';

export const DEFAULT_EMERGENCY_PHONE = '+213 661 12 34 56';

/**
 * Retrieve the saved primary emergency phone number from AsyncStorage
 */
export async function getEmergencyContactPhone(fallback?: string): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACT_PHONE);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (err) {
    console.warn('Failed to retrieve emergency phone from storage:', err);
  }
  return fallback || DEFAULT_EMERGENCY_PHONE;
}

/**
 * Save the verified primary emergency phone number to AsyncStorage
 */
export async function saveEmergencyContactPhone(phone: string): Promise<void> {
  try {
    const clean = phone.trim();
    await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACT_PHONE, clean);
  } catch (err) {
    console.warn('Failed to save emergency phone to storage:', err);
  }
}

/**
 * Basic international phone number validation
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Must be at least 8 digits and optionally start with +
  return /^\+?[0-9]{8,15}$/.test(cleaned);
}
