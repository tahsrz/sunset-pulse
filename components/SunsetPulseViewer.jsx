'use client';
import { useEffect, useRef, useState } from 'react';
import { Vector, Matrix } from '@/utils/sunset-pulse-engine/math';
import { Renderer, Mesh3D } from '@/utils/sunset-pulse-engine/renderer';
import { generatePropertyModel } from '@/utils/sunset-pulse-engine/generator';
import { centerModel } from '@/utils/threeUtils';
import { useTheme } from '@/context/ThemeProvider';
import { useMultiplayer } from '@/hooks/useMultiplayer'; 
import { FaSync, FaCrosshairs, FaWind, FaMap, FaTrophy } from 'react-icons/fa';
import { TbDrone } from 'react-icons/tb';

const SunsetPulseViewer = ({ objUrl, property }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const { branding, isDevMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isDroneMode, setDroneMode] = useState(false);
  const [fps, setFps] = useState(0);

  const orbitState = useRef({ yaw: 0, pitch: -0.2 });
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  const droneState = useRef({
    pos: new Vector(0, 5, -40),
    vel: new Vector(0, 0, 0),
    rot: { yaw: 0, pitch: 0 },
    angVel: { yaw: 0, pitch: 0 }
  });

  // Multiplayer Ghost Storage. Who You Gonna Call?
  const { peers } = useMultiplayer(property?.name || 'User', droneState.current.pos);
  const ghostMeshesRef = useRef({}); // Cleaned: Removed TypeScript generics
  const mouseRef = useRef({ isDown: false, button: 0, lastX: 0, lastY: 0 });
  const keysRef = useRef({});

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

  // Safe ID extraction to prevent the "Expected ',' got '?'" error
  const propId = property ? property._id : null;

  useEffect(() => {
    const handleKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    const handleMouseMove = (e) => {
      if (document.pointerLockElement === canvasRef.current && isDroneMode) {
        const sensitivity = 0.003;
        droneState.current.rot.yaw += e.movementX * sensitivity;
        droneState.current.rot.pitch -= e.movementY * sensitivity;
        // Clamp pitch to prevent flipping
        droneState.current.rot.pitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, droneState.current.rot.pitch));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDroneMode]);

  const togglePointerLock = () => {
    if (isDroneMode && canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  };

  useEffect(() => {
    let animationId;
    if (!canvasRef.current) return;

    const initEngine = async () => {
      setLoading(true);
      const canvas = canvasRef.current;
      const color = getBrandingColor();
      const renderer = new Renderer(canvas, { 
        wireframe: true, 
        wireframeColor: `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)` 
      });
      rendererRef.current = renderer;

      try {
        let mesh;
        if (isDroneMode) {
          const rawObj = generatePropertyModel(property, true);
          mesh = Mesh3D.loadFromRaw(rawObj, color);
        } else if (objUrl) {
          try {
            mesh = await Mesh3D.loadFromObj(objUrl, color);
          } catch (e) {
            const rawObj = generatePropertyModel(property, false);
            mesh = Mesh3D.loadFromRaw(rawObj, color);
          }
        } else {
          const rawObj = generatePropertyModel(property, false);
          mesh = Mesh3D.loadFromRaw(rawObj, color);
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

      const renderLoop = (time) => {
        frameCountRef.current++;
        if (time > lastTimeRef.current + 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (time - lastTimeRef.current)));
          lastTimeRef.current = time;
          frameCountRef.current = 0;
        }

        if (rendererRef.current) {
          const renderer = rendererRef.current;
          let camPos, camRot;

          if (!isDroneMode) {
            camPos = new Vector(0, -5, 60);
            camRot = Matrix.fromEuler(orbitState.current.yaw, orbitState.current.pitch);
            if (!mouseRef.current.isDown) orbitState.current.yaw += 0.005;
            renderer.render(new Vector(0,0,0), camRot, camPos);
          } else {
            const state = droneState.current;
            const keys = keysRef.current;
            const boost = keys['shift'] ? 2.5 : 1.0;
            const speed = 0.5 * boost;

            // WASD Logic
            const forward = new Vector(0, 0, 1).rotate(state.rot.yaw, 0);
            const right = new Vector(1, 0, 0).rotate(state.rot.yaw, 0);

            if (keys['w']) state.vel = state.vel.add(forward.multiplyByScalar(speed));
            if (keys['s']) state.vel = state.vel.add(forward.multiplyByScalar(-speed));
            if (keys['a']) state.vel = state.vel.add(right.multiplyByScalar(-speed));
            if (keys['d']) state.vel = state.vel.add(right.multiplyByScalar(speed));
            if (keys[' ']) state.vel.set(1, state.vel.y + speed); // Space to go up
            if (keys['c'] || keys['control']) state.vel.set(1, state.vel.y - speed); // Ctrl/C to go down

            // Rotation (Q/E) WIP
            if (keys['q']) state.angVel.yaw -= 0.005;
            if (keys['e']) state.angVel.yaw += 0.005;

            state.rot.yaw += state.angVel.yaw;
            state.angVel.yaw *= 0.85;
            state.pos = state.pos.add(state.vel);
            state.vel = state.vel.multiplyByScalar(0.92);

            camRot = Matrix.fromEuler(state.rot.yaw, state.rot.pitch);
            camPos = new Vector(0, -5, 60);
            renderer.render(state.pos, camRot, camPos);
          }

          // Multiplayer Loop (Cleaned: Removed ": any")
          Object.entries(peers).forEach(([id, pos]) => {
            if (!ghostMeshesRef.current[id]) {
              ghostMeshesRef.current[id] = Mesh3D.createCube(0.5, { r: 255, g: 215, b: 0 });
            }
            const ghost = ghostMeshesRef.current[id];
            renderer.renderMesh(ghost, new Vector(pos.x, pos.y, pos.z), camRot, camPos);
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
  }, [objUrl, propId, isDroneMode, peers]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    mouseRef.current.isDown = true;
    mouseRef.current.button = e.button;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (!mouseRef.current.isDown) return;
    const deltaX = e.clientX - mouseRef.current.lastX;
    const deltaY = e.clientY - mouseRef.current.lastY;
    
    if (!isDroneMode) {
      orbitState.current.yaw += deltaX * 0.01;
      orbitState.current.pitch += deltaY * 0.01;
      orbitState.current.pitch = Math.max(-Math.PI/2, Math.min(Math.PI, orbitState.current.pitch));
    } else {
      const state = droneState.current;
      if (mouseRef.current.button === 0) {
        state.angVel.yaw += deltaX * 0.001;
        state.vel.set(1, state.vel.y - (deltaY * 0.04));
      } else if (mouseRef.current.button === 2) {
        const forward = new Vector(0, 0, 1).rotate(state.rot.yaw, 0);
        const right = new Vector(1, 0, 0).rotate(state.rot.yaw, 0);
        const moveVec = forward.multiplyByScalar(-deltaY * 0.04).add(right.multiplyByScalar(deltaX * 0.04));
        state.vel = state.vel.add(moveVec);
      }
    }
    
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  return (
    <div className='relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 group' onContextMenu={(e) => e.preventDefault()}>
      
      {/* HUD & Canvas Overlays */}
      <div className='absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]' />
      
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onClick={togglePointerLock}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full cursor-crosshair transition-all duration-1000 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      />

      {loading && (
        <div className='absolute inset-0 flex flex-col items-center justify-center font-mono text-sm bg-slate-950 z-20' style={{ color: branding.primaryColor }}>
          <FaSync className='animate-spin mb-4' size={40} />
          <div className='tracking-[0.5em] animate-pulse uppercase'>[ INITIALIZING_NEURAL_LINK... ]</div>
        </div>
      )}

      {!loading && (
        <div className='absolute inset-0 pointer-events-none z-20 p-6'>
          <div className='flex justify-between items-start'>
            <button 
              onClick={() => setDroneMode(!isDroneMode)}
              className='pointer-events-auto bg-black/60 backdrop-blur-2xl border border-white/10 px-6 py-2.5 rounded-full flex items-center gap-3'
            >
              {isDroneMode ? <TbDrone className='text-orange-500' size={20} /> : <FaSync className='text-blue-500' size={16} />}
              <span className='text-[10px] font-black uppercase tracking-[0.3em] text-white'>{isDroneMode ? 'Link Active' : 'Orbit Ready'}</span>
            </button>

            <div className='text-right font-mono'>
              {isDevMode && <div className='text-[9px] text-blue-400'>FPS: {fps}</div>}
              <div className='text-[10px] font-black uppercase opacity-80' style={{ color: branding.primaryColor }}>{isDroneMode ? 'SYS_RECON' : 'SYS_ORBIT'}</div>
            </div>
          </div>
          
          {/* Custom HUD Elements (Simplified for space) */}
          <div className='absolute bottom-6 inset-x-6 flex justify-between items-end'>
            <div className='p-5 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10'>
              <div className='text-[9px] text-blue-400 uppercase mb-2'>Asset Locked</div>
              <div className='text-sm font-black text-white'>{property?.name || 'GENERIC_UNIT_01'}</div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scan { 0% { top: 0%; opacity: 0; } 100% { top: 100%; opacity: 0; } }
      `}</style>
    </div>
  );
};

export default SunsetPulseViewer;