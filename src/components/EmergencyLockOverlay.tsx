import { translateInline } from '../utils/translateInline';
import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, ShieldAlert, MapPin, Send, ExternalLink, Smartphone, AlertTriangle, Power, RotateCcw, PhoneCall, Mic } from 'lucide-react';
import { siren } from '../utils/audio';
import { voiceAlert } from '../utils/voiceAlert';
import { DeviceAuthModal } from './DeviceAuthModal';
import { LocationResult } from '../utils/location';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';

interface EmergencyLockOverlayProps {
  isOpen: boolean;
  onDismiss: () => void;
  triggerSender: string;
  location: LocationResult | null;
  lang: Language;
  onTriggerFakePowerOff?: () => void;
}

export const EmergencyLockOverlay: React.FC<EmergencyLockOverlayProps> = ({
  isOpen,
  onDismiss,
  triggerSender,
  location,
  lang,
  onTriggerFakePowerOff,
}) => {
  const t = getTranslation(lang);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [alarmDecibels, setAlarmDecibels] = useState(105);
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  // Stop siren and voice and dismiss lock overlay upon successful OS authentication
  const handleAuthSuccess = useCallback(() => {
    siren.stop();
    voiceAlert.stop();
    setShowAuthDialog(false);
    onDismiss();
  }, [onDismiss]);

  // Handle fake power off action by thief
  const handleConfirmFakePowerOff = useCallback(() => {
    setIsShuttingDown(true);
    siren.stop();
    voiceAlert.stop();

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setTimeout(() => {
      setIsShuttingDown(false);
      setShowPowerMenu(false);
      if (onTriggerFakePowerOff) {
        onTriggerFakePowerOff();
      } else {
        onDismiss();
      }
    }, 2200);
  }, [onDismiss, onTriggerFakePowerOff]);

  // Prevent back navigation or escape dismiss
  useEffect(() => {
    if (!isOpen) return;

    // Start loud panic alarm siren and human voice warning
    siren.start();
    voiceAlert.start(lang);

    // Fluctuating audio decibel readout for visual impact
    const meterInterval = setInterval(() => {
      setAlarmDecibels(102 + Math.floor(Math.random() * 8));
    }, 200);

    // Trap back button using popstate
    window.history.pushState({ locked: true }, '');
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState({ locked: true }, '');
    };
    window.addEventListener('popstate', handlePopState);

    // Prevent key dismiss
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backquote') {
        e.preventDefault();
        e.stopPropagation();
      }
      // If user presses power/volume keys simulation
      if (e.key === 'p' || e.key === 'P') {
        setShowPowerMenu(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      siren.stop();
      voiceAlert.stop();
      clearInterval(meterInterval);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, lang]);

  if (!isOpen) return null;

  return (
    <div
      id="emergency-lock-overlay"
      className="fixed inset-0 z-50 bg-[#090d16]/95 flex flex-col justify-between p-4 sm:p-8 animate-siren-strobe border-8 border-rose-600 select-none overflow-y-auto"
    >
      {/* Background Red Pulse */}
      <div className="absolute inset-0 bg-rose-950/20 pointer-events-none" />

      {/* Top Banner: Emergency Alert */}
      <div className="relative z-10 flex flex-col items-center text-center mt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 text-xs font-bold uppercase tracking-wider mb-3 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span>{translateInline(lang, 'SECURITY LOCKDOWN', 'SECURITY LOCKDOWN • وضع الحماية القصوى')}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-rose-500 mb-2 tracking-tight">
          {t.emergencyLockTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-lg">
          {t.emergencyLockSubtitle}
        </p>

        {/* Audio Siren Gauge & Re-trigger Control */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-3 bg-rose-900/40 border border-rose-600/60 px-5 py-2.5 rounded-2xl">
            <Volume2 className="w-6 h-6 text-rose-400 animate-bounce" />
            <div className="text-right">
              <div className="text-xs text-rose-200 font-semibold">{t.alarmBlaring}</div>
              <div className="text-[11px] font-mono-code text-rose-300">
                Output: <span className="font-bold text-rose-100">{alarmDecibels} dB</span> (Volume: 100% OVERRIDE)
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-retrigger-audio"
            onClick={() => {
              siren.start();
              voiceAlert.start(lang);
            }}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-2 cursor-pointer transition active:scale-95"
          >
            <Volume2 className="w-4 h-4 text-rose-400" />
            <span>{translateInline(lang, 'Replay Siren & Voice', '🔊 إعادة إطلاق الصوت والإنذار')}</span>
          </button>
        </div>

        {/* Human Voice Alert Announcement Banner */}
        <div className="mt-3 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono-code max-w-lg animate-pulse">
          <Mic className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-center sm:text-right">
            {translateInline(
              lang,
              '📢 Voice alert repeating: "Security alert! This phone is reported stolen, return it to its owner!"',
              '📢 تنبيه صوتي مستمر: "تحذير أمني! هذا الهاتف مسروق، أعده لصاحبه فوراً!"'
            )}
          </span>
        </div>
      </div>

      {/* Center: Live GPS & SMS Dispatch status */}
      <div className="relative z-10 max-w-lg mx-auto w-full my-6 space-y-3">
        {/* GPS Card */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <MapPin className="w-4 h-4" />
              <span>{translateInline(lang, 'Current Device GPS Coordinates', 'إحداثيات الموقع الحالي للجهاز (GPS)')}</span>
            </div>
            <span className="text-[11px] font-mono-code text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded">
              {translateInline(lang, 'Accuracy: ', 'دقة: ')}{location?.accuracy || 12}m
            </span>
          </div>

          <div className="text-xs font-mono-code text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span>Lat: {location?.latitude || 24.7136}</span>
              <span className="mx-2">•</span>
              <span>Lng: {location?.longitude || 46.6753}</span>
            </div>
            {location?.mapsUrl && (
              <a
                id="emergency-maps-link"
                href={location.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline text-[11px]"
              >
                <span>{translateInline(lang, 'Google Maps', 'خرائط Google')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* SMS Response Card */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-1.5">
            <Send className="w-4 h-4" />
            <span>{translateInline(lang, 'Emergency report sent automatically via SMS', 'تم إرسال بلاغ الطوارئ تلقائياً بالرسائل النصية')}</span>
          </div>
          <p className="text-xs text-slate-300">
            {translateInline(lang, 'Location coordinates and map link sent to the trigger number:', 'تم إرسال إحداثيات الموقع ورابط الخريطة إلى رقم المفتاح المحرّك:')}
            <span className="font-mono-code text-blue-300 font-bold mx-1.5">{triggerSender}</span>
          </p>
        </div>

        {/* Action Button to trigger OS Device Credential Prompt if closed */}
        <div className="pt-2 text-center flex flex-col sm:flex-row gap-2">
          <button
            id="retrigger-os-auth-btn"
            onClick={() => setShowAuthDialog(true)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>{translateInline(lang, 'Owner Authentication & Unlock', 'إلغاء قفل الطوارئ للمالك (بصمة / PIN)')}</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 text-center pb-2 text-[11px] text-slate-500 flex items-center justify-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span>Android Device Lock Overlay • Non-Dismissible Security Screen</span>
      </div>

      {/* System-level Authentication Dialog (Android BiometricPrompt / DeviceCredentials) */}
      <DeviceAuthModal
        isOpen={showAuthDialog}
        onSuccess={handleAuthSuccess}
        onCancel={() => setShowAuthDialog(false)}
        title={t.osAuthPrompt}
        subtitle={t.osAuthDesc}
        allowCancel={true}
      />

      {/* 
        =======================================================================
        AUTHENTIC ANDROID POWER MENU SIMULATION (One UI / Pixel Style)
        =======================================================================
      */}
      {showPowerMenu && !isShuttingDown && (
        <div
          id="android-power-menu-overlay"
          className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in"
          onClick={() => setShowPowerMenu(false)}
        >
          <div
            className="w-full max-w-sm flex flex-col items-center space-y-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-slate-300">
              <p className="text-xs uppercase font-mono-code tracking-widest text-slate-400">
                Android System
              </p>
              <h3 className="text-lg font-bold text-white mt-1">
                {translateInline(lang, 'Power Options', 'خيارات الطاقة')}
              </h3>
            </div>

            {/* Android Power Menu Circular Action Buttons */}
            <div className="flex items-center justify-center gap-6 sm:gap-8">
              {/* Power Off Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  id="btn-android-power-off"
                  onClick={handleConfirmFakePowerOff}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transition-transform active:scale-90 cursor-pointer"
                  title={translateInline(lang, 'Power off', 'إيقاف التشغيل')}
                >
                  <Power className="w-8 h-8" />
                </button>
                <span className="text-xs font-semibold text-slate-200">
                  {translateInline(lang, 'Power off', 'إيقاف التشغيل')}
                </span>
              </div>

              {/* Restart Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  id="btn-android-restart"
                  onClick={handleConfirmFakePowerOff}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-600/50 transition-transform active:scale-90 cursor-pointer"
                  title={translateInline(lang, 'Restart', 'إعادة التشغيل')}
                >
                  <RotateCcw className="w-8 h-8" />
                </button>
                <span className="text-xs font-semibold text-slate-200">
                  {translateInline(lang, 'Restart', 'إعادة التشغيل')}
                </span>
              </div>

              {/* Emergency Call Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  id="btn-android-emergency"
                  onClick={() => setShowPowerMenu(false)}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-2xl shadow-amber-600/50 transition-transform active:scale-90 cursor-pointer"
                  title={translateInline(lang, 'Emergency call', 'مكالمة طوارئ')}
                >
                  <PhoneCall className="w-8 h-8" />
                </button>
                <span className="text-xs font-semibold text-slate-200">
                  {translateInline(lang, 'Emergency', 'طوارئ')}
                </span>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setShowPowerMenu(false)}
              className="px-6 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition cursor-pointer"
            >
              {translateInline(lang, 'Cancel', 'إلغاء')}
            </button>
          </div>
        </div>
      )}

      {/* 
        =======================================================================
        REALISTIC ANDROID SHUTDOWN ANIMATION (Powering off...)
        =======================================================================
      */}
      {isShuttingDown && (
        <div
          id="android-shutdown-animation-screen"
          className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center select-none"
        >
          <div className="flex flex-col items-center space-y-6 animate-pulse">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="w-14 h-14 border-4 border-slate-700 border-t-white rounded-full animate-spin" />
              <Power className="w-6 h-6 text-slate-400 absolute" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-base font-medium text-slate-200 tracking-wide font-sans">
                {translateInline(lang, 'Shutting down...', 'جارٍ إيقاف التشغيل...')}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono-code">
                Android System OS
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
