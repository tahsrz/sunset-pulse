'use client';

import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useAuth } from '@/context/AuthContext';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { usePropertyImagery } from '@/hooks/usePropertyImagery';
import { useViewerTelemetry } from '@/hooks/useViewerTelemetry';
import ViewerOverlay from './viewer/ViewerOverlay';
import ViewerScene from './viewer/ViewerScene';

interface PropertyFiberViewerProps {
  property: any;
  color?: string;
  customConfig?: any;
  isNeuralMode?: boolean;
}

/**
 * PropertyFiberViewer - The High-Stakes 3D Property Exploration Engine.
 * Refactored for modularity and performance (v7.1.0).
 */
export default function PropertyFiberViewer({ 
  property, 
  color = '#ffffff', 
  customConfig, 
  isNeuralMode = false 
}: PropertyFiberViewerProps) {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email || 'Anonymous_User';

  // --- Hooks & State ---
  const [isNavigationMode, setNavigationMode] = useState(false);
  const [boundaryHit, setBoundaryHit] = useState(false);
  const viewPos = useRef(new THREE.Vector3(0, 8, 15));
  const viewRot = useRef({ yaw: 0, pitch: 0 });

  const { satelliteUrl } = usePropertyImagery(property);
  const { telemetry, updateTelemetry } = useViewerTelemetry(property);
  const { peers, sendUpdate, leadId, isMeLead } = useMultiplayer(userName, viewPos.current);

  // --- Handlers ---
  const handleUpdate = (pos: THREE.Vector3, rot: { yaw: number, pitch: number }) => {
    updateTelemetry(pos);
    viewPos.current.copy(pos);
    viewRot.current = rot;

    if (isNavigationMode) {
      sendUpdate(pos, rot, isMeLead);
    }
  };

  const toggleNavigation = () => setNavigationMode(prev => !prev);

  return (
    <div className={`relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group shadow-2xl transition-all duration-700 ${isNavigationMode ? 'ring-2 ring-blue-500/50' : ''}`}>
      
      {/* HUD / Overlay Layer */}
      <ViewerOverlay 
        propertyName={property.name || 'Property'}
        locationSnippet={property.location?.street?.slice(0, 10) || 'PROPERTY_BASE'}
        isNavigationMode={isNavigationMode}
        isNeuralMode={isNeuralMode}
        telemetry={telemetry}
        boundaryHit={boundaryHit}
        onToggleNavigation={toggleNavigation}
      />
      
      {/* 3D Rendering Layer */}
      <Canvas shadows dpr={[1, 2]}>
        <ViewerScene 
          property={property}
          isNavigationMode={isNavigationMode}
          isNeuralMode={isNeuralMode}
          primaryColor={color}
          customConfig={customConfig}
          peers={peers}
          leadId={leadId}
          onUpdate={handleUpdate}
          onBoundaryHit={setBoundaryHit}
        />
      </Canvas>
    </div>
  );
}
