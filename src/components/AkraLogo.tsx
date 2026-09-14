import React from 'react';

interface AkraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'emblem' | 'wordmark';
  theme?: 'dark' | 'light' | 'gold';
  className?: string;
  showSubtitle?: boolean;
}

export const AkraLogo: React.FC<AkraLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'dark',
  className = '',
  showSubtitle = true,
}) => {
  // Size dimensions mapping
  const sizeConfig = {
    sm: {
      emblemSize: 36,
      titleSize: 'text-base',
      subSize: 'text-[9px]',
      gap: 'gap-2',
    },
    md: {
      emblemSize: 52,
      titleSize: 'text-xl sm:text-2xl',
      subSize: 'text-[10px] sm:text-[11px]',
      gap: 'gap-2.5',
    },
    lg: {
      emblemSize: 72,
      titleSize: 'text-2xl sm:text-3xl',
      subSize: 'text-xs',
      gap: 'gap-3',
    },
    xl: {
      emblemSize: 96,
      titleSize: 'text-3xl sm:text-4xl',
      subSize: 'text-xs sm:text-sm',
      gap: 'gap-3.5',
    },
  }[size];

  // Theme color styles
  const isDark = theme === 'dark';
  const isGold = theme === 'gold';

  const titleColor = isDark
    ? 'text-[#FFF7F2]'
    : isGold
    ? 'text-[#D4AF37]'
    : 'text-[#3E2723]';

  const subtitleColor = isDark
    ? 'text-[#F4C7D3]'
    : isGold
    ? 'text-[#B38F3B]'
    : 'text-[#795548]';

  return (
    <div
      className={`inline-flex flex-col items-center justify-center text-center select-none ${className}`}
      id="akra-main-logo"
    >
      {/* SVG Monogram Emblem */}
      {(variant === 'full' || variant === 'emblem') && (
        <div
          className="relative flex items-center justify-center transition-transform duration-300 hover:scale-105"
          style={{ width: sizeConfig.emblemSize, height: sizeConfig.emblemSize }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            className={`absolute inset-0 rounded-full blur-md opacity-60 pointer-events-none ${
              isDark ? 'bg-[#F4C7D3]/20' : 'bg-[#D4AF37]/20'
            }`}
          />

          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full relative z-10 drop-shadow-md"
          >
            <defs>
              {/* Luxury Metallic Gradients */}
              <linearGradient id="akraGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F9E2AF" />
                <stop offset="35%" stopColor="#D4AF37" />
                <stop offset="70%" stopColor="#F3E5AB" />
                <stop offset="100%" stopColor="#AA7A1E" />
              </linearGradient>

              <linearGradient id="akraRoseGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C47B89" />
                <stop offset="50%" stopColor="#F4C7D3" />
                <stop offset="100%" stopColor="#FFF0F5" />
              </linearGradient>

              <linearGradient id="akraBgGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3E2723" />
                <stop offset="100%" stopColor="#241916" />
              </linearGradient>

              <linearGradient id="akraRibbonGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#FFF7F2" />
                <stop offset="50%" stopColor="#F4C7D3" />
                <stop offset="100%" stopColor="#D4AF37" />
              </linearGradient>

              {/* Subtle Drop Shadow */}
              <filter id="akraShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Circular Crest Badge Background */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill={isDark ? 'url(#akraBgGradDark)' : '#FFF0F5'}
              stroke="url(#akraGoldGrad)"
              strokeWidth="2"
            />

            {/* Inner Delicate Concentric Ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#akraRoseGrad)"
              strokeWidth="0.8"
              strokeDasharray="2 3"
              opacity="0.8"
            />

            {/* Micro Cardinal Stars / Accents (Representing Puducherry & Bangalore) */}
            <circle cx="50" cy="9" r="1.5" fill="url(#akraGoldGrad)" />
            <circle cx="50" cy="91" r="1.5" fill="url(#akraGoldGrad)" />
            <circle cx="9" cy="50" r="1.5" fill="url(#akraGoldGrad)" />
            <circle cx="91" cy="50" r="1.5" fill="url(#akraGoldGrad)" />

            {/* Intertwined 'A' & 'R' Couple Monogram with Infinity Heart Ribbon */}
            <g filter="url(#akraShadow)">
              {/* Left leg of 'A' (Akshya stroke) curving gracefully */}
              <path
                d="M32 72 C 32 50, 42 30, 50 22 C 58 30, 68 50, 68 72"
                stroke="url(#akraRibbonGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Inner Heart Loop connecting the crossbar of 'A' and 'R' (Ragul stroke) */}
              <path
                d="M36 54 C 42 46, 50 48, 50 54 C 50 48, 58 46, 64 54 C 67 58, 62 66, 50 72 C 38 66, 33 58, 36 54 Z"
                fill="url(#akraRoseGrad)"
                opacity="0.9"
              />

              {/* Stylized 'R' swoosh leg branching out gracefully to bottom right */}
              <path
                d="M50 54 C 55 58, 62 64, 71 73"
                stroke="url(#akraGoldGrad)"
                strokeWidth="3.2"
                strokeLinecap="round"
              />

              {/* Apex Star of the Monogram */}
              <path
                d="M50 16 L51.2 19.5 L54.5 20 L51.8 22.2 L52.6 25.5 L50 23.5 L47.4 25.5 L48.2 22.2 L45.5 20 L48.8 19.5 Z"
                fill="url(#akraGoldGrad)"
              />
            </g>
          </svg>
        </div>
      )}

      {/* Typography: Wordmark + Romantic Subtitle */}
      {(variant === 'full' || variant === 'wordmark') && (
        <div className={`mt-2 flex flex-col items-center ${sizeConfig.gap}`}>
          {/* Main Logo Text */}
          <div className="flex items-center justify-center gap-2">
            <span
              className={`font-serif font-bold tracking-[0.32em] uppercase leading-none ${sizeConfig.titleSize} ${titleColor}`}
              style={{ letterSpacing: '0.28em', textIndent: '0.28em' }}
            >
              AKRA
            </span>
          </div>

          {/* Subtitle / Romantic Tagline */}
          {showSubtitle && (
            <div className="flex items-center gap-1.5 opacity-90">
              <span className="text-[8px] text-[#D4AF37]">✦</span>
              <p
                className={`font-serif italic font-normal tracking-wide ${sizeConfig.subSize} ${subtitleColor}`}
              >
                A little world for two
              </p>
              <span className="text-[8px] text-[#D4AF37]">✦</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AkraLogo;
