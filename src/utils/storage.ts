/**
 * Bulletproof Storage adapter providing both synchronous safeStorage and asynchronous AsyncStorage interfaces.
 * Uses an in-memory fallback store when window.localStorage is blocked, restricted, or throws SecurityError
 * (common in sandboxed iframes and third-party context).
 */

const memoryStore = new Map<string, string>();

function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__droidguard_test_storage__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

let storageAvailable: boolean | null = null;

function checkStorage(): boolean {
  if (storageAvailable === null) {
    storageAvailable = isStorageAvailable();
  }
  return storageAvailable;
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (checkStorage()) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      storageAvailable = false;
    }
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
  },

  setItem(key: string, value: string): void {
    try {
      if (checkStorage()) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      storageAvailable = false;
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (checkStorage()) {
        window.localStorage.removeItem(key);
      }
    } catch {
      storageAvailable = false;
    }
    memoryStore.delete(key);
  },

  clear(): void {
    try {
      if (checkStorage()) {
        window.localStorage.clear();
      }
    } catch {
      storageAvailable = false;
    }
    memoryStore.clear();
  },
};

export interface AsyncStorageInterface {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const AsyncStorage: AsyncStorageInterface = {
  async getItem(key: string): Promise<string | null> {
    return safeStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    safeStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    safeStorage.removeItem(key);
  },

  async clear(): Promise<void> {
    safeStorage.clear();
  },
};

export default AsyncStorage;

// Storage key constants
export const STORAGE_KEYS = {
  CHAT_ID: '@droidguard_chat_id',
  BOT_TOKEN: '@droidguard_bot_token',
  USER_EMAIL: '@droidguard_user_email',
  EMAIL_VERIFIED: '@droidguard_email_verified',
  EMAIL_CHANGE_REQUEST: '@droidguard_email_change_request',
  ANTI_UNINSTALL_ACTIVE: '@droidguard_anti_uninstall_active',
  DEVICE_ADMIN_ACTIVE: '@droidguard_device_admin_active',
  SECURITY_CONFIG: '@droidguard_security_config',
  CAPTURES: '@droidguard_captures',
  DISPATCHES: '@droidguard_dispatches',
  EMERGENCY_CONTACT_PHONE: '@droidguard_emergency_contact_phone',
  FAILED_AUTH_ATTEMPTS: '@droidguard_failed_auth_attempts',
  DEVICE_PIN: '@droidguard_device_pin',
  APP_LANGUAGE: '@droidguard_app_language',
  LANGUAGE_INITIALIZED: '@droidguard_language_initialized',
} as const;
