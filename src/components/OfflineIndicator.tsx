import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Language } from '../types';
import { translateInline } from '../utils/translateInline';

interface OfflineIndicatorProps {
  lang: Language;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 start-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-600/90 border border-amber-400/50 px-3.5 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-md animate-fade-in font-mono-code">
      <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
      <span>
        {translateInline(
          lang,
          'Offline Mode — Cached data and local anti-theft services active.',
          'وضع عدم الاتصال — خدمات الحماية والبيانات المخزنة محلياً قيد العمل.'
        )}
      </span>
    </div>
  );
};
