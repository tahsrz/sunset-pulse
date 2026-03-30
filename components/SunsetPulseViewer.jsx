'use client';
import { useEffect, useRef, useState } from 'react';
import { Vector, Matrix } from '@/utils/sunset-pulse-engine/math';
import { Renderer, Mesh3D } from '@/utils/sunset-pulse-engine/renderer';
import { generatePropertyModel } from '@/utils/sunset-pulse-engine/generator';
import { useTheme } from '@/context/ThemeProvider';
import { FaSync, FaCrosshairs, FaWind, FaMap, FaTrophy } from 'react-icons/fa';
import { TbDrone } from 'react-icons/tb';

const SunsetPulseViewer = ({ objUrl, property }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const { branding } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isDroneMode, setDroneMode] = useState(false);
  
  const orbitState = useRef({ yaw: 0, pitch: -0.2 });
  const droneState = useRef({
    pos: new Vector(0, 5, -40),
    vel: new Vector(0, 0, 0),
    rot: { yaw: 0, pitch: 0 },
    angVel: { yaw: 0, pitch: 0 }
  });

  const mouseRef = useRef({ isDown: false, button: 0, lastX: 0, lastY: 0 });

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
        // In Drone Mode, we ALWAYS use procedural model to include the course
        if (isDroneMode) {
          const rawObj = generatePropertyModel(property, true); // true = include course
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
        
        if (mesh) renderer.meshes = [mesh];
      } catch (error) {
        console.error('[SP-RE_ENGINE] Init Error:', error);
      } finally {
        setLoading(false);
      }

      const renderLoop = () => {
        if (rendererRef.current) {
          if (!isDroneMode) {
            const rotMat = Matrix.fromEuler(orbitState.current.yaw, orbitState.current.pitch);
            rendererRef.current.render(new Vector(0, 0, 0), rotMat, new Vector(0, -5, 60));
            if (!mouseRef.current.isDown) orbitState.current.yaw += 0.005;
          } else {
            const state = droneState.current;
            state.rot.yaw += state.angVel.yaw;
            state.angVel.yaw *= 0.85;
            state.pos = state.pos.add(state.vel);
            state.vel = state.vel.multiplyByScalar(0.92);
            const camRotMat = Matrix.fromEuler(state.rot.yaw, state.rot.pitch);
            rendererRef.current.render(state.pos, camRotMat, new Vector(0, -5, 60));
          }
        }
        animationId = requestAnimationFrame(renderLoop);
      };
      renderLoop();
    };

    initEngine();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      rendererRef.current = null;
    };
  }, [objUrl, property?._id, isDroneMode]);

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
    <div className='relative w-full h-[400px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-white/5' onContextMenu={(e) => e.preventDefault()}>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full cursor-crosshair transition-opacity duration-1000 ${loading ? 'opacity-0' : 'opacity-100'}`}
      />

      {loading && (
        <div 
          className='absolute inset-0 flex flex-col items-center justify-center font-mono text-sm animate-pulse bg-slate-950'
          style={{ color: branding.primaryColor }}
        >
          <FaSync className='animate-spin mb-4' size={24} />
          [ INITIALIZING DRONE FEED V1.3.2... ]
        </div>
      )}

      {!loading && (
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute top-4 left-4 flex gap-2'>
            <button 
              onClick={() => setDroneMode(!isDroneMode)}
              className='pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all hover:bg-white/10 active:scale-95'
            >
              {isDroneMode ? <TbDrone className='text-orange-500 animate-pulse' size={18} /> : <FaSync className='text-blue-500' />}
              <span className='text-[10px] font-black uppercase tracking-widest text-white'>
                {isDroneMode ? 'Drone Piloting' : 'Orbit Scan'}
              </span>
            </button>
          </div>

          <div 
            className='absolute top-4 right-4 text-[10px] font-mono tracking-widest uppercase opacity-50'
            style={{ color: branding.primaryColor }}
          >
            {isDroneMode ? 'DRONE_RECON // ACTIVE' : 'ORBIT_SCAN // READY'}
          </div>
          
          {isDroneMode && (
            <div className='absolute top-16 left-4 bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg backdrop-blur-md'>
              <div className='flex items-center gap-2 text-[9px] font-black text-orange-400 uppercase tracking-tighter'>
                <FaTrophy /> Training Course Active
              </div>
            </div>
          )}

          {isDroneMode && (
            <div className='absolute top-16 right-4 text-right font-mono space-y-1 opacity-80 text-white'>
              <div className='flex items-center justify-end gap-2 text-[9px] text-slate-500'>
                ALT: <span className='text-white'>{droneState.current.pos.y.toFixed(1)}m</span>
                <FaWind className='text-blue-400' />
              </div>
              <div className='flex items-center justify-end gap-2 text-[9px] text-slate-500'>
                VEL: <span className='text-white'>{(droneState.current.vel.magnitude() * 10).toFixed(1)}kn</span>
                <FaCrosshairs className='text-red-400' />
              </div>
              <div className='flex items-center justify-end gap-2 text-[9px] text-slate-500'>
                HDG: <span className='text-white'>{Math.floor((droneState.current.rot.yaw * 180 / Math.PI) % 360)}°</span>
                <FaMap className='text-green-400' />
              </div>
            </div>
          )}

          <div className='absolute bottom-4 left-4 p-4 bg-black/40 backdrop-blur-md rounded-lg border border-white/10'>
            <div className='text-[10px] font-mono text-slate-500 uppercase mb-1'>Target Asset</div>
            <div className='text-xs font-bold text-white uppercase'>{property?.name || 'GENERIC_UNIT_01'}</div>
            <div className='h-0.5 mt-2 w-full bg-[var(--primary-color)]' />
          </div>

          <div className='absolute bottom-4 right-4 text-[8px] font-bold uppercase tracking-tighter text-slate-500 text-right bg-black/40 p-3 rounded-xl border border-white/5 backdrop-blur-sm'>
            {isDroneMode ? (
              <>
                <span className='text-blue-400'>L-DRAG:</span> YAW & ALTITUDE <br/>
                <span className='text-blue-400'>R-DRAG:</span> PITCH & ROLL
              </>
            ) : (
              'DRAG: MANUALLY ORBIT ASSET'
            )}
          </div>

          <div className='absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/10' />
          <div className='absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/10' />
          <div className='absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/10' />
          <div className='absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/10' />
        </div>
      )}
    </div>
  );
};

export default SunsetPulseViewer;
