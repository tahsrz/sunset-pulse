'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, MeshDistortMaterial, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '@/context/ThemeProvider';

export interface SlideData {
  id: string;
  title: string;
  content: string;
  position: [number, number, number];
  rotation: [number, number, number];
  color?: string;
}

/**
 * BriefingSlide:
 * A 3D polygonal panel representing a single "slide" in the grid.
 */
const BriefingSlide = ({ 
  slide, 
  isActive, 
  onClick 
}: { 
  slide: SlideData, 
  isActive: boolean, 
  onClick: () => void 
}) => {
  const { branding, ghostDeckConfig } = useTheme();
  const baseColor = slide.color || branding.primaryColor;

  return (
    <group position={slide.position} rotation={slide.rotation}>
      <Float speed={isActive ? 2 : 1} rotationIntensity={0.2} floatIntensity={0.5}>
        {/* The Polygon Panel */}
        <mesh onClick={(e) => { 
          e.stopPropagation(); 
          if (!ghostDeckConfig.sequentialMode) onClick(); 
        }}>
          <planeGeometry args={[8, 4.5]} />
          <MeshDistortMaterial 
            color={baseColor}
            speed={isActive ? 3 : 1}
            distort={0.1}
            transparent
            opacity={isActive ? 0.9 : 0.2}
            emissive={baseColor}
            emissiveIntensity={isActive ? 0.5 : 0.1}
          />
        </mesh>

        {/* Tactical Border */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[8.2, 4.7]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>

        {/* SDF Text: Title */}
        <Text
          position={[-3.5, 1.8, 0.1]}
          fontSize={0.4}
          color="white"
          anchorX="left"
          font="/fonts/Inter-Bold.ttf" // Optional: path to your font
        >
          {slide.title.toUpperCase()}
        </Text>

        {/* SDF Text: Content */}
        <Text
          position={[-3.5, 0.5, 0.1]}
          fontSize={0.25}
          color="white"
          maxWidth={7}
          anchorX="left"
          anchorY="top"
          lineHeight={1.4}
          opacity={isActive ? 1 : 0.3}
        >
          {slide.content}
        </Text>

        {/* UI Decorative Elements */}
        <Html position={[3.5, -1.8, 0.1]} center>
          <div className={`px-3 py-1 border border-white/20 rounded-full text-[8px] font-mono whitespace-nowrap transition-all ${isActive ? 'bg-blue-600 text-white' : 'bg-black/40 text-white/40'}`}>
            SLIDE_ID: {slide.id}
          </div>
        </Html>
      </Float>
    </group>
  );
};

/**
 * TacticalBriefingEngine:
 * Manages the camera and state for the 3D presentation.
 */
export const TacticalBriefingEngine = ({ slides }: { slides: SlideData[] }) => {
  const { ghostDeckConfig } = useTheme();
  const [activeIdx, setActiveIdx] = useState(0);
  const targetCamPos = useRef(new THREE.Vector3(0, 5, 20));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Auto-Play Logic
  useEffect(() => {
    if (!ghostDeckConfig.autoPlay) return;

    const timer = setTimeout(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, ghostDeckConfig.autoPlayDelay);

    return () => clearTimeout(timer);
  }, [activeIdx, slides.length, ghostDeckConfig.autoPlay, ghostDeckConfig.autoPlayDelay]);

  useEffect(() => {
    if (!ghostDeckConfig.autoFlight) return;

    const s = slides[activeIdx];
    // Position camera offset from the slide
    const camOffset = new THREE.Vector3(0, 0, 12).applyEuler(new THREE.Euler(...s.rotation));
    targetCamPos.current.set(
      s.position[0] + camOffset.x,
      s.position[1] + camOffset.y,
      s.position[2] + camOffset.z
    );
    targetLookAt.current.set(...s.position);
  }, [activeIdx, slides, ghostDeckConfig.autoFlight]);

  useFrame((state) => {
    if (ghostDeckConfig.autoFlight) {
      // Smooth Camera Transition
      state.camera.position.lerp(targetCamPos.current, 0.05);
      
      if (ghostDeckConfig.lockOrientation) {
        state.camera.lookAt(targetLookAt.current);
      }
    }
  });

  return (
    <group>
      {slides.map((s, i) => (
        <BriefingSlide 
          key={s.id} 
          slide={s} 
          isActive={i === activeIdx} 
          onClick={() => setActiveIdx(i)} 
        />
      ))}

      {/* Navigation Controls Overlay */}
      {ghostDeckConfig.presentationMode && (
        <Html fullscreen>
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50">
            <button 
              onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
              className="p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-white/40 hover:text-blue-400 transition-all uppercase text-[10px] font-black tracking-widest"
            >
              [ PREV_SECTOR ]
            </button>
            
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-12 h-1 rounded-full transition-all ${i === activeIdx ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' : 'bg-white/10'}`} 
                />
              ))}
            </div>

            <button 
              onClick={() => setActiveIdx(prev => Math.min(slides.length - 1, prev + 1))}
              className="p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-white/40 hover:text-blue-400 transition-all uppercase text-[10px] font-black tracking-widest"
            >
              [ NEXT_SECTOR ]
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};
