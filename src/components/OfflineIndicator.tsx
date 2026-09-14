import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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
    <div
      id="offline-banner"
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 flex items-center gap-2 rounded-full bg-[#3E2723] px-5 py-2.5 text-xs font-serif text-[#FAF7F2] shadow-xl border border-[#6D4C41]"
    >
      <WifiOff className="w-4 h-4 text-[#E8D5C4] shrink-0" />
      <span>Offline Mode — AKRA is using cached memories & private notes.</span>
    </div>
  );
};
