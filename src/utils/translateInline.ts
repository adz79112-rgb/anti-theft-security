
const extraTranslations = {
  "Manage primary emergency contact & synchronous dual-SMS dispatch with automatic SIM fallback": {
    zh: "管理主要紧急联系人及支持双SIM卡自动切换的同步双短信调度",
    fr: "Gérer le contact d'urgence principal et l'envoi de SMS double synchrone avec basculement automatique de la carte SIM",
    es: "Administrar el contacto de emergencia principal y el envío de SMS dual síncrono con respaldo automático de SIM",
    ru: "Управление основным контактным лицом в случае возникновения чрезвычайной ситуации и синхронная отправка двух SMS-сообщений с автоматическим переключением SIM-карты"
  },
  "Primary contact receiving instant GPS coordinates & map link upon theft or command": {
    zh: "主要联系人在发生盗窃或收到命令时即时接收GPS坐标和地图链接",
    fr: "Le contact principal reçoit des coordonnées GPS instantanées et un lien vers la carte en cas de vol ou sur commande",
    es: "El contacto principal recibe coordenadas GPS instantáneas y un enlace de mapa en caso de robo o comando",
    ru: "Основное контактное лицо, получающее мгновенные GPS-координаты и ссылку на карту при краже или команде"
  },
  "Broadcasts GPS coordinates instantly and simultaneously upon command trigger": {
    zh: "在命令触发时立即且同时广播GPS坐标",
    fr: "Diffuse instantanément et simultanément les coordonnées GPS lors du déclenchement de la commande",
    es: "Transmite coordenadas GPS al instante y simultáneamente tras el disparo del comando",
    ru: "Мгновенно и одновременно передает GPS-координаты при запуске команды"
  },
  "Receives direct Google Maps GPS tracking link via SMS.": {
    zh: "通过短信接收直接的Google地图GPS追踪链接。",
    fr: "Reçoit un lien de suivi GPS Google Maps direct par SMS.",
    es: "Recibe un enlace de seguimiento GPS directo de Google Maps por SMS.",
    ru: "Получает прямую ссылку для отслеживания GPS на Картах Google через SMS."
  },
  "Instantly replies to the phone that sent the secret SMS trigger command.": {
    zh: "立即回复发送秘密短信触发命令的手机。",
    fr: "Répond instantanément au téléphone qui a envoyé la commande de déclenchement SMS secrète.",
    es: "Responde instantáneamente al teléfono que envió el comando secreto de disparo por SMS.",
    ru: "Мгновенно отвечает на телефон, который отправил секретную команду SMS."
  },
  "Static & Verified": {
    zh: "静态且已验证",
    fr: "Statique et vérifié",
    es: "Estático y Verificado",
    ru: "Статический и проверенный"
  },
  "Dynamic": {
    zh: "动态",
    fr: "Dynamique",
    es: "Dinámico",
    ru: "Динамический"
  },
  "Target 1: Primary Emergency Phone": {
    zh: "目标 1：主要紧急电话",
    fr: "Cible 1 : Téléphone d'urgence principal"
  },
  "Target 2: Trigger Command Sender": {
    zh: "目标 2：触发命令发送者",
    fr: "Cible 2 : Expéditeur de la commande de déclenchement"
  },
  "Synchronous Dispatch Pathway:": {
    zh: "同步调度路径：",
    fr: "Voie d'expédition synchrone :"
  },
  "DUAL-SMS ENGINE": {
    zh: "双短信引擎",
    fr: "MOTEUR DUAL-SMS"
  },
  "SIMULTANEOUS DUAL BROADCAST": {
    zh: "同步双重广播",
    fr: "DIFFUSION DOUBLE SIMULTANÉE"
  },
  "Not configured": {
    zh: "未配置"
  },
  "Save Number": {
    zh: "保存号码"
  },
  "Verified Emergency Phone Number": {
    zh: "已验证的紧急电话号码"
  },
  "SMS & Emergency Dispatch": {
    zh: "短信与紧急调度"
  },
  "Synchronous Dual SMS Dispatch Engine": {
    zh: "同步双短信调度引擎"
  }
};
import generatedDict from './generated_dict_full.json';
export const translationsMap: Record<string, Record<string, string>> = {
  "SMS & Emergency Dispatch": { zh: "短信与紧急调度", fr: "SMS & Expédition d'urgence", es: "SMS y Despacho de Emergencia", ru: "SMS и Экстренная Отправка", ur: "ایس ایم ایس اور ایمرجنسی ڈسپیچ", fa: "پیامک و اعزام اضطراری" },
  "Emergency Number Active": { zh: "紧急号码已激活", fr: "Numéro d'urgence actif", es: "Número de Emergencia Activo", ru: "Экстренный номер активен", ur: "ایمرجنسی نمبر فعال", fa: "شماره اضطراری فعال" },
  "Unsaved": { zh: "未保存", fr: "Non enregistré", es: "No guardado", ru: "Не сохранено", ur: "محفوظ نہیں", fa: "ذخیره نشده" },
  "Verified Emergency Phone Number": { zh: "已验证的紧急电话号码", fr: "Numéro de téléphone d'urgence vérifié", es: "Número de Teléfono de Emergencia Verificado", ru: "Подтвержденный экстренный номер телефона", ur: "تصدیق شدہ ایمرجنسی فون نمبر", fa: "شماره تلفن اضطراری تأیید شده" },
  "Save Number": { zh: "保存号码", fr: "Enregistrer le numéro", es: "Guardar Número", ru: "Сохранить номер", ur: "نمبر محفوظ کریں", fa: "ذخیره شماره" },
  "Test": { zh: "测试", fr: "Test", es: "Prueba", ru: "Тест", ur: "ٹیسٹ", fa: "آزمایش" },
  "Synchronous Dual SMS Dispatch Engine": { zh: "同步双短信调度引擎", fr: "Moteur d'expédition SMS double synchrone", es: "Motor de Despacho SMS Dual Síncrono", ru: "Синхронный движок отправки двойных SMS", ur: "ہم وقت ساز ڈوئل ایس ایم ایس ڈسپیچ انجن", fa: "موتور اعزام پیامک دوگانه همزمان" },
  "Synchronous Dispatch Pathway:": { zh: "同步调度路径：", fr: "Voie d'expédition synchrone :", es: "Vía de Despacho Síncrono:", ru: "Путь синхронной отправки:", ur: "ہم وقت ساز ڈسپیچ کا راستہ:", fa: "مسیر اعزام همزمان:" },
  "Target 1: Primary Emergency Phone": { zh: "目标 1：主要紧急电话", fr: "Cible 1 : Téléphone d'urgence principal", es: "Objetivo 1: Teléfono de Emergencia Principal", ru: "Цель 1: Основной экстренный телефон", ur: "ہدف 1: بنیادی ایمرجنسی فون", fa: "هدف ۱: تلفن اضطراری اصلی" },
  "Not configured": { zh: "未配置", fr: "Non configuré", es: "No configurado", ru: "Не настроено", ur: "ترتیب نہیں دیا گیا", fa: "پیکربندی نشده" },
  "Target 2: Trigger Command Sender": { zh: "目标 2：触发命令发送者", fr: "Cible 2 : Expéditeur de la commande de déclenchement", es: "Objetivo 2: Remitente del Comando de Activación", ru: "Цель 2: Отправитель команды триггера", ur: "ہدف 2: ٹرگر کمانڈ بھیجنے والا", fa: "هدف ۲: فرستنده فرمان ماشه" },
  "Simulated Command Sender Number:": { zh: "模拟命令发送者号码：", fr: "Numéro d'expéditeur de commande simulé :", es: "Número de Remitente de Comando Simulado:", ru: "Имитированный номер отправителя команды:", ur: "نقل شدہ کمانڈ بھیجنے والے کا نمبر:", fa: "شماره فرستنده فرمان شبیه‌سازی شده:" },
  "Broadcasting Dual SMS...": { zh: "正在广播双短信...", fr: "Diffusion de SMS double...", es: "Transmitiendo SMS Dual...", ru: "Рассылка двойных SMS...", ur: "ڈوئل ایس ایم ایس نشر کیا جا رہا ہے...", fa: "در حال پخش پیامک دوگانه..." },
  "✓ Dual SMS Broadcast Completed Successfully!": { zh: "✓ 双短信广播成功完成！", fr: "✓ Diffusion SMS double terminée avec succès !", es: "✓ ¡Transmisión SMS Dual Completada con Éxito!", ru: "✓ Рассылка двойных SMS успешно завершена!", ur: "✓ ڈوئل ایس ایم ایس براڈکاسٹ کامیابی سے مکمل ہو گیا!", fa: "✓ پخش پیامک دوگانه با موفقیت به پایان رسید!" },
  
  // Gmail Security Card
  "Please enter a valid email address!": { zh: "请输入有效的电子邮件地址！", fr: "Veuillez entrer une adresse e-mail valide !", es: "¡Por favor, introduzca una dirección de correo electrónico válida!", ru: "Пожалуйста, введите действительный адрес электронной почты!" },
  "Please enter the OTP!": { zh: "请输入OTP验证码！", fr: "Veuillez entrer le code OTP !", es: "¡Por favor, introduzca el OTP!", ru: "Пожалуйста, введите OTP!" },
  "✓ Email verified & bound successfully!": { zh: "✓ 邮箱验证并绑定成功！", fr: "✓ E-mail vérifié et lié avec succès !", es: "✓ ¡Correo electrónico verificado y vinculado con éxito!", ru: "✓ Электронная почта успешно подтверждена и привязана!" },
  "Please enter the OTP sent to old email!": { zh: "请输入发送到旧邮箱的验证码！", fr: "Veuillez entrer l'OTP envoyé à l'ancien e-mail !", es: "¡Por favor, introduzca el OTP enviado al correo antiguo!", ru: "Пожалуйста, введите OTP, отправленный на старую электронную почту!" },
  "Please enter a valid new email address!": { zh: "请输入有效的新电子邮件地址！", fr: "Veuillez entrer une nouvelle adresse e-mail valide !", es: "¡Por favor, introduzca una nueva dirección de correo electrónico válida!", ru: "Пожалуйста, введите новый действительный адрес электронной почты!" },
  "Emergency User Gmail (Stealth Reports)": { zh: "紧急用户Gmail（隐身报告）", fr: "Gmail de l'utilisateur d'urgence (Rapports furtifs)", es: "Gmail del Usuario de Emergencia (Informes Ocultos)", ru: "Экстренный пользовательский Gmail (Скрытые отчеты)" },
  "72h Lock Protected": { zh: "72小时锁定保护", fr: "Protégé par verrouillage 72h", es: "Protegido con Bloqueo de 72h", ru: "Защищено 72-часовой блокировкой" },
  "Verified & Bound": { zh: "已验证并绑定", fr: "Vérifié et lié", es: "Verificado y Vinculado", ru: "Подтверждено и привязано" },
  "Unverified": { zh: "未验证", fr: "Non vérifié", es: "No verificado", ru: "Не подтверждено" },
  "Current Active Recipient:": { zh: "当前活跃接收者：", fr: "Destinataire actif actuel :", es: "Destinatario Activo Actual:", ru: "Текущий активный получатель:" },
  "Pending New Email:": { zh: "待处理的新邮箱：", fr: "Nouvel e-mail en attente :", es: "Nuevo Correo Electrónico Pendiente:", ru: "Ожидающий новый адрес электронной почты:" },
  "Cancel Request & Keep Old Email": { zh: "取消请求并保留旧邮箱", fr: "Annuler la demande et conserver l'ancien e-mail", es: "Cancelar Solicitud y Mantener Correo Antiguo", ru: "Отменить запрос и сохранить старую электронную почту" },
  "Fast-forward 72h (Test)": { zh: "快进72小时（测试）", fr: "Avance rapide 72h (Test)", es: "Avanzar 72h (Prueba)", ru: "Перемотка на 72ч (Тест)" },
  "Request Email Change": { zh: "请求更改邮箱", fr: "Demander un changement d'e-mail", es: "Solicitar Cambio de Correo", ru: "Запросить изменение электронной почты" },
  "Locked": { zh: "已锁定", fr: "Verrouillé", es: "Bloqueado", ru: "Заблокировано" },
  "Sending Verification Code...": { zh: "正在发送验证码...", fr: "Envoi du code de vérification...", es: "Enviando Código de Verificación...", ru: "Отправка кода подтверждения..." },
  "Confirm & Bind Email": { zh: "确认并绑定邮箱", fr: "Confirmer et lier l'e-mail", es: "Confirmar y Vincular Correo", ru: "Подтвердить и привязать электронную почту" },
  "Enter 6-Digit OTP Code:": { zh: "输入6位OTP验证码：", fr: "Entrez le code OTP à 6 chiffres :", es: "Ingrese el Código OTP de 6 dígitos:", ru: "Введите 6-значный код OTP:" },
  "Sent to:": { zh: "发送至：", fr: "Envoyé à :", es: "Enviado a:", ru: "Отправлено на:" },
  "Quick preview OTP:": { zh: "快速预览OTP：", fr: "Aperçu rapide OTP :", es: "Vista previa rápida OTP:", ru: "Быстрый просмотр OTP:" },
  "Auto-fill": { zh: "自动填充", fr: "Remplissage automatique", es: "Autocompletar", ru: "Автозаполнение" },
  "Confirm": { zh: "确认", fr: "Confirmer", es: "Confirmar", ru: "Подтвердить" },
  "Resend Code": { zh: "重新发送验证码", fr: "Renvoyer le code", es: "Reenviar Código", ru: "Отправить код еще раз" },
  "Cancel": { zh: "取消", fr: "Annuler", es: "Cancelar", ru: "Отмена" },
  "Current registered email receiving OTP:": { zh: "接收OTP的当前注册邮箱：", fr: "E-mail enregistré actuel recevant l'OTP :", es: "Correo registrado actual que recibe OTP:", ru: "Текущая зарегистрированная электронная почта, получающая OTP:" },
  "Sending Approval OTP...": { zh: "正在发送批准OTP...", fr: "Envoi de l'OTP d'approbation...", es: "Enviando OTP de Aprobación...", ru: "Отправка OTP для одобрения..." },
  "Sent approval OTP:": { zh: "已发送的批准OTP：", fr: "OTP d'approbation envoyé :", es: "OTP de aprobación enviado:", ru: "Отправленный OTP для одобрения:" },
  "What happens after approval?": { zh: "批准后会发生什么？", fr: "Que se passe-t-il après approbation ?", es: "¿Qué sucede después de la aprobación?", ru: "Что происходит после одобрения?" },
  "Back": { zh: "返回", fr: "Retour", es: "Atrás", ru: "Назад" },
  "Start 72h Cooldown": { zh: "开始72小时冷却", fr: "Démarrer le temps de recharge de 72h", es: "Iniciar Enfriamiento de 72h", ru: "Начать 72-часовое время восстановления" },
  
  // Dashboard / Cyberpunk Console
  "Trigger Command:": { zh: "触发命令：", fr: "Commande de déclenchement :" },
  "ARMED": { zh: "已布防", fr: "ARMÉ" },
  "CLICK TO DISARM": { zh: "点击撤防", fr: "CLIQUER POUR DÉSARMER" },
  "STANDBY": { zh: "待机", fr: "EN VEILLE" },
  "CLICK TO ARM": { zh: "点击布防", fr: "CLIQUER POUR ARMER" },
  "Executing Command Alert...": { zh: "正在执行命令警报...", fr: "Exécution de l'alerte de commande..." },
  "Command Alert Executed Successfully!": { zh: "命令警报执行成功！", fr: "Alerte de commande exécutée avec succès !" },
  "A) Reverse SMS (GPS only):": { zh: "A) 反向短信（仅GPS）：", fr: "A) SMS inversé (GPS uniquement) :" },
  "✓ Direct GPS link only": { zh: "✓ 仅限直接GPS链接", fr: "✓ Lien GPS direct uniquement" },
  "B) User Gmail Report:": { zh: "B) 用户Gmail报告：", fr: "B) Rapport Gmail utilisateur :" },
  "✓ Full report sent to Gmail": { zh: "✓ 完整报告已发送至Gmail", fr: "✓ Rapport complet envoyé à Gmail" },
  "C) Telegram Bot:": { zh: "C) Telegram 机器人：", fr: "C) Bot Telegram :" },
  "Not set": { zh: "未设置", fr: "Non défini" },
  "Telegram Chat ID (Optional):": { zh: "Telegram Chat ID (可选)：", fr: "ID de chat Telegram (Optionnel) :" },
  "Enter Telegram Chat ID": { zh: "输入 Telegram Chat ID", fr: "Entrer l'ID de chat Telegram" },
  "Default Bot Token": { zh: "默认机器人令牌", fr: "Jeton de bot par défaut" },
  
  // Stealth Status Badge / Stolen Screen
  "Stealth Alert Badge": { zh: "隐身警报徽章", fr: "Badge d'alerte furtif" },
  "Reset counter": { zh: "重置计数器", fr: "Réinitialiser le compteur" },
  "Next dispatch:": { zh: "下次调度：", fr: "Prochaine expédition :" },
  "Powering off...": { zh: "正在关机...", fr: "Mise hors tension..." },
  "Stealth Stolen Mode Active": { zh: "隐身被盗模式已激活", fr: "Mode furtif volé actif" },
  "Cycle": { zh: "周期", fr: "Cycle" },
  "Direct Dispatch Channels:": { zh: "直接调度频道：", fr: "Canaux d'expédition directs :" },
  "Touch fingerprint sensor to unlock": { zh: "触摸指纹传感器以解锁", fr: "Touchez le capteur d'empreintes digitales pour déverrouiller" },
  
  // Telegram Config
  "Toggle Telegram Alerts": { zh: "切换Telegram警报", fr: "Basculer les alertes Telegram" },
  "Bot Token": { zh: "机器人令牌", fr: "Jeton de bot" },
  "Chat ID": { zh: "聊天ID", fr: "ID de chat" },
  "Testing...": { zh: "正在测试...", fr: "Test en cours..." },
  "Test Connection": { zh: "测试连接", fr: "Tester la connexion" },
  "Telegram Bot Alert Channel": { zh: "Telegram机器人警报频道", fr: "Canal d'alerte de bot Telegram" },
  "Chat ID:": { zh: "聊天ID：", fr: "ID de chat :" },
  
  // App Entry Gate & Anti-Uninstall
  "Anti-Uninstall & Device Admin Policy": { zh: "防卸载和设备管理策略", fr: "Politique anti-désinstallation et d'administration de l'appareil" },
  "Device Admin Policy:": { zh: "设备管理策略：", fr: "Politique d'administration de l'appareil :" },
  "Biometric Auth Unit:": { zh: "生物识别认证单元：", fr: "Unité d'authentification biométrique :" },
  "OK (Uninstall)": { zh: "确定（卸载）", fr: "OK (Désinstaller)" },
  "Cannot Uninstall Package": { zh: "无法卸载包", fr: "Impossible de désinstaller le paquet" },
  "Attempt Deactivation & Verify": { zh: "尝试停用并验证", fr: "Tenter de désactiver et vérifier" },
  "Cancel & Return": { zh: "取消并返回", fr: "Annuler et retourner" },
  "Scanning biometric credentials...": { zh: "正在扫描生物识别凭据...", fr: "Analyse des informations d'identification biométriques..." },
  "Biometrics Verified!": { zh: "生物识别已验证！", fr: "Biométrie vérifiée !" },
  
  // Gmail Tab Screen
  "Failed to send email": { zh: "发送电子邮件失败", fr: "Échec de l'envoi de l'e-mail" },
  "Error sending test email": { zh: "发送测试电子邮件时出错", fr: "Erreur lors de l'envoi de l'e-mail de test" },
  "Gmail Security Reports Settings": { zh: "Gmail安全报告设置", fr: "Paramètres des rapports de sécurité Gmail" },
  "Sending Test...": { zh: "正在发送测试...", fr: "Envoi du test en cours..." },
  "Send Test Email Report": { zh: "发送测试电子邮件报告", fr: "Envoyer un rapport d'e-mail de test" },
  
  // Network / Others
  "Scanning Carriers...": { zh: "正在扫描运营商...", fr: "Analyse des opérateurs..." },
  "Auto-Detect Carriers": { zh: "自动检测运营商", fr: "Détection automatique des opérateurs" },
  
  // Dispatch Log
  "Pathway 1: Reverse GPS SMS": { zh: "路径 1：反向 GPS 短信", fr: "Voie 1 : SMS GPS inversé" },
  "Pathway 2: Gmail Report": { zh: "路径 2：Gmail 报告", fr: "Voie 2 : Rapport Gmail" },
  "Stealth Mode: Periodic Dispatch": { zh: "隐身模式：定期调度", fr: "Mode furtif : Expédition périodique" },
  "System Ping": { zh: "系统 Ping", fr: "Ping système" },
  "Telegram: Alert": { zh: "Telegram：警报", fr: "Telegram : Alerte" },
  "Telegram: GPS Location": { zh: "Telegram：GPS 位置", fr: "Telegram : Localisation GPS" },
  "Telegram: Photo": { zh: "Telegram：照片", fr: "Telegram : Photo" },
  "WhatsApp: Live Emergency Report": { zh: "WhatsApp：实时紧急报告", fr: "WhatsApp : Rapport d'urgence en direct" },
  "Camera Report": { zh: "相机报告", fr: "Rapport de caméra" },
  "Dual-SIM: Redundant SMS": { zh: "双卡：冗余短信", fr: "Double-SIM : SMS redondant" },
  "Emergency SMS": { zh: "紧急短信", fr: "SMS d'urgence" }
,
};

export function translateInline(lang: string, enText: string, arText: string): string {
  if (lang === 'ar') return arText;
  if (lang === 'en' || lang === 'en-GB') return enText;
  
  const dict = (translationsMap as Record<string, Record<string, string>>)[enText] || 
               (extraTranslations as Record<string, Record<string, string>>)[enText] || 
               (generatedDict as Record<string, Record<string, string>>)[enText];
  if (dict && dict[lang]) {
    return dict[lang];
  }
  
  return enText; // Default to English
}
