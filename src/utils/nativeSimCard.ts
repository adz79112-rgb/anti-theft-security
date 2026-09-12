/**
 * DroidGuard Native SIM Card Capacitor Bridge
 * Interacts directly with Android SubscriptionManager & TelephonyManager
 * to read real physical SIM cards (SIM 1 & SIM 2).
 */

import { registerPlugin, Capacitor } from '@capacitor/core';

export interface NativeSimCardInfo {
  slot: number;
  isInserted: boolean;
  carrier: string;
  displayName: string;
  countryIso: string;
}

export interface NativeSimCardsResult {
  permissionGranted: boolean;
  slotCount: number;
  sim1: NativeSimCardInfo;
  sim2: NativeSimCardInfo;
  rawSimList: NativeSimCardInfo[];
}

export interface SimCardPluginInterface {
  getSimCards(): Promise<NativeSimCardsResult>;
}

export const SimCardPlugin = registerPlugin<SimCardPluginInterface>('SimCardPlugin');

/**
 * Read the actual physical SIM cards currently inserted into the phone's hardware slots.
 */
export async function getRealHardwareSimCards(): Promise<NativeSimCardsResult> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const result = await SimCardPlugin.getSimCards();
      return result;
    } catch (err) {
      console.warn('SimCardPlugin.getSimCards error:', err);
    }
  }

  // Fallback for Web preview / non-native environment where hardware SIM is physically inaccessible
  return {
    permissionGranted: false,
    slotCount: 2,
    sim1: {
      slot: 1,
      isInserted: true,
      carrier: 'Detecting...',
      displayName: 'SIM 1 Hardware Slot',
      countryIso: '',
    },
    sim2: {
      slot: 2,
      isInserted: false,
      carrier: 'No SIM Card',
      displayName: 'SIM 2 Hardware Slot',
      countryIso: '',
    },
    rawSimList: [],
  };
}
