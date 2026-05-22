'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NavigationControllerProps {
  onUpdate: (pos: THREE.Vector3, rot: { yaw: number, pitch: number }) => void;
  onBoundaryHit: (hit: boolean) => void;
}

const NavigationController: React.FC<NavigationControllerProps> = ({ 
  onUpdate, 
  onBoundaryHit 
}) => {
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const boundaryHitRef = useRef(false);
  const friction = 0.92;
  const acceleration = 0.02;

  useFrame((state) => {
    const keys = (window as any).pressedKeys || {};
    const boost = keys[' '] ? 2.5 : 1.0;
    const acc = acceleration * boost;

    if (keys['w']) velocity.current.z -= acc;
    if (keys['s']) velocity.current.z += acc;
    if (keys['a']) velocity.current.x -= acc;
    if (keys['d']) velocity.current.x += acc;

    if (keys['control']) velocity.current.y += acc;
    if (keys['shift']) velocity.current.y -= acc;

    velocity.current.multiplyScalar(friction);

    state.camera.translateX(velocity.current.x);
    state.camera.translateZ(velocity.current.z);
    state.camera.position.y += velocity.current.y;

    const limit = 45;
    const bounce = -0.6; 
    let hit = false;

    if (state.camera.position.x > limit) {
      state.camera.position.x = limit;
      velocity.current.x *= bounce;
      hit = true;
    } else if (state.camera.position.x < -limit) {
      state.camera.position.x = -limit;
      velocity.current.x *= bounce;
      hit = true;
    }

    if (state.camera.position.z > limit) {
      state.camera.position.z = limit;
      velocity.current.z *= bounce;
      hit = true;
    } else if (state.camera.position.z < -limit) {
      state.camera.position.z = -limit;
      velocity.current.z *= bounce;
      hit = true;
    }

    if (state.camera.position.y > 35) {
      state.camera.position.y = 35;
      velocity.current.y *= bounce;
      hit = true;
    } else if (state.camera.position.y < 1.2) {
      state.camera.position.y = 1.2;
      velocity.current.y *= 0; 
      hit = true;
    }

    if (hit !== boundaryHitRef.current) {
      boundaryHitRef.current = hit;
      onBoundaryHit(hit);
    }

    onUpdate(state.camera.position, { 
      yaw: state.camera.rotation.y, 
      pitch: state.camera.rotation.x 
    });
  });

  useEffect(() => {
    (window as any).pressedKeys = {};
    const down = (e: KeyboardEvent) => (window as any).pressedKeys[e.key.toLowerCase()] = true;
    const up = (e: KeyboardEvent) => (window as any).pressedKeys[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return null;
};

export default NavigationController;
