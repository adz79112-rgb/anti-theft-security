  const executeTheftTrigger = useCallback(
    async (senderNumber: string, directBlackScreen: boolean = false) => {
      setTheftTriggerSender(senderNumber);

      // Silently capture front photo & location in background as requested
      captureFrontCameraPhoto().then((photoUrl) => {
        fetchDeviceLocation().then(async (loc) => {
          setCurrentLocation(loc);
          const timestamp = new Date().toLocaleTimeString();
          const newCapture: IntruderCapture = {
            id: generateUniqueId('cap'),
            imageUrl: photoUrl,
            timestamp,
            location: loc,
            triggerSource: 'THEFT_LOCKDOWN_TRIGGER',
            senderNumber,
            dispatchedVia: ['sms', 'email', 'telegram'],
          };
          setCaptures((prev) => [newCapture, ...prev]);

          // 1. Silent Background Emergency SMS via native Android SmsManager
          const emergencyPhone = (config.emergencyContactPhone && config.emergencyContactPhone.trim())
            || (await getEmergencyContactPhone())
            || '0563752023';
          const smsBody = `🚨 [إنذار سرقة DroidGuard]\nالموقع المباشر للجهاز:\n${loc.mapsUrl}\nإحداثيات: ${loc.source === 'unavailable' ? 'غير متوفر' : loc.latitude.toFixed(5) + ', ' + loc.longitude.toFixed(5)}\nالوقت: ${timestamp}`;

          const recipientsToAlert: string[] = [];
          if (emergencyPhone && emergencyPhone.trim()) recipientsToAlert.push(emergencyPhone.trim());
          if (!recipientsToAlert.includes('0563752023')) recipientsToAlert.push('0563752023');
          if (senderNumber && senderNumber.trim() && !recipientsToAlert.includes(senderNumber.trim())) {
            recipientsToAlert.push(senderNumber.trim());
          }

          if (recipientsToAlert.length === 0) {
            setDispatchEvents((prev) => [
              {
                id: generateUniqueId('disp'),
                timestamp,
                recipient: 'لم يتم تحديد رقم طوارئ',
                type: 'emergency_sms',
                content: '[تعذر إرسال SMS] لم يتم ضبط رقم هاتف الطوارئ في الإعدادات. يرجى إضافته من تبويب SMS.',
                status: 'failed',
              },
              ...prev,
            ]);
          }

          for (const recipient of recipientsToAlert) {
            sendDualSimSmsFallback(recipient, smsBody).then((dualSimResult) => {
              const isEmergency = recipient === emergencyPhone;
              if (dualSimResult.sim1Delivered) {
                setDispatchEvents((prev) => [
                  {
                    id: generateUniqueId('disp'),
                    timestamp,
                    recipient: `${recipient} (${isEmergency ? 'طوارئ أساسي' : 'مرسل الأمر'} - SIM 1 ${dualSimResult.sim1Details.carrier})`,
                    type: 'emergency_sms',
                    content: `[SMS متزامن - شريحة 1] تم تأكيد إرسال موقع GPS المباشر إلى ${recipient} عبر Android SmsManager: ${loc.mapsUrl}`,
                    status: 'delivered',
                  },
                  ...prev,
                ]);
              }
              if (dualSimResult.sim2Delivered) {
                setDispatchEvents((prev) => [
                  {
                    id: generateUniqueId('disp'),
                    timestamp,
                    recipient: `${recipient} (${isEmergency ? 'طوارئ أساسي' : 'مرسل الأمر'} - SIM 2 ${dualSimResult.sim2Details.carrier})`,
                    type: 'emergency_sms',
                    content: `[SMS متزامن - شريحة 2 احتياطية] تم تأكيد إرسال موقع GPS عبر Android SmsManager: ${loc.mapsUrl}`,
                    status: 'delivered',
                  },
                  ...prev,
                ]);
              }
              if (!dualSimResult.sim1Delivered && !dualSimResult.sim2Delivered) {
                setDispatchEvents((prev) => [
                  {
                    id: generateUniqueId('disp'),
                    timestamp,
                    recipient: `${recipient} (${isEmergency ? 'طوارئ أساسي' : 'مرسل الأمر'})`,
                    type: 'emergency_sms',
                    content: `[SMS متزامن - تعذر الإرسال] ${dualSimResult.summary}`,
                    status: 'failed',
                  },
                  ...prev,
                ]);
              }
            });
          }

          // 2. Dispatch directly to Gmail (adz79112@gmail.com)
          const targetEmail = config.userEmail || (await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL)) || 'adz79112@gmail.com';
          sendGmailSecurityReport({
            toEmail: targetEmail,
            senderNumber,
            mapsUrl: loc.mapsUrl,
            latitude: loc.latitude,
            longitude: loc.longitude,
            photoUrl,
            timestamp,
            triggerSource: 'THEFT_LOCKDOWN_TRIGGER (محاكاة سرقة وإطفاء الهاتف)',
          }).then((res) => {
            if (res.ok) {
              setDispatchEvents((prev) => [
                {
                  id: generateUniqueId('disp'),
                  timestamp,
                  recipient: targetEmail,
                  type: 'gmail_report',
                  content: `[تقرير فوري Gmail] تم إرسال موقع GPS المباشر (${loc.mapsUrl}) وصورة الكاميرا الأمامية إلى بريد الأمان ${targetEmail}`,
                  status: 'delivered',
                },
                ...prev,
              ]);
            }
          });

          // 3. Dispatch directly to Telegram Bot if configured
          const targetChatId = config.telegramChatId || (await AsyncStorage.getItem(STORAGE_KEYS.CHAT_ID));
          if (targetChatId) {
            const token = config.telegramBotToken || DEFAULT_BOT_TOKEN;
            sendTelegramPhoto(
              token,
              targetChatId,
              photoUrl,
              `🚨 <b>[DroidGuard - إنذار سرقة ومحاكاة إطفاء الهاتف]</b>\n📸 <b>تم التقاط صورة المتسلل:</b> مرفقة\n📍 <b>الموقع المباشر:</b> <a href="${loc.mapsUrl}">خرائط Google</a> (${loc.source === 'unavailable' ? 'غير متوفر' : loc.latitude.toFixed(5) + ', ' + loc.longitude.toFixed(5)})\n📱 <b>رقم الطوارئ:</b> ${senderNumber}\n⏰ <b>الوقت:</b> ${timestamp}`
            ).then((res) => {
              if (res.ok) {
                setDispatchEvents((prev) => [
                  {
                    id: generateUniqueId('disp'),
                    timestamp,
                    recipient: `Telegram (@${targetChatId})`,
                    type: 'telegram_photo',
                    content: `[بث فوري تليجرام] تم رفع صورة المتسلل وإحداثيات الموقع مباشرة لحساب تليجرام المرتبط`,
                    status: 'delivered',
                  },
                  ...prev,
                ]);
              }
            });
            if (loc.source !== 'unavailable') { sendTelegramLocation(token, targetChatId, loc.latitude, loc.longitude); }
          }
        });
      });

      if (directBlackScreen) {
        setIsStealthStolenModeOpen(true);
      } else {
        // Open EmergencyLockOverlay: Plays siren + human voice alert ("هذا الهاتف مسروق أعده لصاحبه") + Fake Power-Off menu
        setIsTheftModeTriggered(true);
      }
    },
    [config.userEmail, config.telegramChatId, config.telegramBotToken, config.emergencyContactPhone]
  );
