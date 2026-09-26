import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HoloSphere3DProps {
  size?: number;
  active?: boolean;
  className?: string;
}

export const HoloSphere3D: React.FC<HoloSphere3DProps> = ({
  size = 36,
  active = true,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for combined rotations
    const group = new THREE.Group();
    scene.add(group);

    // 1. Outer Wireframe Icosahedron
    const outerGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerMesh);

    // 2. Inner Glowing Core
    const innerGeo = new THREE.OctahedronGeometry(0.65, 0);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    // 3. Orbiting Equatorial Ring
    const ringGeo = new THREE.RingGeometry(1.4, 1.48, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    group.add(ringMesh);

    let frameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const speedMultiplier = active ? 1.6 : 0.8;

      group.rotation.y += 0.8 * delta * speedMultiplier;
      group.rotation.x += 0.4 * delta * speedMultiplier;

      innerMesh.rotation.y -= 1.2 * delta * speedMultiplier;
      innerMesh.rotation.z += 0.6 * delta * speedMultiplier;

      ringMesh.rotation.z += 0.5 * delta * speedMultiplier;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      outerGeo.dispose();
      outerMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, [size, active]);

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center flex-shrink-0 cursor-pointer ${className}`}
    />
  );
};
