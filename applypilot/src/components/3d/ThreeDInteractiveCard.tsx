import React, { useRef, useState, useCallback } from 'react';

interface ThreeDInteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glareOpacity?: number;
  borderGlow?: boolean;
  borderBeam?: boolean;
  interactive?: boolean;
}

export const ThreeDInteractiveCard: React.FC<ThreeDInteractiveCardProps> = ({
  children,
  className = '',
  intensity = 7,
  glareOpacity = 0.16,
  borderGlow = true,
  borderBeam = true,
  interactive = true,
  onClick,
  style = {},
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('');
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Normalized coordinates from -0.5 to 0.5
      const mouseX = (e.clientX - rect.left) / width - 0.5;
      const mouseY = (e.clientY - rect.top) / height - 0.5;

      const rotateX = -mouseY * intensity;
      const rotateY = mouseX * intensity;

      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.018, 1.018, 1.018) translateZ(10px)`
      );

      setGlarePos({
        x: ((e.clientX - rect.left) / width) * 100,
        y: ((e.clientY - rect.top) / height) * 100,
        opacity: glareOpacity,
      });
    },
    [interactive, intensity, glareOpacity]
  );

  const handleMouseEnter = useCallback(() => {
    if (!interactive) return;
    setIsHovered(true);
  }, [interactive]);

  const handleMouseLeave = useCallback(() => {
    if (!interactive) return;
    setIsHovered(false);
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)');
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  }, [interactive]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: transformStyle || 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
        transition: isHovered
          ? 'transform 0.08s ease-out, box-shadow 0.2s ease-out'
          : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        ...style,
      }}
      className={`relative overflow-hidden rounded-2xl ${
        interactive
          ? 'cursor-pointer hover:shadow-[0_20px_45px_-10px_rgba(99,102,241,0.14),0_10px_25px_-5px_rgba(0,0,0,0.06)]'
          : ''
      } ${
        borderGlow && isHovered ? 'border-[#5B7BE8]/50 ring-1 ring-[#5B7BE8]/25' : ''
      } ${className}`}
      {...props}
    >
      {/* Dynamic Animated Border Beam on Hover */}
      {borderBeam && isHovered && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[1px] rounded-[inherit] z-0 overflow-hidden"
        >
          <div
            className="absolute inset-[-100%] animate-[spin_4s_linear_infinite]"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 310deg, rgba(99, 102, 241, 0.75) 345deg, rgba(6, 182, 212, 0.9) 360deg)',
            }}
          />
        </div>
      )}

      {/* Dynamic Specular Glare Sheen Overlay */}
      {interactive && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle 300px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 80%)`,
          }}
        />
      )}

      {/* Inner Card Backdrop for Border Beam isolation */}
      <div
        className="relative z-10 w-full h-full rounded-[inherit] bg-white/95"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
      </div>
    </div>
  );
};
