import { ParsedTrigger, SecurityConfig } from '../types';

export function parseTriggerMessage(
  rawInput: string,
  config: SecurityConfig,
  senderNumber: string = ''
): ParsedTrigger {
  const trimmed = rawInput.trim();
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 1. Direct Secret Code Check (e.g., "#TRACK", "#track", or custom trigger command)
  const targetCommand = (config.triggerCommand || '#TRACK').trim().toLowerCase();
  const normalizedInput = trimmed.toLowerCase();

  const isDirectTrackCommand =
    normalizedInput === targetCommand ||
    normalizedInput === '#track' ||
    normalizedInput === 'track' ||
    normalizedInput === '#تتبع' ||
    normalizedInput.includes('#track') ||
    normalizedInput.includes(targetCommand);

  if (isDirectTrackCommand) {
    return {
      rawMessage: rawInput,
      code: config.code,
      secretKey: config.secretKey,
      keyword: targetCommand.toUpperCase(),
      action: 'track',
      isValid: true,
      senderNumber,
      timestamp,
    };
  }

  // 2. Structured Format: [3 numbers].[3 letters].[Action Keyword]
  // Allow dots or periods, allow varying whitespace around dots
  const parts = trimmed.split('.').map((p) => p.trim());

  if (parts.length < 3) {
    return {
      rawMessage: rawInput,
      code: parts[0] || '',
      secretKey: parts[1] || '',
      keyword: parts[2] || '',
      action: 'unknown',
      isValid: false,
      errorReason: `الصيغة غير صالحة: أرسل الكود السري "${config.triggerCommand || '#TRACK'}" مباشرة، أو بالصيغة [3 أرقام].[3 أحرف].[الأمر]`,
      senderNumber,
      timestamp,
    };
  }

  const [inputCode, inputKey, ...rest] = parts;
  const inputKeyword = rest.join('.').trim().toLowerCase();

  // Validate Code (3 digits)
  if (!/^\d{3}$/.test(inputCode)) {
    return {
      rawMessage: rawInput,
      code: inputCode,
      secretKey: inputKey,
      keyword: inputKeyword,
      action: 'unknown',
      isValid: false,
      errorReason: `رمز الأمان غير صالح: المتوقع 3 أرقام، المستلم "${inputCode}"`,
      senderNumber,
      timestamp,
    };
  }

  // Validate Secret Key (3 letters)
  if (!/^[a-zA-Z]{3}$/.test(inputKey)) {
    return {
      rawMessage: rawInput,
      code: inputCode,
      secretKey: inputKey,
      keyword: inputKeyword,
      action: 'unknown',
      isValid: false,
      errorReason: `المفتاح السري غير صالح: المتوقع 3 أحرف، المستلم "${inputKey}"`,
      senderNumber,
      timestamp,
    };
  }

  // Check matching against configured security credentials
  if (inputCode !== config.code) {
    return {
      rawMessage: rawInput,
      code: inputCode,
      secretKey: inputKey,
      keyword: inputKeyword,
      action: 'unknown',
      isValid: false,
      errorReason: `رمز الأمان غير مطابق للرمز المضبوط بالهاتف (Expected: ${config.code}, Got: ${inputCode})`,
      senderNumber,
      timestamp,
    };
  }

  if (inputKey.toLowerCase() !== config.secretKey.toLowerCase()) {
    return {
      rawMessage: rawInput,
      code: inputCode,
      secretKey: inputKey,
      keyword: inputKeyword,
      action: 'unknown',
      isValid: false,
      errorReason: `المفتاح السري غير مطابق للمفتاح المضبوط (Expected: ${config.secretKey}, Got: ${inputKey})`,
      senderNumber,
      timestamp,
    };
  }

  // Validate Action Keyword
  // Theft keywords: سرقة, سارقة, theft
  // Camera keywords: كاميرا, كاميرة, كاميره, camera
  // Track keywords: #track, track, تتبع, #تتبع
  const isTrack =
    ['#track', 'track', 'تتبع', '#تتبع'].includes(inputKeyword) ||
    inputKeyword === targetCommand;
  const isTheft = ['سرقة', 'سارقة', 'theft'].includes(inputKeyword);
  const isCamera = ['كاميرا', 'كاميرة', 'كاميره', 'camera'].includes(inputKeyword);

  if (isTrack) {
    return {
      rawMessage: rawInput,
      code: inputCode,
      secretKey: inputKey,
      keyword: inputKeyword,
      action: 'track',
      isValid: true,
      senderNumber,
      timestamp,
    };
  }

  if (isTheft) {
    return {
      rawMessage: rawInput,
      code: inputCode,
      secretKey: inputKey,
      keyword: inputKeyword,
      action: 'theft',
      isValid: true,
      senderNumber,
      timestamp,
    };
  }

  if (isCamera) {
    return {
      rawMessage: rawInput,
      code: inputCode,
      secretKey: inputKey,
      keyword: inputKeyword,
      action: 'camera',
      isValid: true,
      senderNumber,
      timestamp,
    };
  }

  return {
    rawMessage: rawInput,
    code: inputCode,
    secretKey: inputKey,
    keyword: inputKeyword,
    action: 'unknown',
    isValid: false,
    errorReason: `الأمر غير معروف: "${inputKeyword}". الأوامر المدعومة هي: "#TRACK" أو "سرقة" أو "كاميرا"`,
    senderNumber,
    timestamp,
  };
}
