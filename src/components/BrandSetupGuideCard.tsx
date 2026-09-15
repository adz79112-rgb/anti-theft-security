import React from 'react';
import { Smartphone, Wrench } from 'lucide-react';
import { Language } from '../types';
import { translateInline } from '../utils/translateInline';

interface BrandSetupGuideCardProps {
  lang: Language;
  onOpenGuide: () => void;
  className?: string;
}

export const BrandSetupGuideCard: React.FC<BrandSetupGuideCardProps> = ({
  lang,
  onOpenGuide,
  className = '',
}) => {
  return (
    <div
      id="universal-oem-guide-card"
      className={`p-4 sm:p-5 rounded-2xl border border-teal-500/40 bg-teal-950/20 text-teal-200 transition-all flex flex-col gap-3 shadow-lg shadow-teal-950/30 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0 mt-0.5">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white">
                {translateInline(
                  lang,
                  'Multi-Brand Zero-Touch Guide (Condor, Samsung, Xiaomi, Realme)',
                  'دليل ضبط أجهزة كوندور 🇩🇿، سامسونج 🇰🇷، شاومي 🇨🇳، وريلمي 📱'
                )}
              </h4>
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-teal-500/30 text-teal-300 border border-teal-500/40">
                ALL PHONES SUPPORTED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {translateInline(
                lang,
                'Specific step-by-step instructions for Algerian Condor phones (DuraSpeed & Restricted Settings), Samsung One UI, Xiaomi HyperOS/MIUI, and Realme UI to ensure 100% silent background SMS without any countdown popups.',
                'إرشادات مخصصة ومفصلة لهواتف كوندور الجزائرية (حل مشكلة الإعداد المقيد و DuraSpeed)، سامسونج (تطبيقات لا تنام)، شاومي (البدء التلقائي)، وريلمي لتأكيد إرسال رسائل الاستغاثة فوراً وبصمت تام في الخلفية.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            id="btn-open-universal-oem-guide"
            type="button"
            onClick={onOpenGuide}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold font-mono-code transition cursor-pointer shadow-lg shadow-teal-950/60 flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            <span>
              {translateInline(
                lang,
                'Open Brand Setup Guide 📱',
                'فتح دليل ضبط جهازك 📱'
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
