import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, Globe, ShieldAlert, Sparkles, Smartphone } from 'lucide-react';
import { Language } from '../types';
import { LANGUAGES_REGISTRY, LanguageMeta, detectDeviceLanguage } from '../utils/languagesRegistry';
import { getTranslation } from '../utils/translations';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  isFirstLaunch?: boolean;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onSelectLang,
  isFirstLaunch = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Temporary state: selected language before pressing Confirm
  // In first launch, null indicates user hasn't explicitly tapped a language yet (or can start with current/detected)
  const [tempSelectedLang, setTempSelectedLang] = useState<Language | null>(null);

  // Auto-detect the phone's native language
  const detectedDeviceLang = useMemo(() => detectDeviceLanguage(), []);
  const detectedMeta = useMemo(
    () => LANGUAGES_REGISTRY.find((l) => l.code === detectedDeviceLang) || null,
    [detectedDeviceLang]
  );

  // On modal open, initialize temp selection
  useEffect(() => {
    if (isOpen) {
      // Initialize temporary selection with current active language (or detected language)
      setTempSelectedLang(currentLang || detectedDeviceLang);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setTempSelectedLang(null);
    }
  }, [isOpen, currentLang, detectedDeviceLang]);

  // Active translation based on currently previewed/chosen language for smooth instant feedback
  const activePreviewLang = tempSelectedLang || currentLang;
  const t = getTranslation(activePreviewLang);

  // Confirm and commit handler
  const handleConfirmSelection = () => {
    if (!tempSelectedLang) return;
    onSelectLang(tempSelectedLang);
    onClose();
  };


  // Filter languages based on search query (matches code, native name, English name, Arabic name, or country)
  // When search query is entered, matched device language is prioritized to the top.
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return LANGUAGES_REGISTRY;
    }

    const matches = LANGUAGES_REGISTRY.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.englishName.toLowerCase().includes(q) ||
        item.arabicName.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    });

    // Bring detected device language to top if it matches search query
    matches.sort((a, b) => {
      if (a.code === detectedDeviceLang) return -1;
      if (b.code === detectedDeviceLang) return 1;
      return 0;
    });

    return matches;
  }, [searchQuery, detectedDeviceLang]);


  // Group filtered results into 3 distinct sections
  const primaryList = useMemo(
    () => filteredLanguages.filter((l) => l.category === 'primary'),
    [filteredLanguages]
  );
  const highRiskList = useMemo(
    () => filteredLanguages.filter((l) => l.category === 'high_risk'),
    [filteredLanguages]
  );
  const globalList = useMemo(
    () => filteredLanguages.filter((l) => l.category === 'global'),
    [filteredLanguages]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
        dir={activePreviewLang === 'ar' || activePreviewLang === 'fa' || activePreviewLang === 'ur' ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  {t.selectLanguage}
                </h2>
                {isFirstLaunch && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold animate-pulse">
                    {activePreviewLang === 'ar' ? 'التشغيل الأول' : 'First Setup'}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                  {LANGUAGES_REGISTRY.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isFirstLaunch
                  ? (activePreviewLang === 'ar'
                      ? 'مرحباً بك! حدد لغتك واضغط على زر "تأكيد" للمتابعة'
                      : 'Welcome! Select your language and click "Confirm" to proceed')
                  : (activePreviewLang === 'ar'
                      ? 'اختر لغة الواجهة ثم اضغط على زر "تأكيد" لحفظها'
                      : 'Select your interface language and click "Confirm" to apply')}
              </p>
            </div>
          </div>
          {!isFirstLaunch && (
            <button
              id="close-language-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="language-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchLanguage}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl py-2.5 px-10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 rtl:right-auto rtl:left-3.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Language List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 divide-y divide-slate-800/60 custom-scrollbar">
          {filteredLanguages.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold">
                {activePreviewLang === 'ar' ? 'لم يتم العثور على أية لغة مطابقة' : 'No matching languages found'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {activePreviewLang === 'ar'
                  ? 'جرب البحث باسم الدولة أو الرمز (مثل: DZ, 966, Spanish, Hausa...)'
                  : 'Try searching by country or standard name'}
              </p>
            </div>
          ) : (
            <>
              {/* Device Auto-Detected Language Section (Placed First) */}
              {!searchQuery && detectedMeta && (
                <div className="space-y-2.5 pb-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                      <Smartphone className="w-4 h-4 text-sky-400" />
                      <span>{t.detectedDeviceLanguageLabel || 'لغة الهاتف (تم التعرف عليها تلقائياً)'}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
                      System Detected
                    </span>
                  </div>
                  <div className="p-1 rounded-2xl bg-gradient-to-r from-sky-500/20 via-emerald-500/20 to-transparent border border-sky-500/40 shadow-lg">
                    <LanguageItemCard
                      item={detectedMeta}
                      isSelected={tempSelectedLang === detectedMeta.code}
                      onSelect={() => setTempSelectedLang(detectedMeta.code)}
                    />
                  </div>
                </div>
              )}

              {/* Section 1: Pinned Primary Languages */}
              {primaryList.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider px-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.pinnedLanguages}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {primaryList.map((langItem) => (
                      <LanguageItemCard
                        key={langItem.code}
                        item={langItem}
                        isSelected={tempSelectedLang === langItem.code}
                        onSelect={() => setTempSelectedLang(langItem.code)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: High Phone-Theft Risk Regional Languages */}
              {highRiskList.length > 0 && (
                <div className="pt-4 space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{t.highRiskLanguages}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Anti-Theft Priority</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {highRiskList.map((langItem) => (
                      <LanguageItemCard
                        key={langItem.code}
                        item={langItem}
                        isSelected={tempSelectedLang === langItem.code}
                        onSelect={() => setTempSelectedLang(langItem.code)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Global Languages */}
              {globalList.length > 0 && (
                <div className="pt-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t.globalLanguages}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {globalList.map((langItem) => (
                      <LanguageItemCard
                        key={langItem.code}
                        item={langItem}
                        isSelected={tempSelectedLang === langItem.code}
                        onSelect={() => setTempSelectedLang(langItem.code)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fixed Bottom Action Bar with Prominent Green Confirm Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/95 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl relative z-10">
          <div className="flex items-center gap-2 text-xs text-slate-300 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-slate-400">
              {activePreviewLang === 'ar' ? 'اللغة المحددة:' : 'Selected Language:'}
            </span>
            <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
              <span>{LANGUAGES_REGISTRY.find((l) => l.code === tempSelectedLang)?.flag || '🌐'}</span>
              <span>{LANGUAGES_REGISTRY.find((l) => l.code === tempSelectedLang)?.name || (activePreviewLang === 'ar' ? 'يرجى الاختيار' : 'Please select')}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!isFirstLaunch && (
              <button
                type="button"
                id="cancel-language-selection-btn"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-sm font-semibold transition cursor-pointer"
              >
                {t.cancel || (activePreviewLang === 'ar' ? 'إلغاء' : 'Cancel')}
              </button>
            )}

            {/* Prominent Green Confirm Button */}
            <button
              type="button"
              id="confirm-language-selection-btn"
              disabled={!tempSelectedLang}
              onClick={handleConfirmSelection}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
                tempSelectedLang
                  ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 shadow-emerald-500/30 cursor-pointer ring-2 ring-emerald-400/40'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{t.confirm || (activePreviewLang === 'ar' ? 'تأكيد' : 'Confirm')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LanguageItemCardProps {
  item: LanguageMeta;
  isSelected: boolean;
  onSelect: () => void;
}

const LanguageItemCard: React.FC<LanguageItemCardProps> = ({
  item,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      id={`select-lang-${item.code}`}
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left rtl:text-right transition cursor-pointer ${
        isSelected
          ? 'bg-emerald-500/15 border-emerald-500/60 text-slate-100 shadow-md shadow-emerald-950/30'
          : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-slate-100'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl select-none" role="img" aria-label={item.country}>
          {item.flag}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate flex items-center gap-1.5">
            <span className="truncate">{item.name}</span>
            {item.category === 'high_risk' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                Theft Hotspot
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {item.englishName} • {item.country}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2 rtl:ml-0 rtl:mr-2">
        {isSelected ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        ) : (
          <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">
            {item.code}
          </span>
        )}
      </div>
    </button>
  );
};
