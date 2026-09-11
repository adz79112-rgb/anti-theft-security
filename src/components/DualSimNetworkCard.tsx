import React, { useState, useEffect } from 'react';
import { translateInline } from '../utils/translateInline';
import {
  Smartphone,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Send,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  ShieldAlert,
  Zap,
  Cpu,
  Layers,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Language, DispatchEvent } from '../types';
import {
  getNetworkAndSimState,
  saveNetworkAndSimState,
  inspectAndAutoSwitchMobileData,
  sendDualSimSmsFallback,
  autoDetectDeviceCarriers,
  updateSimCarrier,
  KNOWN_CARRIER_PRESETS,
  CarrierPreset,
  NetworkManagementState,
  DualSimSmsResult,
} from '../utils/simManager';

interface DualSimNetworkCardProps {
  lang: Language;
  onTriggerStealthStolen: () => void;
  onLogDispatch: (event: Omit<DispatchEvent, 'id'>) => void;
}

export const DualSimNetworkCard: React.FC<DualSimNetworkCardProps> = ({
  lang,
  onTriggerStealthStolen,
  onLogDispatch,
}) => {
  const [networkState, setNetworkState] = useState<NetworkManagementState | null>(null);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [isScanningCarriers, setIsScanningCarriers] = useState(false);
  const [testResult, setTestResult] = useState<DualSimSmsResult | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<1 | 2 | null>(null);

  const refreshState = async () => {
    const state = await getNetworkAndSimState();
    setNetworkState(state);
  };

  useEffect(() => {
    refreshState();
  }, []);

  // Automatic Carrier Detection (TelephonyManager API Simulation)
  const handleAutoDetectCarriers = async () => {
    setIsScanningCarriers(true);
    setActionNotice(null);

    try {
      const result = await autoDetectDeviceCarriers();
      setNetworkState(result.state);
      setActionNotice(result.log);

      onLogDispatch({
        timestamp: new Date().toLocaleTimeString(),
        recipient: 'Carrier Detector (TelephonyManager)',
        type: 'location_ping',
        content: result.log,
        status: 'delivered',
      });
    } finally {
      setTimeout(() => {
        setIsScanningCarriers(false);
      }, 500);
    }
  };

  const handleSelectPreset = async (slot: 1 | 2, preset: CarrierPreset) => {
    const updated = await updateSimCarrier(
      slot,
      preset.name,
      `${preset.code} (${preset.name})`,
      preset.networkType
    );
    setNetworkState(updated);
    setEditingSlot(null);
    const msg = `${translateInline(lang, 'SIM ${slot} carrier updated to: ${preset.name} (${preset.networkType})', 'تم تحديث مشغل SIM ${slot} إلى: ${preset.name} (${preset.networkType})')}`;
    setActionNotice(msg);
  };

  // Simulate toggling mobile data to test auto-recovery
  const handleToggleMobileData = async () => {
    if (!networkState) return;
    const newState: NetworkManagementState = {
      ...networkState,
      isMobileDataEnabled: !networkState.isMobileDataEnabled,
      isInternetConnected: !networkState.isMobileDataEnabled,
    };
    setNetworkState(newState);
    await saveNetworkAndSimState(newState);

    if (!newState.isMobileDataEnabled) {
      setActionNotice(
        translateInline(lang, 'Mobile data turned OFF! When a theft command arrives, DroidGuard will auto-enable it on the best SIM.', 'تم إيقاف بيانات الهاتف يدوياً! عند استلام أمر السرقة، سيقوم التطبيق بإعادة تفعيلها آلياً على الشريحة ذات الباقة الأكبر.')
      );
    } else {
      setActionNotice(
        translateInline(lang, 'Mobile data turned ON.', 'تم تشغيل بيانات الهاتف.')
      );
    }
  };

  // Test Auto-Switching
  const handleTriggerAutoSwitch = async () => {
    const res = await inspectAndAutoSwitchMobileData();
    await refreshState();
    setActionNotice(res.reason);

    onLogDispatch({
      timestamp: new Date().toLocaleTimeString(),
      recipient: `SIM Manager`,
      type: 'location_ping',
      content: `${translateInline(lang, '[Smart Data Check] ${res.reason}', '[فحص البيانات الذكية] ${res.reason}')}`,
      status: 'delivered',
    });
  };

  // Test Dual-SIM SMS Fallback
  const handleTestDualSimSms = async () => {
    setIsTestingSms(true);
    try {
      const recipient = '+213 661 00 00 00';
      const mapsUrl = 'https://maps.google.com/?q=36.7538,3.0588';
      const body = `${translateInline(lang, '[DroidGuard Security Test] Dual GPS location dispatch via SIM 1 and SIM 2: ${mapsUrl}', '[تجربة أمان DroidGuard] فحص إرسال موقع GPS المزدوج عبر SIM 1 و SIM 2: ${mapsUrl}')}`;
      const res = await sendDualSimSmsFallback(recipient, body);
      setTestResult(res);
      setActionNotice(res.summary);

      // Log both SMS dispatches
      onLogDispatch({
        timestamp: new Date().toLocaleTimeString(),
        recipient: `${recipient} (SIM 1)`,
        type: 'emergency_sms',
        content: `${translateInline(lang, '[Dual-SIM SMS 1] Dispatched via SIM 1 (${res.sim1Details.carrier})', '[Dual-SIM SMS 1] تم الإرسال عبر SIM 1 (${res.sim1Details.carrier})')}`,
        status: 'delivered',
      });
      onLogDispatch({
        timestamp: new Date().toLocaleTimeString(),
        recipient: `${recipient} (SIM 2 - Fallback)`,
        type: 'emergency_sms',
        content: `${translateInline(lang, '[Dual-SIM SMS 2 Fallback] Dispatched via SIM 2 (${res.sim2Details.carrier})', '[Dual-SIM SMS 2 احتياطية] تم الإرسال عبر SIM 2 (${res.sim2Details.carrier})')}`,
        status: 'delivered',
      });
    } finally {
      setIsTestingSms(false);
    }
  };

  if (!networkState) return null;

  const [sim1, sim2] = networkState.simCards;

  const getCarrierBadgeColor = (carrierName: string) => {
    const lower = carrierName.toLowerCase();
    if (lower.includes('mobilis')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (lower.includes('djezzy')) return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    if (lower.includes('ooredoo')) return 'bg-red-500/20 text-red-300 border-red-500/40';
    if (lower.includes('stc')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    if (lower.includes('mobily')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  };

  return (
    <div
      id="dual-sim-network-management-card"
      className="bg-slate-900/80 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 backdrop-blur-md relative overflow-hidden"
    >
      {/* Decorative gradient border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                {translateInline(lang, 'Dual-SIM & Carrier Network Management', 'إدارة شرائح الاتصال المزدوجة ومزود الخدمة (Dual-SIM & Carrier)')}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono-code font-bold">
                Auto-Carrier
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {translateInline(lang, 'Auto-detection of Carrier Names (Mobilis, Djezzy, Ooredoo) with Dual-SIM SMS Fallback', 'التعرف التلقائي على اسم المشغل (Mobilis, Djezzy, Ooredoo) وإرسال GPS عبر الشريحتين')}
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Carrier Auto-Detect Button */}
          <button
            type="button"
            id="btn-auto-detect-carriers"
            onClick={handleAutoDetectCarriers}
            disabled={isScanningCarriers}
            className="px-3.5 py-2 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningCarriers ? 'animate-spin' : ''}`} />
            <span>
              {isScanningCarriers
                ? translateInline(lang, 'Scanning Carriers...', 'جاري فحص المشغل...')
                : translateInline(lang, 'Auto-Detect Carriers', 'فحص واكتشاف المشغل تلقائياً')}
            </span>
          </button>

          {/* Quick Launch Stealth Stolen Mode Button */}
          <button
            type="button"
            id="btn-launch-stealth-stolen-mode"
            onClick={onTriggerStealthStolen}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center gap-2 transition cursor-pointer active:scale-95"
          >
            <EyeOff className="w-4 h-4" />
            <span>
              {translateInline(lang, 'Launch Stealth Mode', 'تفعيل وضع السرقة (Stealth Mode)')}
            </span>
          </button>
        </div>
      </div>

      {/* SIM Cards Grid (SIM 1 & SIM 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SIM 1 Card */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            networkState.activeDataSlot === 1
              ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
              : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-slate-100">{translateInline(lang, 'SIM 1 Slot', 'منفذ الشريحة 1 (SIM 1)')}</span>
            </div>
            <span className="text-[10px] font-mono-code px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{translateInline(lang, 'Primary SIM', 'الشريحة الأساسية')}</span>
            </span>
          </div>

          {/* Prominently Highlighted Detected Carrier */}
          <div className="py-6 px-4 bg-slate-950/80 rounded-xl border border-slate-800/90 flex flex-col items-center justify-center space-y-3">
            <span
              className={`text-lg font-bold px-4 py-1.5 rounded-lg border ${getCarrierBadgeColor(
                sim1.carrier
              )}`}
            >
              {sim1.carrier}
            </span>
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{translateInline(lang, 'Ready to use', 'جاهزة للاستخدام')}</span>
            </div>
          </div>

          {/* Preset Selector Dropdown for SIM 1 */}
          <div className="mt-3 pt-3 border-t border-slate-800/70">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">${translateInline(lang, 'Quick Carrier Switch:', 'تغيير المشغل السريع:')}</span>
              <button
                type="button"
                onClick={() => setEditingSlot(editingSlot === 1 ? null : 1)}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>${translateInline(lang, 'Select another carrier', 'اختيار مشغل آخر')}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            {editingSlot === 1 && (
              <div className="grid grid-cols-2 gap-1.5 mt-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                {KNOWN_CARRIER_PRESETS.map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleSelectPreset(1, preset)}
                    className="p-1.5 text-[11px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-start border border-slate-800 transition cursor-pointer font-mono-code"
                  >
                    <span className="font-bold block text-emerald-400">{preset.name}</span>
                    <span className="text-[9px] text-slate-500">{preset.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SIM 2 Card (Fallback) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            networkState.activeDataSlot === 2
              ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
              : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-sm text-slate-100">{translateInline(lang, 'SIM 2 Slot', 'منفذ الشريحة 2 (SIM 2)')}</span>
            </div>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <span>{translateInline(lang, 'Emergency Backup SIM', 'شريحة الطوارئ الاحتياطية')}</span>
            </span>
          </div>

          {/* Prominently Highlighted Detected Carrier for SIM 2 */}
          <div className="py-6 px-4 bg-slate-950/80 rounded-xl border border-slate-800/90 flex flex-col items-center justify-center space-y-3">
            <span
              className={`text-lg font-bold px-4 py-1.5 rounded-lg border ${getCarrierBadgeColor(
                sim2.carrier
              )}`}
            >
              {sim2.carrier}
            </span>
            <div className="flex items-center gap-1.5 text-yellow-400 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>{translateInline(lang, 'Emergency Backup Only', 'شريحة احتياطية للطوارئ فقط')}</span>
            </div>
          </div>

          {/* Preset Selector Dropdown for SIM 2 */}
          <div className="mt-3 pt-3 border-t border-slate-800/70">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">${translateInline(lang, 'Quick Carrier Switch:', 'تغيير المشغل السريع:')}</span>
              <button
                type="button"
                onClick={() => setEditingSlot(editingSlot === 2 ? null : 2)}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>${translateInline(lang, 'Select another carrier', 'اختيار مشغل آخر')}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            {editingSlot === 2 && (
              <div className="grid grid-cols-2 gap-1.5 mt-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                {KNOWN_CARRIER_PRESETS.map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleSelectPreset(2, preset)}
                    className="p-1.5 text-[11px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-start border border-slate-800 transition cursor-pointer font-mono-code"
                  >
                    <span className="font-bold block text-cyan-400">{preset.name}</span>
                    <span className="text-[9px] text-slate-500">{preset.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Network Controls & Status */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {networkState.isMobileDataEnabled ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Wifi className="w-4 h-4" />
              <span>{translateInline(lang, 'Mobile Data Active', 'بيانات الهاتف نشطة وتعمل')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <WifiOff className="w-4 h-4" />
              <span>{translateInline(lang, 'Auto Data Standby (Armed for Theft)', 'بيانات الهاتف في وضع الاستعداد التلقائي')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono-code text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{translateInline(lang, 'Auto Dual-SIM Fallback Ready', 'جاهز للتحويل التلقائي بين الشريحتين')}</span>
        </div>
      </div>

      {/* Action notice banner */}
      {actionNotice && (
        <div className="px-4 py-2.5 rounded-2xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 text-xs font-mono-code flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}
    </div>
  );
};
