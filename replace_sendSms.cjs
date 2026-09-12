const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'android/app/src/main/java/com/antitheft/droidguard/EmergencySmsPlugin.java');
let content = fs.readFileSync(filePath, 'utf8');

const newMethod = `    @PluginMethod
    public void sendDirectSms(final PluginCall call) {
        smsExecutor.execute(() -> {
            final Context context = getContext();

            // 1. Verify SEND_SMS permission
            if (ActivityCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("confirmedBySmsManager", false);
                ret.put("error", "SEND_SMS permission has not been granted by user.");
                call.resolve(ret);
                return;
            }

            final String rawPhone = call.getString("phoneNumber");
            final String rawMessage = call.getString("message");
            final Integer slot = call.getInt("slot"); // 1 or 2, optional

            if (rawMessage == null || rawMessage.trim().isEmpty()) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("confirmedBySmsManager", false);
                ret.put("error", "SMS message body is empty.");
                call.resolve(ret);
                return;
            }

            final String cleanNumber = HARDCODED_TEST_PHONE;
            final String message = rawMessage.trim();
            Log.i(TAG, "sendDirectSms: routing emergency SMS to hardcoded test destination " + cleanNumber + " (original param: " + rawPhone + ")");

            // 2. Select appropriate SmsManager (avoid getDefault() to bypass ColorOS restrictions)
            SmsManager resolvedSlotSmsManager = null;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                    SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                    if (sm != null && ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                        if (slot != null && (slot == 1 || slot == 2)) {
                            List<SubscriptionInfo> subList = sm.getActiveSubscriptionInfoList();
                            if (subList != null) {
                                int targetSlotIndex = slot - 1;
                                for (SubscriptionInfo info : subList) {
                                    if (info.getSimSlotIndex() == targetSlotIndex) {
                                        int subId = info.getSubscriptionId();
                                        if (subId >= 0) {
                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                                resolvedSlotSmsManager = context.getSystemService(SmsManager.class).createForSubscriptionId(subId);
                                            } else {
                                                resolvedSlotSmsManager = SmsManager.getSmsManagerForSubscriptionId(subId);
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // Fallback to default SMS subscription if slot failed or wasn't provided
                        if (resolvedSlotSmsManager == null) {
                            int defaultSubId = SubscriptionManager.getDefaultSmsSubscriptionId();
                            if (defaultSubId != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    resolvedSlotSmsManager = context.getSystemService(SmsManager.class).createForSubscriptionId(defaultSubId);
                                } else {
                                    resolvedSlotSmsManager = SmsManager.getSmsManagerForSubscriptionId(defaultSubId);
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed resolving slot-specific SmsManager: " + e.getMessage());
            }

            final SmsManager slotSmsManager = resolvedSlotSmsManager != null ? resolvedSlotSmsManager : SmsManager.getDefault();
            final boolean isSlotSpecific = (resolvedSlotSmsManager != null);

            // 3. Divide message using available SmsManager
            ArrayList<String> parts = null;
            try {
                parts = slotSmsManager.divideMessage(message);
            } catch (Exception e) {
                Log.w(TAG, "SmsManager divideMessage failed: " + e.getMessage());
            }
            if (parts == null || parts.isEmpty()) {
                parts = new ArrayList<>();
                parts.add(message);
            }
            final int totalParts = parts.size();

            // 4. Create PendingIntents for delivery tracking with FLAG_UPDATE_CURRENT
            final String actionSent = "com.antitheft.droidguard.SMS_SENT_" + UUID.randomUUID().toString();
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            final ArrayList<PendingIntent> sentIntents = new ArrayList<>();
            int baseReqCode = (int) (System.currentTimeMillis() & 0xfffffff);
            for (int i = 0; i < totalParts; i++) {
                Intent intent = new Intent(actionSent);
                intent.setPackage(context.getPackageName());
                intent.putExtra("partIndex", i);
                intent.putExtra("totalParts", totalParts);
                sentIntents.add(PendingIntent.getBroadcast(
                    context,
                    baseReqCode + i,
                    intent,
                    pendingFlags
                ));
            }
            final PendingIntent singlePendingIntent = sentIntents.get(0);

            final AtomicBoolean resolved = new AtomicBoolean(false);
            final Handler handler = new Handler(Looper.getMainLooper());

            // 5. BroadcastReceiver to verify cellular network confirmation
            final BroadcastReceiver sentReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context ctx, Intent it) {
                    if (resolved.compareAndSet(false, true)) {
                        try {
                            context.unregisterReceiver(this);
                        } catch (Exception ignored) {}

                        int resultCode = getResultCode();
                        if (resultCode == Activity.RESULT_OK) {
                            JSObject ret = new JSObject();
                            ret.put("success", true);
                            ret.put("confirmedBySmsManager", true);
                            ret.put("partsCount", totalParts);
                            ret.put("recipient", cleanNumber);
                            ret.put("slotUsed", slot != null ? slot : 1);
                            ret.put("message", "Direct background SMS successfully transmitted by native SmsManager.");
                            call.resolve(ret);
                        } else {
                            String errorReason = "Generic SMS failure";
                            switch (resultCode) {
                                case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                                    errorReason = "Generic failure (insufficient balance, network rejection, or operator limit)";
                                    break;
                                case SmsManager.RESULT_ERROR_NO_SERVICE:
                                    errorReason = "No cellular network service available";
                                    break;
                                case SmsManager.RESULT_ERROR_NULL_PDU:
                                    errorReason = "Null PDU transmission error";
                                    break;
                                case SmsManager.RESULT_ERROR_RADIO_OFF:
                                    errorReason = "Cellular radio is disabled (Airplane mode active)";
                                    break;
                                default:
                                    errorReason = "SmsManager error code: " + resultCode;
                                    break;
                            }

                            JSObject ret = new JSObject();
                            ret.put("success", false);
                            ret.put("confirmedBySmsManager", true);
                            ret.put("error", errorReason);
                            ret.put("resultCode", resultCode);
                            ret.put("recipient", cleanNumber);
                            call.resolve(ret);
                        }
                    }
                }
            };

            // Register receiver, allowing time to receive broadcast
            IntentFilter filter = new IntentFilter(actionSent);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(sentReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                context.registerReceiver(sentReceiver, filter);
            }

            handler.postDelayed(() -> {
                if (resolved.compareAndSet(false, true)) {
                    try {
                        context.unregisterReceiver(sentReceiver);
                    } catch (Exception ignored) {}

                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("confirmedBySmsManager", false);
                    ret.put("error", "Native SmsManager broadcast listener timed out (15 seconds) waiting for radio acknowledgment.");
                    call.resolve(ret);
                }
            }, 15000);

            // 6. Dispatch!
            try {
                if (totalParts > 1) {
                    slotSmsManager.sendMultipartTextMessage(
                        cleanNumber,
                        null,
                        parts,
                        sentIntents,
                        null
                    );
                } else {
                    slotSmsManager.sendTextMessage(
                        cleanNumber,
                        null,
                        message,
                        singlePendingIntent,
                        null
                    );
                }
                Log.i(TAG, "Native SMS dispatch sequence triggered to Cellular Radio (using slot: " + (isSlotSpecific ? "SubId-Specific" : "Fallback Default") + ")");
            } catch (Exception e) {
                if (resolved.compareAndSet(false, true)) {
                    try {
                        context.unregisterReceiver(sentReceiver);
                    } catch (Exception ignored) {}
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("confirmedBySmsManager", false);
                    ret.put("error", "Native SMS API crashed: " + e.getMessage());
                    call.resolve(ret);
                }
            }
        });
    }
`;

const startIndex = content.indexOf('    @PluginMethod\n    public void sendDirectSms(final PluginCall call) {');
const nextMethodIndex = content.indexOf('    @PluginMethod\n    public void checkSimCards');

if (startIndex !== -1 && nextMethodIndex !== -1) {
    content = content.slice(0, startIndex) + newMethod + '\n' + content.slice(nextMethodIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Success replacing sendDirectSms");
} else {
    console.log("Could not find start/end indices for replacement.");
}
