'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Vector, Matrix } from '@/lib/visualization/engine/math';
import { Renderer, Mesh3D } from '@/lib/visualization/engine/renderer';
import { generatePropertyModel } from '@/lib/visualization/engine/generator';
import { centerModel } from '@/lib/visualization/threeUtils';
import { useTheme } from '@/context/ThemeProvider';
import { useMultiplayer } from '@/hooks/useMultiplayer'; 
import { useJamiePulse } from '@/context/JamiePulseContext';
import { usePropertyInteraction } from '@/hooks/usePropertyInteraction';
import { useOrbitalNavigation } from '@/hooks/useOrbitalNavigation';
import ViewerHUD from './viewer/ViewerHUD';
import GhostReconOverlays from './viewer/GhostReconOverlays';

interface SunsetPulseViewerProps {
  objUrl?: string;
  property: any;
  userId: string;
  userName: string;
}

/**
 * SunsetPulseViewer - High-Performance Custom 3D Engine Viewer.
 * Refactored to TS and modular hooks (v7.2.0).
 */
const SunsetPulseViewer: React.FC<SunsetPulseViewerProps> = ({ 
  objUrl, 
  property, 
  userId, 
  userName 
}) => {
  const propId = property?._id;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const { branding, isDevMode } = useTheme();
  const { latestBriefing } = useJamiePulse();
  
  // --- UI State ---
  const [loading, setLoading] = useState(true);
  const [fps, setFps] = useState(0);
  const [isCommentMode, setCommentMode] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [pendingCommentPos, setPendingCommentPos] = useState<any>(null);
  const [isDataOverlayActive, setDataOverlayActive] = useState(false);
  const [isIntelOverlayActive, setIntelOverlayActive] = useState(true);
  const [projectedHotspots, setProjectedHotspots] = useState<any[]>([]);
  const [camOrientation, setCamOrientation] = useState({ yaw: 0, pitch: -0.2 });

  // --- Refs ---
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // --- Custom Hooks ---
  const { 
    orbitState, 
    mouseRef, 
    handleMouseDown, 
    handleMouseMove, 
    handleMouseUp 
  } = useOrbitalNavigation();

  const {
    isInCollection,
    comments,
    handleToggleCollection,
    submitComment
  } = usePropertyInteraction(propId, userId, userName, property);

  const { 
    peers, 
    leadId, 
    presentationMode,
    togglePresentationMode: setPresentationMode 
  } = useMultiplayer(property?.name || 'User', new Vector(0,0,0));

  // --- Hotspots Calculation ---
  const hotspots = React.useMemo(() => [
    { pos: new Vector(10, 10, 10), label: `Price/sqft: $${property?.square_feet ? Math.round(property.rates?.monthly / (property.square_feet / 10)) : 'N/A'}`, key: 'price' },
    { pos: new Vector(-10, 15, -10), label: `Score: ${property?.is_featured ? '9.8 (Elite)' : '8.2 (Solid)'}`, key: 'judge' },
    { pos: new Vector(0, 20, 5), label: `Status: ${property?.type || 'Available'}`, key: 'status' },
  ], [property]);

  const getBrandingColor = () => {
    const hex = branding?.primaryColor || '#3b82f6';
    if (hex.startsWith('#') && hex.length >= 7) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }
    return { r: 59, g: 130, b: 246 };
  };

  const handleDropComment = async () => {
    if (!pendingCommentPos || !newComment) return;
    
    const commentData = {
      property_id: propId,
      user_id: userId,
      user_name: userName || 'Consumer',
      content: newComment,
      position_x: pendingCommentPos.x,
      position_y: pendingCommentPos.y,
      position_z: pendingCommentPos.z
    };

    try {
      await submitComment(commentData);
      setNewComment('');
      setPendingCommentPos(null);
      setCommentMode(false);
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleCanvasClick = () => {
    if (isCommentMode) {
      setPendingCommentPos({ x: 0, y: 10, z: 0 });
    }
  };

  // --- Engine Lifecycle ---
  useEffect(() => {
    let animationId: number;
    if (!canvasRef.current) return;

    const initEngine = async () => {
      setLoading(true);
      const canvas = canvasRef.current!;
      const color = getBrandingColor();
      const renderer = new Renderer(canvas, { 
        wireframe: isDevMode, 
        wireframeColor: `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)` 
      });
      rendererRef.current = renderer;

      try {
        let mesh = null;
        if (objUrl) {
          try {
            mesh = await Mesh3D.loadFromObj(objUrl, color);
          } catch (e) {
            mesh = Mesh3D.loadFromRaw(generatePropertyModel(property, false), color);
          }
        } else {
          mesh = Mesh3D.loadFromRaw(generatePropertyModel(property, false), color);
        }
        
        if (mesh) {
          centerModel(mesh);
          renderer.meshes = [mesh];
        }
      } catch (error) {
        console.error('[SP-RE_ENGINE] Init Error:', error);
      } finally {
        setLoading(false);
      }

      const renderLoop = (time: number) => {
        frameCountRef.current++;
        if (time > lastTimeRef.current + 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (time - lastTimeRef.current)));
          lastTimeRef.current = time;
          frameCountRef.current = 0;
        }

        if (rendererRef.current) {
          const renderer = rendererRef.current;
          
          if (!mouseRef.current.isDown) {
            orbitState.current.yaw += 0.005; // Auto-rotate
          }

          const camPos = new Vector(0, -5, 60);
          const camRot = Matrix.fromEuler(orbitState.current.yaw, orbitState.current.pitch);
          
          renderer.render(new Vector(0,0,0), camRot, camPos);

          // Render Tactical Spires
          if (isIntelOverlayActive && latestBriefing?.news_articles) {
            latestBriefing.news_articles.forEach((article: any, idx: number) => {
              let pos = new Vector(0,0,0);
              if (article.geo_tag?.lat && article.geo_tag?.lng) {
                const latOffset = (article.geo_tag.lat - (property?.location?.lat || 33.1)) * 5000;
                const lngOffset = (article.geo_tag.lng - (property?.location?.lng || -96.8)) * 5000;
                pos = new Vector(lngOffset, 15, -latOffset);
              } else {
                pos = new Vector((idx % 2 === 0 ? 1 : -1) * (35 + idx * 5), 15, (idx % 3 === 0 ? 1 : -1) * (25 + idx * 2));
              }
              const color = article.visualizer_config?.color || '#3b82f6';
              renderer.drawTacticalSpire(pos, color, camRot, camPos);
            });

            renderer.drawTacticalSpire(new Vector(15, 25, -15), '#3b82f6', camRot, camPos);
            renderer.drawTacticalSpire(new Vector(-15, 25, -15), '#94a3b8', camRot, camPos);
          }

          setCamOrientation({ yaw: orbitState.current.yaw, pitch: orbitState.current.pitch });

          if (isDataOverlayActive) {
            const projected = hotspots.map(h => {
              const screenPos = renderer.projectPoint(h.pos, new Vector(0,0,0), camRot, new Vector(0,0,0));
              return screenPos ? { ...h, ...screenPos } : null;
            }).filter(Boolean);
            if (frameCountRef.current % 2 === 0) setProjectedHotspots(projected);
          }
        }
        animationId = requestAnimationFrame(renderLoop);
      };
      animationId = requestAnimationFrame(renderLoop);
    };

    initEngine();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      rendererRef.current = null;
    };
  }, [objUrl, propId, isDataOverlayActive, property, hotspots, isDevMode, latestBriefing, isIntelOverlayActive]);

  return (
    <div className='relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group' onContextMenu={(e) => e.preventDefault()}>
      <div className='absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]' />
      
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full cursor-grab active:cursor-grabbing transition-all duration-1000 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      />

      <ViewerHUD
        loading={loading}
        branding={branding}
        isNavigationMode={false}
        handleNavigationToggle={() => {}}
        fps={fps}
        isDevMode={isDevMode}
        isDataOverlayActive={isDataOverlayActive}
        setDataOverlayActive={setDataOverlayActive}
        isPOIOverlayActive={isIntelOverlayActive}
        setPOIOverlayActive={setIntelOverlayActive}
        projectedHotspots={projectedHotspots}
        comments={comments}
        renderer={rendererRef.current}
        navigationState={{ current: { pos: new Vector(0,0,0), rot: { yaw: orbitState.current.yaw, pitch: orbitState.current.pitch } } }}
        property={property}
        isInCollection={isInCollection}
        handleToggleCollection={handleToggleCollection}
        isCommentMode={isCommentMode}
        setCommentMode={setCommentMode}
        presentationMode={presentationMode}
        setPresentationMode={setPresentationMode}
        pendingCommentPos={pendingCommentPos}
        setPendingCommentPos={setPendingCommentPos}
        newComment={newComment}
        setNewComment={setNewComment}
        handleDropComment={handleDropComment}
      />

      {isIntelOverlayActive && (
        <GhostReconOverlays
          latestBriefing={latestBriefing}
          renderer={rendererRef.current}
          camRot={Matrix.fromEuler(camOrientation.yaw, camOrientation.pitch)}
          camPos={new Vector(0, -5, 60)}
          property={property}
        />
      )}
    </div>
  );
};

export default SunsetPulseViewer;
