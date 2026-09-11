const fs = require('fs');
let content = fs.readFileSync('src/utils/translateInline.ts', 'utf-8');

// The easiest way is to use regex or simply rewrite translationsMap to deduplicate
// But since this is TS, we can't just eval. Let's write a small regex to remove the duplicate extraStr I added, then we'll just merge carefully.
// Wait, TS doesn't care if it's merged, but I'll just remove the whole injected part and re-inject carefully.

const startBad = content.lastIndexOf('  "Manage primary emergency contact & synchronous dual-SMS dispatch');
if (startBad !== -1) {
  const lastBrace = content.indexOf('};', startBad);
  content = content.substring(0, startBad) + content.substring(lastBrace);
}

// Now write it clean. Let's just create a `const extraTranslations = { ... }` object, then merge inside the function!
content = content.replace('const dict = (translationsMap as Record<string, Record<string, string>>)[enText] || (generatedDict as Record<string, Record<string, string>>)[enText];', 'const dict = (translationsMap as Record<string, Record<string, string>>)[enText] || (extraTranslations as Record<string, Record<string, string>>)[enText] || (generatedDict as Record<string, Record<string, string>>)[enText];');

content = `
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
` + content;

fs.writeFileSync('src/utils/translateInline.ts', content);

let screen = fs.readFileSync('src/components/SmsEmergencyTabScreen.tsx', 'utf-8');
screen = screen.replace(/>\s*DUAL-SMS ENGINE\s*</g, ">{translateInline(lang, 'DUAL-SMS ENGINE', 'DUAL-SMS ENGINE')}<");
screen = screen.replace(/>\s*SIMULTANEOUS DUAL BROADCAST\s*</g, ">{translateInline(lang, 'SIMULTANEOUS DUAL BROADCAST', 'SIMULTANEOUS DUAL BROADCAST')}<");
fs.writeFileSync('src/components/SmsEmergencyTabScreen.tsx', screen);

