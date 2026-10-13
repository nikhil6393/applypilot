import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * CareerOrb3D.jsx
 * High-performance, lightweight Three.js 3D Interactive Career Sphere.
 * Features:
 * - Glowing dual-ring orbital coordinate planes
 * - Pulsing central icosahedral data core with gradient wireframe
 * - Kinetic stardust particle field with mouse-driven 3D parallax
 * - Smooth inertia damping and 60fps loop with zero garbage collection
 * - Proper WebGL resource cleanup on unmount
 */
export const CareerOrb3D = ({ width = 280, height = 180, className = '' }) => {
  const containerRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    let animationFrameId;
    const w = width;
    const h = height;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 18;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Core Sphere / Icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(4.2, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1, // Indigo
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // Inner glowing solid kernel
    const innerGeo = new THREE.IcosahedronGeometry(2.0, 0);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Sky Blue
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    rootGroup.add(innerMesh);

    // 2. Orbital Ring 1 (Tilted Equator)
    const ring1Geo = new THREE.TorusGeometry(6.4, 0.08, 8, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan
      transparent: true,
      opacity: 0.65,
    });
    const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1Mesh.rotation.x = Math.PI / 3;
    ring1Mesh.rotation.y = Math.PI / 6;
    rootGroup.add(ring1Mesh);

    // 3. Orbital Ring 2 (Orthogonal counter-orbit)
    const ring2Geo = new THREE.TorusGeometry(7.6, 0.06, 8, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xa855f7, // Purple
      transparent: true,
      opacity: 0.55,
    });
    const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2Mesh.rotation.x = -Math.PI / 4;
    ring2Mesh.rotation.z = Math.PI / 5;
    rootGroup.add(ring2Mesh);

    // 4. Stardust Particles Cloud
    const particleCount = 75;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorA = new THREE.Color(0x6366f1);
    const colorB = new THREE.Color(0x22d3ee);
    const colorC = new THREE.Color(0xa855f7);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const dist = 5.2 + Math.random() * 4.5;

      const px = dist * Math.sin(phi) * Math.cos(theta);
      const py = dist * Math.sin(phi) * Math.sin(theta);
      const pz = dist * Math.cos(phi);

      particlePositions[i * 3] = px;
      particlePositions[i * 3 + 1] = py;
      particlePositions[i * 3 + 2] = pz;

      const chosenColor = i % 3 === 0 ? colorA : i % 3 === 1 ? colorB : colorC;
      particleColors[i * 3] = chosenColor.r;
      particleColors[i * 3 + 1] = chosenColor.g;
      particleColors[i * 3 + 2] = chosenColor.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particles);

    // Mouse Interaction Variables
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetRotationY = x * 1.5;
      targetRotationX = y * 1.2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Ambient continuous rotation
      coreMesh.rotation.y += 0.007;
      coreMesh.rotation.x = Math.sin(elapsed * 0.4) * 0.15;

      innerMesh.rotation.y -= 0.012;
      innerMesh.rotation.z += 0.006;

      ring1Mesh.rotation.z += 0.009;
      ring2Mesh.rotation.z -= 0.007;

      particles.rotation.y += 0.003;

      // Pulse core scale slightly
      const pulse = 1 + Math.sin(elapsed * 1.8) * 0.04;
      innerMesh.scale.set(pulse, pulse, pulse);

      // Smooth mouse parallax damping
      rootGroup.rotation.y += (targetRotationY - rootGroup.rotation.y) * 0.05;
      rootGroup.rotation.x += (targetRotationX - rootGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [width, height]);

  if (!hasWebGL) {
    // Elegant CSS Fallback if WebGL is disabled
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="w-24 h-24 rounded-full border-2 border-indigo-400 border-dashed animate-spin flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-indigo-500/20 animate-ping" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative select-none pointer-events-none ${className}`}
      style={{
        width,
        height,
        filter: 'drop-shadow(0 12px 24px rgba(91, 77, 240, 0.22))',
      }}
    />
  );
};

export default CareerOrb3D;
