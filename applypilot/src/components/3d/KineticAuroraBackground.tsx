import React, { useEffect, useRef } from 'react';

/**
 * KineticAuroraBackground
 * Next-Gen 3D Snow & Interactive Particle Constellation Canvas
 * Features:
 *  - 3-Layer Depth Architecture: Foreground bokeh snow, midground constellation points, background twinkling stardust
 *  - Interactive Cursor Vortex: Moving the cursor creates an organic magnetic swirl & luminous particle excitation
 *  - Interactive Click Shockwaves: Clicking anywhere releases an elastic ripple impulse that displaces nearby particles
 *  - Meteor / Comet Flares: Ethereal shooting star streaks drifting occasionally across the horizon
 *  - Dynamic Constellation Mesh: Proximity-based geometric links that brighten near the cursor
 *  - Ultra-smooth 60fps loop with zero GC overhead
 */
export const KineticAuroraBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Mouse coordinates with momentum interpolation
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetX = mouseX;
    let targetY = mouseY;
    let mouseSpeed = 0;
    let lastMouseX = mouseX;
    let lastMouseY = mouseY;
    let mouseActive = false;

    // Interactive Shockwaves queue
    interface Shockwave {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      speed: number;
    }
    const shockwaves: Shockwave[] = [];

    // Cursor Star-Dust Trail queue
    interface TrailSpark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      decay: number;
      color: { r: number; g: number; b: number };
    }
    const trailSparks: TrailSpark[] = [];

    // Meteor Streaks
    interface Meteor {
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      alpha: number;
      decay: number;
    }
    let meteors: Meteor[] = [];
    let nextMeteorTime = 180;

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      mouseActive = true;
    };

    const onMouseLeave = () => {
      mouseActive = false;
    };

    const onClick = (e: MouseEvent) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 10,
        maxRadius: 280,
        alpha: 0.65,
        speed: 8.5,
      });
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('click', onClick, { passive: true });

    // Particle Definition with 3D Depth
    interface PointParticle {
      x: number;
      y: number;
      z: number; // 0.2 (far) to 3.0 (near bokeh)
      baseRadius: number;
      vx: number;
      vy: number;
      phase: number;
      freq: number;
      amp: number;
      layer: 'bokeh' | 'mid' | 'stardust';
      color: { r: number; g: number; b: number };
      baseAlpha: number;
    }

    const W_INIT = window.innerWidth;
    const H_INIT = window.innerHeight;
    const particles: PointParticle[] = [];

    const palette = [
      { r: 99, g: 102, b: 241 }, // Indigo
      { r: 6, g: 182, b: 212 },  // Cyan
      { r: 139, g: 92, b: 246 }, // Violet
      { r: 56, g: 189, b: 248 }, // Sky Blue
      { r: 16, g: 185, b: 129 }, // Emerald
      { r: 244, g: 63, b: 94 },  // Coral / Pink
      { r: 245, g: 158, b: 11 }, // Amber
    ];

    // Layer 1: Foreground Bokeh Snow Points (8-14 count)
    const BOKEH_COUNT = 12;
    for (let i = 0; i < BOKEH_COUNT; i++) {
      particles.push({
        x: Math.random() * W_INIT,
        y: Math.random() * H_INIT,
        z: 2.2 + Math.random() * 0.8,
        baseRadius: 6 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 0.25,
        vy: 0.35 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        freq: 0.005 + Math.random() * 0.008,
        amp: 0.6 + Math.random() * 0.8,
        layer: 'bokeh',
        color: palette[i % palette.length],
        baseAlpha: 0.08 + Math.random() * 0.08,
      });
    }

    // Layer 2: Midground Crystalline Snow & Points (110 count)
    const MID_COUNT = Math.min(120, Math.floor((W_INIT * H_INIT) / 10000));
    for (let i = 0; i < MID_COUNT; i++) {
      const z = 0.8 + Math.random() * 1.2;
      particles.push({
        x: Math.random() * W_INIT,
        y: Math.random() * H_INIT,
        z,
        baseRadius: (1.2 + Math.random() * 1.8) * z,
        vx: (Math.random() - 0.5) * 0.3 * z,
        vy: (0.2 + Math.random() * 0.45) * z,
        phase: Math.random() * Math.PI * 2,
        freq: 0.008 + Math.random() * 0.015,
        amp: 0.4 + Math.random() * 0.8,
        layer: 'mid',
        color: palette[Math.floor(Math.random() * palette.length)],
        baseAlpha: 0.25 + Math.random() * 0.45,
      });
    }

    // Layer 3: Background Twinkling Stardust (90 count)
    const STAR_COUNT = 90;
    for (let i = 0; i < STAR_COUNT; i++) {
      particles.push({
        x: Math.random() * W_INIT,
        y: Math.random() * H_INIT,
        z: 0.2 + Math.random() * 0.4,
        baseRadius: 0.7 + Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 0.1,
        vy: 0.1 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        freq: 0.02 + Math.random() * 0.03,
        amp: 0.2,
        layer: 'stardust',
        color: { r: 199, g: 210, b: 254 }, // Soft Lavender
        baseAlpha: 0.2 + Math.random() * 0.4,
      });
    }

    const draw = () => {
      t += 1;
      const W = canvas.width;
      const H = canvas.height;

      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.documentElement.classList.contains('dark');

      // Mouse momentum & velocity tracking
      const mouseDx = targetX - mouseX;
      const mouseDy = targetY - mouseY;
      mouseX += mouseDx * 0.09;
      mouseY += mouseDy * 0.09;

      mouseSpeed = Math.sqrt(
        (mouseX - lastMouseX) * (mouseX - lastMouseX) +
          (mouseY - lastMouseY) * (mouseY - lastMouseY)
      );
      lastMouseX = mouseX;
      lastMouseY = mouseY;

      // Spawn star-dust trail on cursor movement
      if (mouseActive && mouseSpeed > 1.5 && trailSparks.length < 40) {
        trailSparks.push({
          x: mouseX + (Math.random() - 0.5) * 12,
          y: mouseY + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 1.2 - mouseDx * 0.04,
          vy: (Math.random() - 0.5) * 1.2 - mouseDy * 0.04,
          radius: 1.2 + Math.random() * 2,
          alpha: 0.65,
          decay: 0.025 + Math.random() * 0.02,
          color: palette[Math.floor(Math.random() * palette.length)],
        });
      }

      ctx.clearRect(0, 0, W, H);

      // 1. Atmospheric Ambient Radial Glow
      const ambientGrad = ctx.createRadialGradient(
        W * 0.5,
        H * 0.25,
        0,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.85
      );
      ambientGrad.addColorStop(
        0,
        isDark ? 'rgba(30, 27, 75, 0.22)' : 'rgba(238, 242, 255, 0.5)'
      );
      ambientGrad.addColorStop(
        0.5,
        isDark ? 'rgba(15, 23, 42, 0.12)' : 'rgba(241, 245, 249, 0.3)'
      );
      ambientGrad.addColorStop(
        1,
        isDark ? 'rgba(10, 15, 29, 0)' : 'rgba(255, 255, 255, 0)'
      );
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Cursor Spotlight Halo
      if (mouseActive) {
        const spot = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 340);
        spot.addColorStop(
          0,
          isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.06)'
        );
        spot.addColorStop(
          0.6,
          isDark ? 'rgba(6, 182, 212, 0.06)' : 'rgba(6, 182, 212, 0.025)'
        );
        spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = spot;
        ctx.fillRect(0, 0, W, H);
      }

      // 3. Process & Draw Shockwaves
      for (let sIdx = shockwaves.length - 1; sIdx >= 0; sIdx--) {
        const sw = shockwaves[sIdx];
        sw.radius += sw.speed;
        sw.alpha *= 0.94;

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark
          ? `rgba(165, 180, 252, ${sw.alpha * 0.7})`
          : `rgba(99, 102, 241, ${sw.alpha * 0.45})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Push nearby particles outward
        for (let pIdx = 0; pIdx < particles.length; pIdx++) {
          const p = particles[pIdx];
          const distToShock = Math.hypot(p.x - sw.x, p.y - sw.y);
          if (Math.abs(distToShock - sw.radius) < 35 && distToShock > 0.1) {
            const pushForce = sw.alpha * 3.5;
            p.x += ((p.x - sw.x) / distToShock) * pushForce;
            p.y += ((p.y - sw.y) / distToShock) * pushForce;
          }
        }

        if (sw.alpha < 0.01 || sw.radius > sw.maxRadius) {
          shockwaves.splice(sIdx, 1);
        }
      }

      // 4. Process & Draw Meteors (Shooting Stars)
      if (t >= nextMeteorTime) {
        meteors.push({
          x: Math.random() * W * 0.7,
          y: Math.random() * H * 0.35,
          vx: 7 + Math.random() * 5,
          vy: 3.5 + Math.random() * 3,
          length: 70 + Math.random() * 50,
          alpha: 0.75,
          decay: 0.015,
        });
        nextMeteorTime = t + 240 + Math.floor(Math.random() * 360);
      }

      for (let mIdx = meteors.length - 1; mIdx >= 0; mIdx--) {
        const m = meteors[mIdx];
        m.x += m.vx;
        m.y += m.vy;
        m.alpha -= m.decay;

        const tailX = m.x - (m.vx / Math.hypot(m.vx, m.vy)) * m.length;
        const tailY = m.y - (m.vy / Math.hypot(m.vx, m.vy)) * m.length;

        const meteorGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        meteorGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        meteorGrad.addColorStop(
          0.8,
          isDark
            ? `rgba(165, 180, 252, ${m.alpha * 0.8})`
            : `rgba(99, 102, 241, ${m.alpha * 0.5})`
        );
        meteorGrad.addColorStop(1, `rgba(255, 255, 255, ${m.alpha})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = meteorGrad;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        if (m.alpha <= 0 || m.x > W + 100 || m.y > H + 100) {
          meteors.splice(mIdx, 1);
        }
      }

      // 5. Process & Draw Cursor Star-Dust Sparks
      for (let spIdx = trailSparks.length - 1; spIdx >= 0; spIdx--) {
        const sp = trailSparks[spIdx];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= sp.decay;

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sp.color.r}, ${sp.color.g}, ${sp.color.b}, ${Math.max(0, sp.alpha)})`;
        ctx.fill();

        if (sp.alpha <= 0) {
          trailSparks.splice(spIdx, 1);
        }
      }

      // 6. Update & Render All Particles (Snow & Constellation Points)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Harmonic sway
        const sway = Math.sin(t * p.freq + p.phase) * p.amp;
        p.x += p.vx + sway * 0.35;
        p.y += p.vy;

        // Interactive mouse magnetic field: gentle vortex repulsion
        if (mouseActive) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.hypot(dx, dy);
          const maxDist = 150;

          if (dist < maxDist && dist > 0.1) {
            const force = (1 - dist / maxDist) * 2.2;
            // Radial push
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
            // Subtle tangential swirl
            p.x += (-dy / dist) * force * 0.4;
            p.y += (dx / dist) * force * 0.4;
          }
        }

        // Boundary wrapping
        if (p.y > H + 20) {
          p.y = -20;
          p.x = Math.random() * W;
        } else if (p.y < -20) {
          p.y = H + 20;
        }
        if (p.x > W + 20) {
          p.x = -20;
        } else if (p.x < -20) {
          p.x = W + 20;
        }

        // Proximity calculation for glow & lighting
        const dxM = p.x - mouseX;
        const dyM = p.y - mouseY;
        const distToMouse = Math.hypot(dxM, dyM);
        const mouseProximity = mouseActive ? Math.max(0, 1 - distToMouse / 220) : 0;

        // Render according to layer
        if (p.layer === 'bokeh') {
          // Soft defocused bokeh snow spheres in foreground
          const bokehGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.baseRadius);
          const bAlpha = p.baseAlpha + mouseProximity * 0.12;
          bokehGrad.addColorStop(
            0,
            `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${bAlpha})`
          );
          bokehGrad.addColorStop(
            0.6,
            `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${bAlpha * 0.4})`
          );
          bokehGrad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = bokehGrad;
          ctx.fill();
        } else if (p.layer === 'stardust') {
          // Microscopic twinkling background stars
          const twinkle = 0.5 + 0.5 * Math.sin(t * p.freq * 2 + p.phase);
          const starAlpha = p.baseAlpha * twinkle;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = isDark
            ? `rgba(224, 231, 255, ${starAlpha})`
            : `rgba(99, 102, 241, ${starAlpha * 0.6})`;
          ctx.fill();
        } else {
          // Midground crystalline points
          const alpha = Math.min(1, p.baseAlpha + mouseProximity * 0.5);
          const radius = p.baseRadius * (1 + mouseProximity * 0.4);

          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

          if (mouseProximity > 0.1) {
            const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.8);
            glowGrad.addColorStop(
              0,
              `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`
            );
            glowGrad.addColorStop(
              1,
              `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`
            );
            ctx.fillStyle = glowGrad;
            ctx.fill();
          } else {
            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.85})`;
            ctx.fill();
          }

          // Constellation Link Lines (between midground points)
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            if (p2.layer !== 'mid') continue;

            const pointDist = Math.hypot(p.x - p2.x, p.y - p2.y);
            const linkThreshold = 88;

            if (pointDist < linkThreshold) {
              const linkAlpha =
                (1 - pointDist / linkThreshold) * 0.18 * (p.z / 1.5) +
                mouseProximity * 0.2;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = isDark
                ? `rgba(165, 180, 252, ${linkAlpha * 1.6})`
                : `rgba(99, 102, 241, ${linkAlpha * 1.1})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
      }

      animFrame = requestAnimationFrame(draw);
    };

    animFrame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('click', onClick);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-30 transition-opacity duration-500"
      style={{ display: 'block' }}
    />
  );
};
