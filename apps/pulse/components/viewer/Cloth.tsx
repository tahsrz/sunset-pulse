'use client';

import React, { useRef, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ClothProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
  segments?: [number, number]; // [width segments, height segments]
  dimensions?: [number, number]; // [width, height]
  mass?: number;
  stiffness?: number;
  damping?: number;
  gravity?: number;
  videoSrc?: string;
}

export interface ClothRef {
  applyImpulse: (position: THREE.Vector3, radius: number, strength: number) => void;
  reset: () => void;
}

/**
 * Advanced 3D Verlet Cloth for Ramza
 * Ported logic from legacy Cloth.mjs with R3F optimization.
 */
const Cloth = forwardRef<ClothRef, ClothProps>(({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1, 
  color = '#3b82f6',
  segments = [20, 20],
  dimensions = [5, 5],
  mass = 1.2,
  stiffness = 0.9,
  damping = 0.04,
  gravity = 9.8,
  videoSrc
}, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Physics State
  const points = useRef<{ pos: THREE.Vector3, oldPos: THREE.Vector3, pinned: boolean }[]>([]);
  const constraints = useRef<{ a: number, b: number, dist: number }[]>([]);
  
  // Initialization
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(dimensions[0], dimensions[1], segments[0], segments[1]);
    
    const pts = [];
    const cons = [];
    const posAttr = geo.attributes.position;
    
    for (let i = 0; i < posAttr.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      // Pinned top edge (assuming PlaneGeometry layout where top row is consistent)
      // Standard PlaneGeometry(W, H, sw, sh) has points from left-to-right, top-to-bottom.
      // Top row indices: 0 to segments[0]
      const isPinned = i <= segments[0];
      
      pts.push({
        pos: p.clone(),
        oldPos: p.clone(),
        pinned: isPinned
      });
    }

    // Constraints (Structural)
    for (let y = 0; y <= segments[1]; y++) {
      for (let x = 0; x <= segments[0]; x++) {
        const i = y * (segments[0] + 1) + x;
        
        if (x < segments[0]) {
          const right = i + 1;
          cons.push({ a: i, b: right, dist: pts[i].pos.distanceTo(pts[right].pos) });
        }
        if (y < segments[1]) {
          const down = i + (segments[0] + 1);
          cons.push({ a: i, b: down, dist: pts[i].pos.distanceTo(pts[down].pos) });
        }
      }
    }
    
    points.current = pts;
    constraints.current = cons;
    return geo;
  }, [dimensions, segments]);

  // Texture Handling
  const videoTexture = useMemo(() => {
    if (!videoSrc) return null;
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.play().catch(() => {});
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [videoSrc]);

  // Imperative API
  useImperativeHandle(ref, () => ({
    applyImpulse: (pos, radius, strength) => {
      points.current.forEach(p => {
        const d = p.pos.distanceTo(pos);
        if (d < radius) {
          const force = new THREE.Vector3().subVectors(p.pos, pos).normalize().multiplyScalar(strength);
          p.pos.add(force);
        }
      });
    },
    reset: () => {
      const posAttr = geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(posAttr, i);
        points.current[i].pos.copy(p);
        points.current[i].oldPos.copy(p);
      }
    }
  }));

  useFrame((state, delta) => {
    if (!meshRef.current || delta > 0.1) return;

    const subSteps = 8;
    const stepDelta = delta / subSteps;
    const g = new THREE.Vector3(0, -gravity * 0.01, 0); // Scale gravity to R3F space
    const f = 1.0 - damping;

    for (let s = 0; s < subSteps; s++) {
      // Integration
      points.current.forEach(p => {
        if (p.pinned) return;
        
        // velocity = (current - old) * friction
        const vx = (p.pos.x - p.oldPos.x) * f;
        const vy = (p.pos.y - p.oldPos.y) * f;
        const vz = (p.pos.z - p.oldPos.z) * f;

        p.oldPos.copy(p.pos);

        p.pos.x += vx;
        p.pos.y += vy + g.y;
        p.pos.z += vz;

        // Wind/Noise
        p.pos.z += Math.sin(state.clock.elapsedTime + p.pos.x) * 0.001;
      });

      // Constraints
      constraints.current.forEach(c => {
        const p1 = points.current[c.a];
        const p2 = points.current[c.b];
        
        const diff = new THREE.Vector3().subVectors(p2.pos, p1.pos);
        const currentDist = diff.length();
        const error = (c.dist - currentDist) / currentDist;
        const correction = diff.multiplyScalar(error * 0.5 * stiffness);
        
        if (!p1.pinned) p1.pos.sub(correction);
        if (!p2.pinned) p2.pos.add(correction);
      });
    }

    // Update Buffer
    const posAttr = geometry.attributes.position;
    points.current.forEach((p, i) => {
      posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
    });
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh 
      ref={meshRef} 
      position={position} 
      rotation={rotation} 
      scale={scale}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial 
        map={videoTexture}
        color={videoTexture ? '#ffffff' : color} 
        side={THREE.DoubleSide} 
        wireframe={false}
        metalness={0.4}
        roughness={0.5}
        emissive={color}
        emissiveIntensity={videoTexture ? 0.05 : 0.2}
      />
    </mesh>
  );
});

Cloth.displayName = 'Cloth';

export default Cloth;
