import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#6D4C41] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#5D4037] transition-all hover:scale-105 active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-[#E8D5C4]" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-btn"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E8D5C4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#6D4C41] hover:bg-[#FAF7F2] transition-all shadow-2xs"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#6D4C41]" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-[32px] bg-[#FAF7F2] p-6 sm:p-7 shadow-2xl border border-[#E8D5C4]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-[#3E2723] font-serif">Add AKRA to Home Screen</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1 text-[#8D6E63] hover:bg-[#E8D5C4]/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#5D4037] leading-relaxed mb-4 font-serif">
                1. Tap the <span className="font-semibold text-[#3E2723]">Share</span> button in Safari's bottom toolbar.<br />
                2. Scroll down and tap <span className="font-semibold text-[#3E2723]">Add to Home Screen</span>.<br />
                3. Open AKRA anytime like a native iPhone app!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-full bg-[#6D4C41] py-2.5 text-sm font-semibold text-white hover:bg-[#5D4037] transition shadow-xs"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
