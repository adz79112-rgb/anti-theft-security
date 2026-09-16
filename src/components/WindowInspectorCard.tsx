import React, { useState, useEffect } from 'react';
import { Scan, Copy, Check, RefreshCw, Trash2, ShieldCheck, Box, FileText, MousePointerClick, Clock } from 'lucide-react';
import { fetchLastInspectedWindow, clearStoredInspectedWindow, addWindowInspectedListener } from '../utils/nativeEmergencySms';

interface WindowInspectorCardProps {
  lang: string;
}

export const WindowInspectorCard: React.FC<WindowInspectorCardProps> = ({ lang }) => {
  const [data, setData] = useState<{
    packageName: string;
    className: string;
    buttons: string;
    timestamp: number;
  }>({
    packageName: '',
    className: '',
    buttons: '',
    timestamp: 0,
  });
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetchLastInspectedWindow();
      setData(res);
    } catch (e) {
      console.warn('Failed to fetch inspected window:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    loadData();

    // Live listener for incoming system window state events
    const sub = addWindowInspectedListener((incoming) => {
      setData(incoming);
    });

    return () => {
      Promise.resolve(sub)
        .then((handle: any) => {
          if (handle && typeof handle.remove === 'function') {
            handle.remove();
          }
        })
        .catch(() => {});
    };
  }, []);

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  const handleClear = async () => {
    await clearStoredInspectedWindow();
    setData({
      packageName: '',
      className: '',
      buttons: '',
      timestamp: 0,
    });
  };

  const hasData = Boolean(data.packageName && data.packageName.trim().length > 0);

  const formatTime = (ts: number) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      id="window-inspector-status-card"
      className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm relative overflow-hidden transition-all"
    >
      {/* Subtle Cyan Glow Accent */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {lang === 'ar' ? 'أداة تشخيص نوافذ النظام' : 'System Window Inspector'}
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-semibold">
                Live
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'رصد اسم الحزمة والنوافذ المنبثقة تلقائياً لقراءتها ونسخها بسهولة'
                : 'Automatically inspect and copy system window package names'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-inspected-window-btn"
            onClick={loadData}
            title={lang === 'ar' ? 'تحديث الفحص' : 'Refresh'}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          {hasData && (
            <button
              id="clear-inspected-window-btn"
              onClick={handleClear}
              title={lang === 'ar' ? 'مسح السجل' : 'Clear'}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/50 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {hasData ? (
        <div className="space-y-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
          {/* Package Row (Primary focus for user) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/70">
            <div className="flex items-center gap-2 min-w-0">
              <Box className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 font-semibold block">
                  {lang === 'ar' ? 'اسم الحزمة (Package):' : 'Package Name:'}
                </span>
                <span className="text-sm font-mono font-bold text-cyan-300 break-all select-all">
                  {data.packageName}
                </span>
              </div>
            </div>
            <button
              id="copy-inspected-package-btn"
              onClick={() => handleCopy(data.packageName)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'نسخ الحزمة' : 'Copy Package'}</span>
                </>
              )}
            </button>
          </div>

          {/* Class / Window Row */}
          {data.className && (
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 font-semibold">{lang === 'ar' ? 'الشاشة/النافذة:' : 'Class:'}</span>
              <span className="font-mono text-slate-300 truncate select-all">{data.className}</span>
            </div>
          )}

          {/* Buttons Row */}
          {data.buttons && (
            <div className="flex items-center gap-2 text-xs">
              <MousePointerClick className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-400 font-semibold">{lang === 'ar' ? 'الأزرار المكتشفة:' : 'Buttons:'}</span>
              <span className="font-mono text-amber-300/90 truncate">{data.buttons}</span>
            </div>
          )}

          {/* Timestamp Row */}
          {data.timestamp > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
              <span>{lang === 'ar' ? 'آخر رصد:' : 'Last detected:'}</span>
              <span>{formatTime(data.timestamp)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl p-5 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 mx-auto mb-2 flex items-center justify-center text-slate-500">
            <ShieldCheck className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-300 mb-1">
            {lang === 'ar' ? 'بانتظار ظهور أي نافذة نظام' : 'Waiting for system window'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {lang === 'ar'
              ? 'عندما تظهر أي نافذة من النظام أو إعدادات الهاتف، سيتم تسجيل اسم الحزمة والأزرار هنا فوراً وستتمكن من نسخها دون أن تختفي.'
              : 'When any system or permission window appears, its package name and buttons will be captured here automatically.'}
          </p>
        </div>
      )}
    </div>
  );
};
