package com.antitheft.droidguard;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.List;

@CapacitorPlugin(
    name = "SimCardPlugin",
    permissions = {
        @Permission(
            alias = "phone",
            strings = { Manifest.permission.READ_PHONE_STATE }
        )
    }
)
public class SimCardPlugin extends Plugin {

    @PluginMethod
    public void getSimCards(PluginCall call) {
        // Resolve SIM cards safely without interrupting the primary SMS permission dialog flow
        resolveSimCards(call);
    }

    @PluginMethod
    public void requestSimPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("phone", call, "simCardsPermissionCallback");
                return;
            }
        }
        resolveSimCards(call);
    }

    @PermissionCallback
    private void simCardsPermissionCallback(PluginCall call) {
        resolveSimCards(call);
    }

    private void resolveSimCards(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();

        boolean permissionGranted = ActivityCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED;

        result.put("permissionGranted", permissionGranted);

        TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
        int slotCount = 2;
        if (tm != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                slotCount = Math.max(1, tm.getActiveModemCount());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                slotCount = Math.max(1, tm.getPhoneCount());
            }
        }
        result.put("slotCount", slotCount);

        JSObject sim1 = new JSObject();
        sim1.put("slot", 1);
        sim1.put("isInserted", false);
        sim1.put("carrier", "No SIM Card");
        sim1.put("displayName", "");
        sim1.put("countryIso", "");

        JSObject sim2 = new JSObject();
        sim2.put("slot", 2);
        sim2.put("isInserted", false);
        sim2.put("carrier", "No SIM Card");
        sim2.put("displayName", "");
        sim2.put("countryIso", "");

        JSArray rawSimList = new JSArray();

        // 1. Try SubscriptionManager (Primary native Dual-SIM carrier reader)
        boolean hasDetectedFromSubscription = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1 && permissionGranted) {
            try {
                SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                if (sm != null) {
                    List<SubscriptionInfo> subList = sm.getActiveSubscriptionInfoList();
                    if (subList != null && !subList.isEmpty()) {
                        for (SubscriptionInfo info : subList) {
                            int slotIndex = info.getSimSlotIndex(); // 0 for SIM 1, 1 for SIM 2
                            CharSequence carrierName = info.getCarrierName();
                            CharSequence displayName = info.getDisplayName();
                            String countryIso = info.getCountryIso() != null ? info.getCountryIso() : "";

                            String resolvedCarrier = "";
                            if (carrierName != null && carrierName.length() > 0) {
                                resolvedCarrier = carrierName.toString().trim();
                            } else if (displayName != null && displayName.length() > 0) {
                                resolvedCarrier = displayName.toString().trim();
                            }

                            JSObject cardObj = new JSObject();
                            cardObj.put("slot", slotIndex + 1);
                            cardObj.put("carrier", resolvedCarrier.isEmpty() ? "Unknown Carrier" : resolvedCarrier);
                            cardObj.put("displayName", displayName != null ? displayName.toString().trim() : "");
                            cardObj.put("countryIso", countryIso);
                            cardObj.put("isInserted", true);
                            rawSimList.put(cardObj);

                            if (slotIndex == 0) {
                                sim1.put("isInserted", true);
                                sim1.put("carrier", resolvedCarrier.isEmpty() ? "Unknown Carrier" : resolvedCarrier);
                                sim1.put("displayName", displayName != null ? displayName.toString().trim() : "");
                                sim1.put("countryIso", countryIso);
                                hasDetectedFromSubscription = true;
                            } else if (slotIndex == 1) {
                                sim2.put("isInserted", true);
                                sim2.put("carrier", resolvedCarrier.isEmpty() ? "Unknown Carrier" : resolvedCarrier);
                                sim2.put("displayName", displayName != null ? displayName.toString().trim() : "");
                                sim2.put("countryIso", countryIso);
                                hasDetectedFromSubscription = true;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                // Ignore and proceed to TelephonyManager fallback
            }
        }

        // 2. Fallback: If SubscriptionManager returned nothing or permission was pending, check TelephonyManager
        if (!hasDetectedFromSubscription && tm != null) {
            String netOperator = tm.getNetworkOperatorName();
            String simOperator = tm.getSimOperatorName();
            String fallbackCarrier = "";
            if (netOperator != null && !netOperator.trim().isEmpty()) {
                fallbackCarrier = netOperator.trim();
            } else if (simOperator != null && !simOperator.trim().isEmpty()) {
                fallbackCarrier = simOperator.trim();
            }

            if (!fallbackCarrier.isEmpty()) {
                sim1.put("isInserted", true);
                sim1.put("carrier", fallbackCarrier);
                sim1.put("displayName", fallbackCarrier);
                sim1.put("countryIso", tm.getNetworkCountryIso() != null ? tm.getNetworkCountryIso() : "");

                JSObject cardObj = new JSObject();
                cardObj.put("slot", 1);
                cardObj.put("carrier", fallbackCarrier);
                cardObj.put("displayName", fallbackCarrier);
                cardObj.put("countryIso", tm.getNetworkCountryIso() != null ? tm.getNetworkCountryIso() : "");
                cardObj.put("isInserted", true);
                rawSimList.put(cardObj);
            }
        }

        result.put("sim1", sim1);
        result.put("sim2", sim2);
        result.put("rawSimList", rawSimList);

        call.resolve(result);
    }
}
