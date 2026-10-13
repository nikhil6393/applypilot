import React, { useEffect, useRef } from 'react';

/**
 * KineticAmbientBackdrop.jsx
 * Ambient 3D Depth Canvas & Stardust Aurora.
 * Adds ethereal depth, subtle floating stardust, and mouse-reactive light sweeps
 * to the authenticated workspace, matching the landing page's premium feel.
 */
export const KineticAmbientBackdrop = ({ opacity = 0.55 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse coordinates with momentum
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Stardust particles (lightweight: 42 particles)
    const PARTICLE_COUNT = 42;
    const particles = [];
    const colors = [
      'rgba(99, 102, 241, 0.45)', // Indigo
      'rgba(6, 182, 212, 0.40)',  // Cyan
      'rgba(168, 85, 247, 0.35)', // Violet
      'rgba(59, 130, 246, 0.35)', // Blue
      'rgba(16, 185, 129, 0.30)', // Emerald
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.5 + Math.random() * 1.5,
        radius: 1.2 + Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.25,
        color: colors[i % colors.length],
        alpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;
    const render = () => {
      // Pause if tab is backgrounded
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      time += 0.015;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Subtle dynamic ambient radial glow following cursor smoothly
      const gradient = ctx.createRadialGradient(
        mouseX,
        mouseY,
        40,
        mouseX,
        mouseY,
        520
      );
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.045)');
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.025)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render floating stardust particles with 3D depth parallax
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];

        // Apply velocities and subtle wave sway
        p.x += p.vx + Math.sin(time + p.phase) * 0.2;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Mouse displacement
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const force = (180 - dist) / 180;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }

        // Draw particle with glowing halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none transition-opacity duration-700"
      style={{
        zIndex: 0,
        opacity,
      }}
    />
  );
};

export default KineticAmbientBackdrop;
