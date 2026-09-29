import React from 'react';

export const ApplyPilotLogo = ({
  size = 38,
  className = '',
  showText = false,
  textClassName = '',
  badgeText = 'v2.6',
  subtitle,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none group ${className}`}>
      {/* 3D Tactile App Emblem Container (macOS / Modern Hardware Aesthetic) */}
      <div
        style={{
          width: size,
          height: size,
          boxShadow:
            'inset 0 1px 1px rgba(255, 255, 255, 0.22), 0 6px 16px -2px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.4)',
        }}
        className="relative rounded-[13px] bg-gradient-to-b from-[#161D2C] via-[#0C111C] to-[#060910] border-t border-white/20 border-x border-[#1E293B] border-b border-black/80 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#38BDF8]/40 transition-all duration-250 ease-out cursor-pointer"
      >
        {/* Subtle Ambient Radial Underglow */}
        <div className="absolute inset-0 rounded-[13px] bg-radial from-[#0284C7]/20 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* 3D Isometric Supersonic Autopilot Vector */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[74%] h-[74%] relative z-10 transition-transform duration-250 group-hover:-translate-y-0.5"
        >
          <defs>
            {/* Soft Ambient Ground Contact Shadow */}
            <filter id="shadow-3d" x="0" y="16" width="32" height="16" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
          </defs>

          {/* 1. 3D Floating Contact Shadow */}
          <ellipse
            cx="16"
            cy="24.5"
            rx="8.5"
            ry="2.8"
            fill="#000000"
            opacity="0.65"
            filter="url(#shadow-3d)"
          />

          {/* 2. 3D Isometric Extrusion Thickness (Lower Bevel Facets) */}
          {/* Left Extrusion Wall */}
          <path d="M6 20.2V22.6L16 26.2V23.8Z" fill="#034B75" />
          {/* Right Extrusion Wall */}
          <path d="M26 20.2V22.6L16 26.2V23.8Z" fill="#012A45" />

          {/* 3. 3D Primary Flight Wings (Light & Shadow Depth) */}
          {/* Left Wing (Direct Specular Highlight & Top Plane) */}
          <path d="M16 3.8L6 20.2L16 16.8V3.8Z" fill="#0284C7" />

          {/* Right Wing (Shadow Plane / Ambient Depth) */}
          <path d="M16 3.8L26 20.2L16 16.8V3.8Z" fill="#0369A1" />

          {/* Wing Outer Chamfers / Bevel Accents */}
          <path d="M16 3.8L6 20.2L8.5 20.8L16 6.8Z" fill="#38BDF8" opacity="0.6" />
          <path d="M16 3.8L26 20.2L23.5 20.8L16 6.8Z" fill="#024D7A" opacity="0.8" />

          {/* 4. Razor Sharp Central Specular Ridge */}
          <line
            x1="16"
            y1="3.8"
            x2="16"
            y2="16.8"
            stroke="#FFFFFF"
            strokeWidth="1.1"
            strokeLinecap="round"
          />

          {/* 5. 3D Elevated Diamond Cockpit Core (Floating Above Hull) */}
          {/* Left Gem Facet (High Reflection) */}
          <polygon points="16,8.5 12.8,13.5 16,15.6" fill="#FFFFFF" />
          {/* Right Gem Facet (Refracted Cyan) */}
          <polygon points="16,8.5 19.2,13.5 16,15.6" fill="#7DD3FC" />

          {/* Core Autopilot Target Spark */}
          <circle cx="16" cy="12.6" r="1.3" fill="#0284C7" />
          <circle cx="15.6" cy="12.2" r="0.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Brand Typography & Wordmark Design */}
      {showText && (
        <div className="flex flex-col justify-center text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black tracking-[-0.04em] flex items-center ${
                textClassName || 'text-[17px] text-slate-900'
              }`}
            >
              Apply
              <span className="text-[#0284C7] ml-0.5 drop-shadow-[0_1px_2px_rgba(2,132,199,0.15)]">
                Pilot
              </span>
            </span>

            {/* Live Autopilot Status Signal */}
            <span className="relative flex h-2 w-2 ml-0.5" title="Autonomous Engine Active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            {badgeText && (
              <span className="text-[9.5px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-[6px] bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs ml-0.5">
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
