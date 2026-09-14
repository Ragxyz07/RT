import React, { useState, useEffect } from 'react';
import { useAkra } from '../context/AkraContext';
import { PWAInstallButton } from './PWAInstallButton';
import { Bell, MapPin, LogOut, Sparkles, Heart } from 'lucide-react';
import { AkraLogo } from './AkraLogo';

export const Header: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    logout,
    calculateDistanceKm,
    setActiveTab,
    sendVirtualHeart,
    showToast,
  } = useAkra();

  const distanceKm = calculateDistanceKm();

  // Secret knock state: double-tap AKRA wordmark
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showSecretKnock, setShowSecretKnock] = useState(false);
  const [isSendingPulse, setIsSendingPulse] = useState(false);

  // Live ticking times for Puducherry & Bangalore
  const [timePuducherry, setTimePuducherry] = useState('');
  const [timeBangalore, setTimeBangalore] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setTimePuducherry(timeStr);
      setTimeBangalore(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleWordmarkClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 350) {
      // Double tap detected!
      setShowSecretKnock(true);
      setTimeout(() => setShowSecretKnock(false), 4500);
    } else {
      setActiveTab('home');
    }
    setLastClickTime(now);
  };

  const handlePartnerAvatarTouch = () => {
    setIsSendingPulse(true);
    sendVirtualHeart();
    setTimeout(() => setIsSendingPulse(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 glass-cream border-b border-[#7a5240]/15 px-4 sm:px-8 py-3 transition-colors select-none">
      {/* Warm screen wave ripple on touch */}
      {isSendingPulse && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-radial from-[#d9a89e]/30 via-[#e7c4bd]/10 to-transparent animate-slow-orb-pulse" />
      )}

      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Editorial Title with Secret Knock */}
        <div className="relative">
          <div
            onClick={handleWordmarkClick}
            className="flex items-center gap-3 cursor-pointer group"
            id="header-brand"
            title="Double-tap for secret knock"
          >
            <AkraLogo size="sm" variant="emblem" theme="dark" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl sm:text-3xl tracking-tight font-normal text-[#5b3a2e] group-hover:text-[#4a2e24] transition-colors">
                  AKRA
                </span>
                <span className="micro-label px-2 py-0.5 rounded-full bg-[#f9efe8] border border-[#7a5240]/15 text-[#7a5240]">
                  Space
                </span>
              </div>
              <p className="text-[11px] text-[#7a5240]/80 tracking-wide font-sans hidden sm:block">
                "A little world for two" • Puducherry & Bangalore
              </p>
            </div>
          </div>

          {/* Secret Knock Message Popover */}
          {showSecretKnock && (
            <div className="absolute top-12 left-0 z-50 p-3 rounded-2xl glass-cream-elevated border border-[#7a5240]/30 shadow-2xl animate-fade-up whitespace-nowrap">
              <span className="font-serif italic text-xs sm:text-sm text-[#5b3a2e]">
                "Forever kept — Mama & Akshu."
              </span>
            </div>
          )}
        </div>

        {/* Center Live Distance & Online Together Pulse */}
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#f9efe8]/85 border border-[#7a5240]/15 shadow-xs text-xs text-[#5b3a2e]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#b06a5e] animate-slow-orb-pulse" />
            <span className="font-medium text-[#5b3a2e]">Online together</span>
          </div>

          <span className="h-3 w-[1px] bg-[#7a5240]/20" />

          <div className="flex items-center gap-3 text-[11px] text-[#7a5240]">
            <span>
              Mama (Puducherry): <strong className="text-[#5b3a2e] font-mono">{timePuducherry}</strong>
            </span>
            <span>•</span>
            <span>
              Akshu (Bangalore): <strong className="text-[#5b3a2e] font-mono">{timeBangalore}</strong>
            </span>
          </div>

          <span className="h-3 w-[1px] bg-[#7a5240]/20" />

          <div className="flex items-center gap-1 text-[11px] font-medium text-[#7a5240]">
            <MapPin className="w-3.5 h-3.5 text-[#b06a5e]" />
            <span>{distanceKm} km</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Partner Avatar Touch */}
          <button
            onClick={handlePartnerAvatarTouch}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f9efe8]/90 hover:bg-[#ffffff] border border-[#7a5240]/20 text-[#5b3a2e] shadow-xs text-xs transition cursor-pointer"
            title={`Tap to send live touch to ${partnerUser.name}`}
          >
            <img
              src={partnerUser.avatar}
              alt={partnerUser.name}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-[#b06a5e]"
            />
            <span className="text-[10px] text-[#7a5240] hidden sm:inline">
              Touch {partnerUser.nickname || partnerUser.name}
            </span>
          </button>

          {/* Current User Badge */}
          <button
            id="logged-in-profile-badge"
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f9efe8]/90 hover:bg-[#ffffff] border border-[#7a5240]/20 text-[#5b3a2e] shadow-xs text-xs transition cursor-pointer"
            title={`Active: ${currentUser.name} (${currentUser.nickname}) • Click for settings`}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-5 h-5 rounded-full object-cover ring-1.5 ring-[#7a5240]/40"
            />
            <div className="flex flex-col text-left">
              <span className="font-semibold text-[11px] text-[#5b3a2e] leading-tight">
                {currentUser.nickname || currentUser.name}
              </span>
              <span className="text-[9px] text-[#7a5240]/70 font-medium leading-tight">
                {currentUser.city}
              </span>
            </div>
          </button>

          {/* Log Out */}
          <button
            id="header-logout-btn"
            onClick={logout}
            title="Lock the door & log out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f9efe8]/90 hover:bg-[#ffffff] border border-[#7a5240]/20 text-[#5b3a2e] transition shadow-xs text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#7a5240]" />
            <span className="hidden sm:inline text-[11px]">Lock Door</span>
          </button>
        </div>
      </div>
    </header>
  );
};
