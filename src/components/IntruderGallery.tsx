import { translateInline } from '../utils/translateInline';
import React, { useState } from 'react';
import { Camera, MapPin, Share2, Download, ExternalLink, ShieldCheck, Eye, Trash2, Bot, Send } from 'lucide-react';
import { IntruderCapture, Language } from '../types';
import { getTranslation } from '../utils/translations';

interface IntruderGalleryProps {
  captures: IntruderCapture[];
  onDeleteCapture: (id: string) => void;
  onClearCaptures?: () => void;
  lang: Language;
}

export const IntruderGallery: React.FC<IntruderGalleryProps> = ({
  captures,
  onDeleteCapture,
  onClearCaptures,
  lang,
}) => {
  const t = getTranslation(lang);
  const [selectedCapture, setSelectedCapture] = useState<IntruderCapture | null>(null);

  const handleShareWhatsApp = (capture: IntruderCapture) => {
    const text = encodeURIComponent(
      `🚨 [${translateInline(lang, 'Emergency Security Report - Anti-Theft App', 'بلاغ أمني طارئ - تطبيق مكافحة السرقة')}]\n${translateInline(lang, 'Photo of the person holding the phone captured at:', 'تم التقاط صورة للممسك بالهاتف في:')}\n${capture.timestamp}\n${translateInline(lang, 'Geographical Location:', 'الموقع الجغرافي:')}\n${capture.location.mapsUrl}`
    );
    const cleanedNumber = capture.senderNumber.replace(/[^\d+]/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${cleanedNumber}&text=${text}`, '_blank');
  };

  const handleShareTelegram = (capture: IntruderCapture) => {
    const text = encodeURIComponent(
      `🚨 [${translateInline(lang, 'DroidGuard Security Report', 'بلاغ أمني DroidGuard')}] ${translateInline(lang, 'Photo of the person holding the phone captured', 'تم التقاط صورة للممسك بالهاتف')}\n⏰ ${translateInline(lang, 'Time:', 'الوقت:')} ${capture.timestamp}\n📍 ${translateInline(lang, 'Location:', 'الموقع:')} ${capture.location.mapsUrl}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(capture.location.mapsUrl)}&text=${text}`, '_blank');
  };

  const handleShareSms = (capture: IntruderCapture) => {
    const text = encodeURIComponent(
      `🚨 [Security Alert] Phone holder snapshot captured at ${capture.timestamp}. GPS: ${capture.location.mapsUrl}`
    );
    const cleanedNumber = capture.senderNumber.replace(/[^\d+]/g, '');
    window.open(`sms:${cleanedNumber}?body=${text}`, '_blank');
  };

  const handleDownloadImage = (capture: IntruderCapture) => {
    const a = document.createElement('a');
    a.href = capture.imageUrl;
    a.download = `intruder-capture-${capture.id}.jpg`;
    a.click();
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">{t.intrudersTitle}</h3>
            <p className="text-xs text-slate-400">
              {captures.length} {captures.length === 1 ? translateInline(lang, 'captured photo', 'صورة ملتقطة') : translateInline(lang, 'captured photos', 'صور ملتقطة')} {translateInline(lang, 'via front camera', 'عبر الكاميرا الأمامية')}
            </p>
          </div>
        </div>

        {captures.length > 0 && (
          <div className="flex items-center gap-2">
            {onClearCaptures && (
              <button
                id="clear-all-captures-btn"
                onClick={onClearCaptures}
                className="text-xs text-slate-400 hover:text-slate-200 transition px-2.5 py-1 rounded-lg hover:bg-slate-800"
              >{translateInline(lang, 'Clear All', 'مسح الكل')}</button>
            )}
            <span className="text-xs bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full font-bold border border-rose-500/20">{translateInline(lang, 'Intruders Gallery', 'سجل المتسللين')}</span>
          </div>
        )}
      </div>

      {captures.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
          <Camera className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-medium">{t.noIntruders}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {translateInline(lang, 'Upon receiving a \'camera\' command or an alarm trigger, a silent photo will be captured and saved here', 'عند استلام أمر "كاميرا" أو حدوث إنذار، سيتم التقاط صورة صامتة وحفظها هنا')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {captures.map((item, index) => (
            <div
              key={`${item.id || 'cap'}-${index}`}
              id={`intruder-card-${item.id || index}`}
              className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg group hover:border-slate-700 transition"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedCapture(item)}>
                <img
                  src={item.imageUrl}
                  alt="Intruder Capture"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                
                {/* HUD Badge */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-600/90 text-white font-mono-code text-[10px] font-bold shadow-sm">
                  FRONT_CAM
                </div>

                <div className="absolute bottom-2 right-2 text-[11px] text-slate-300 font-mono-code flex items-center gap-1">
                  <span>{item.timestamp}</span>
                </div>
              </div>

              {/* Details & Location */}
              <div className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{translateInline(lang, 'Sender:', 'المرسل:')}</span>
                  <span className="font-mono-code text-slate-200 font-bold">{item.senderNumber}</span>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="font-mono-code text-[11px]">
                      {item.location.latitude ? (item.location.latitude.toFixed(3) + ', ' + item.location.longitude.toFixed(3)) : 'غير متوفر'}
                    </span>
                  </div>
                  <a
                    href={item.location.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>{translateInline(lang, 'Map', 'الخريطة')}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {/* Dispatch buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    id={`share-tg-${item.id}`}
                    onClick={() => handleShareTelegram(item)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-sky-500/30"
                    title={translateInline(lang, 'Share via Telegram', 'مشاركة عبر تليجرام')}
                  >
                    <Send className="w-3 h-3" />
                    <span>{translateInline(lang, 'Telegram', 'تليجرام')}</span>
                  </button>
                  <button
                    id={`share-wa-${item.id}`}
                    onClick={() => handleShareWhatsApp(item)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-emerald-500/30"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>{translateInline(lang, 'WhatsApp', 'واتساب')}</span>
                  </button>
                  <button
                    id={`share-sms-${item.id}`}
                    onClick={() => handleShareSms(item)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-blue-500/30"
                  >
                    <span>SMS</span>
                  </button>
                  <button
                    id={`download-pic-${item.id}`}
                    onClick={() => handleDownloadImage(item)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title={translateInline(lang, 'Download Photo', 'تحميل الصورة')}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`delete-pic-${item.id}`}
                    onClick={() => onDeleteCapture(item.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                    title={translateInline(lang, 'Delete', 'حذف')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded Modal for Photo Inspection */}
      {selectedCapture && (
        <div
          id="photo-inspect-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setSelectedCapture(null)}
        >
          <div
            className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-slate-100">{translateInline(lang, 'Intruder Photo Details', 'تفاصيل صورة المتسلل')}</h3>
              </div>
              <button
                id="close-photo-modal-btn"
                onClick={() => setSelectedCapture(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold bg-slate-800 px-3 py-1 rounded-lg"
              >{translateInline(lang, 'Close', 'إغلاق')}</button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-700 aspect-video mb-4 bg-slate-950">
              <img
                src={selectedCapture.imageUrl}
                alt="Enlarged Intruder"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-2 text-xs font-mono-code bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300">
              <p>{translateInline(lang, 'Time: ', 'الوقت: ')}<span className="text-slate-100">{selectedCapture.timestamp}</span></p>
              <p>{translateInline(lang, 'Trigger Number: ', 'الرقم المحرك: ')}<span className="text-blue-300">{selectedCapture.senderNumber}</span></p>
              <p>{translateInline(lang, 'Location: ', 'الموقع: ')}<span className="text-emerald-400">{selectedCapture.location.latitude}, {selectedCapture.location.longitude}</span></p>
              <p>{translateInline(lang, 'Google Maps Link: ', 'رابط خرائط Google: ')}<a href={selectedCapture.location.mapsUrl} target="_blank" rel="noreferrer" className="text-teal-400 underline">{selectedCapture.location.mapsUrl}</a></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
