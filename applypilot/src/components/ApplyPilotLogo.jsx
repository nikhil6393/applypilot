import React from 'react';

export const ApplyPilotLogo = ({
  size = 38,
  className = '',
  showText = false,
  textClassName = '',
  badgeText = 'PRO',
  subtitle,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none group ${className}`}>
      {/* Official Brand Logo Mark */}
      <div
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ease-out cursor-pointer"
      >
        <img
          src="/applypilot-logo.png"
          alt="ApplyPilot Logo"
          style={{ width: size, height: size, objectFit: 'contain' }}
          className="select-none drop-shadow-[0_2px_8px_rgba(59,109,247,0.22)]"
          loading="eager"
        />
      </div>

      {/* Brand Typography & Wordmark Design */}
      {showText && (
        <div className="flex flex-col justify-center text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-[-0.03em] flex items-center ${
                textClassName || 'text-[17px] text-slate-900'
              }`}
            >
              Apply
              <span className="text-[#3563eb] ml-0.5">
                Pilot
              </span>
            </span>

            {/* Live Signal Dot */}
            <span className="relative flex h-2 w-2 ml-0.5" title="ApplyPilot Engine Connected">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>

            {badgeText && (
              <span className="text-[9.5px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-[6px] bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs ml-0.5">
                {badgeText}
              </span>
            )}
          </div>

          {subtitle && (
            <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const JobPulseLogo = ApplyPilotLogo;

