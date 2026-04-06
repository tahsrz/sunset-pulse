'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Vector, Matrix } from '@/lib/visualization/engine/math';
import { Renderer, Mesh3D } from '@/lib/visualization/engine/renderer';
import { generateHallwayModel } from '@/lib/visualization/engine/generator';
import { centerModel } from '@/lib/visualization/threeUtils';
import { useTheme } from '@/context/ThemeProvider';

import { useDroneControls } from '@/hooks/useDroneControls';
import { useTrainingCourse } from '@/hooks/useTrainingCourse';
import ViewerHUD from './viewer/ViewerHUD';

interface DroneDemoViewerProps {
  property: any;
  userId: string;
  userName: string;
}

const DroneDemoViewer: React.FC<DroneDemoViewerProps> = ({ property, userId, userName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const { branding, isDevMode } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [fps, setFps] = useState(0);

  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  const {
    droneState,
    updateDrone,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useDroneControls(canvasRef, 'demo-drone', userId, userName);

  const {
    level,
    ringMeshesRef,
    ringsPassedRef,
    initRings,
    checkProximity
  } = useTrainingCourse();

  const getBrandingColor = () => {
    return { r: 59, g: 130, b: 246 }; // Default blue for demo
  };

  const togglePointerLock = () => {
    if (canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  };

  useEffect(() => {
    let animationId: number;
    if (!canvasRef.current) return;

    const initEngine = async () => {
      setLoading(true);
      const canvas = canvasRef.current!;
      const color = getBrandingColor();
      const renderer = new Renderer(canvas, { 
        wireframe: true, 
        wireframeColor: `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)` 
      });
      rendererRef.current = renderer;

      try {
        // Generate a long hallway / facility model
        const rawObj = generateHallwayModel(); 
        const mesh = Mesh3D.loadFromRaw(rawObj, color);
        
        initRings(level);
        
        if (mesh) {
          centerModel(mesh);
          renderer.meshes = [mesh];
        }
      } catch (error) {
        console.error('[DRONE-DEMO] Init Error:', error);
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
          const state = droneState.current;
          
          updateDrone(false, false, null); // Manual control always

          const camRot = Matrix.fromEuler(state.rot.yaw, state.rot.pitch);
          const camPos = new Vector(0, -5, 60);
          renderer.render(state.pos, camRot, camPos);
          
          checkProximity(state.pos);

          // Render Rings
          ringMeshesRef.current.forEach(rm => {
            const isPassed = ringsPassedRef.current.has(rm.data.id);
            renderer.showWireframe = !isPassed;
            renderer.renderMesh(rm.mesh, new Vector(0,0,0), camRot, camPos);
            renderer.showWireframe = true;
          });
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
  }, [property, initRings, updateDrone, checkProximity, level]);

  return (
    <div className='relative w-full h-[600px] bg-slate-950 rounded-[2rem] overflow-hidden group shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]' onContextMenu={(e) => e.preventDefault()}>
      <div className='absolute inset-0 pointer-events-none z-10 opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]' />
      
      <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        onClick={togglePointerLock}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full cursor-crosshair transition-all duration-1000 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      />

      <ViewerHUD
        loading={loading}
        branding={branding}
        isDroneMode={true}
        handleDroneToggle={() => {}}
        fps={fps}
        level={level}
        isDevMode={isDevMode}
        isDataOverlayActive={false}
        setDataOverlayActive={() => {}}
        projectedHotspots={[]}
        comments={[]}
        renderer={rendererRef.current}
        droneState={droneState}
        property={property}
        isInCollection={false}
        handleToggleCollection={() => {}}
        isCommentMode={false}
        setCommentMode={() => {}}
        presentationMode={false}
        setPresentationMode={() => {}}
        pendingCommentPos={null}
        setPendingCommentPos={() => {}}
        newComment=""
        setNewComment={() => {}}
        handleDropComment={() => {}}
      />
    </div>
  );
};

export default DroneDemoViewer;
