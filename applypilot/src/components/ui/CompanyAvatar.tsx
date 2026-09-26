import React, { useState } from 'react';

interface CompanyAvatarProps {
  company: string;
  logoUrl?: string;
  source?: string;
  size?: number;
  className?: string;
}

export const CompanyAvatar: React.FC<CompanyAvatarProps> = ({
  company,
  logoUrl,
  source = 'default',
  size = 36,
  className = '',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  // 2-char uppercase initials
  const cleanName = (company || 'Company').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

  // Background from source color at 50-stop, text at 800-stop
  // Blue (#E6F1FB / #0C447C) for LinkedIn
  // Coral (#FAECE7 / #712B13) for Naukri
  // Amber (#FAEEDA / #633806) for YC
  // Teal (#E1F5EE / #085041) for RemoteOK
  // Purple (#EEEDFE / #3C3489) for others
  const getColors = (src: string) => {
    const s = src.toLowerCase();
    if (s.includes('linkedin')) return { bg: '#E6F1FB', text: '#0C447C', border: '#BCD8F6' };
    if (s.includes('naukari') || s.includes('naukri')) return { bg: '#FAECE7', text: '#712B13', border: '#F3C9BD' };
    if (s.includes('yc') || s.includes('ycombinator')) return { bg: '#FAEEDA', text: '#633806', border: '#F3D9A8' };
    if (s.includes('remoteok')) return { bg: '#E1F5EE', text: '#085041', border: '#B7E8D6' };
    return { bg: '#EEEDFE', text: '#3C3489', border: '#D1CEFB' };
  };

  const colors = getColors(source);
  const hasValidLogo = !!logoUrl && logoUrl.startsWith('http') && !imageFailed;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '8px',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `0.5px solid ${colors.border}`,
        fontSize: size <= 36 ? '12px' : '14px',
      }}
      className={`company-avatar select-none flex-shrink-0 relative overflow-hidden font-bold flex items-center justify-center ${className}`}
      title={company}
    >
      {hasValidLogo ? (
        <img
          src={logoUrl}
          alt={company}
          className="w-full h-full object-contain p-1"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
