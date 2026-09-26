import React from 'react';

interface ApplyPilotLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  badgeText?: string;
  subtitle?: string;
  variant?: 'dark' | 'light' | 'auto';
}

export const ApplyPilotLogo: React.FC<ApplyPilotLogoProps> = ({
  size = 36,
  className = '',
  showText = false,
  textClassName = '',
  badgeText,
  subtitle,
  variant = 'auto',
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
      {/* Precision Geometric Emblem */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-xl bg-gradient-to-b from-slate-900 via-slate-950 to-black p-0.5 shadow-md shadow-slate-950/20 border border-slate-800/80 flex items-center justify-center shrink-0 group-hover:border-blue-500/50 group-hover:shadow-blue-500/20 transition-all duration-300"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 rounded-xl bg-radial from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[68%] h-[68%] transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            {/* Primary Apex Gradient */}
            <linearGradient id="apex-grad-left" x1="16" y1="5" x2="6" y2="27" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="0.6" stopColor="#2563EB" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>

            <linearGradient id="apex-grad-right" x1="16" y1="5" x2="26" y2="27" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" />
              <stop offset="0.5" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>

            {/* Inner Core Shimmer */}
            <linearGradient id="apex-grad-core" x1="16" y1="12" x2="16" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="1" stopColor="#93C5FD" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Left Stealth Facet */}
          <path
            d="M16 4.5L7 25.5L16 20.5V4.5Z"
            fill="url(#apex-grad-left)"
          />

          {/* Right Stealth Facet */}
          <path
            d="M16 4.5L25 25.5L16 20.5V4.5Z"
            fill="url(#apex-grad-right)"
          />

          {/* Central Precision Spine */}
          <line
            x1="16"
            y1="4.5"
            x2="16"
            y2="20.5"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeOpacity="0.75"
          />

          {/* Elevated Ascending Diamond Core */}
          <path
            d="M16 11L19 16L16 18.5L13 16L16 11Z"
            fill="url(#apex-grad-core)"
          />

          {/* Micro Horizon Point */}
          <circle cx="16" cy="15" r="1" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Brand Typography (Clean, Modern & Professional Wordmark) */}
      {showText && (
        <div className="flex flex-col justify-center text-left">
          <div className="flex items-center gap-2 leading-none">
            <span
              className={`font-bold tracking-[-0.035em] flex items-center ${
                textClassName || 'text-[17px] text-slate-900'
              }`}
            >
              Apply<span className="font-extrabold text-blue-500 ml-0.5">Pilot</span>
            </span>

            {/* Active System Pulse Dot */}
            <span className="relative flex h-2 w-2" title="Autonomous Engine Online">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            {badgeText && (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
                {badgeText}
              </span>
            )}
          </div>

          {subtitle && (
            <span className="text-[10px] font-medium tracking-wide uppercase text-slate-400 mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
