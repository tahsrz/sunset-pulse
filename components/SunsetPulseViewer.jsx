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
    <div className='relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 group' onContextMenu={(e) => e.preventDefault()}>
      
      {/* Scanline Effect Overlay */}
      <div className='absolute inset-0 pointer-events-none z-10 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]' />
      
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full cursor-crosshair transition-all duration-1000 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} ${isDroneMode ? 'brightness-125 contrast-125' : ''}`}
      />

      {loading && (
        <div 
          className='absolute inset-0 flex flex-col items-center justify-center font-mono text-sm bg-slate-950 z-20'
          style={{ color: branding.primaryColor }}
        >
          <div className='relative'>
            <FaSync className='animate-spin mb-4' size={40} />
            <div className='absolute inset-0 blur-xl bg-current opacity-20 animate-pulse' />
          </div>
          <div className='tracking-[0.5em] animate-pulse uppercase'>[ INITIALIZING_NEURAL_LINK... ]</div>
        </div>
      )}

      {!loading && (
        <div className='absolute inset-0 pointer-events-none z-20 p-6'>
          {/* Top Bar */}
          <div className='flex justify-between items-start'>
            <div className='flex flex-col gap-4'>
              <button 
                onClick={() => setDroneMode(!isDroneMode)}
                className='pointer-events-auto group/btn relative bg-black/60 backdrop-blur-2xl border border-white/10 px-6 py-2.5 rounded-full flex items-center gap-3 transition-all hover:bg-white/10 hover:border-blue-500/50 active:scale-95 shadow-xl'
              >
                {isDroneMode ? (
                  <TbDrone className='text-orange-500 animate-bounce' size={20} />
                ) : (
                  <FaSync className='text-blue-500 group-hover/btn:rotate-180 transition-transform duration-700' size={16} />
                )}
                <span className='text-[10px] font-black uppercase tracking-[0.3em] text-white italic'>
                  {isDroneMode ? 'Link Active' : 'Orbit Ready'}
                </span>
                <div className='absolute inset-0 rounded-full bg-blue-500/10 blur-md opacity-0 group-hover/btn:opacity-100 transition-opacity' />
              </button>

              {isDroneMode && (
                <div className='bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-xl backdrop-blur-md animate-in slide-in-from-left-4 duration-500'>
                  <div className='flex items-center gap-3 text-[10px] font-black text-orange-400 uppercase tracking-widest'>
                    <div className='w-2 h-2 bg-orange-500 rounded-full animate-ping' />
                    <FaTrophy /> Training Course: Phase 1
                  </div>
                </div>
              )}
            </div>

            <div className='text-right font-mono'>
              <div 
                className='text-[10px] font-black tracking-[0.4em] uppercase opacity-80 mb-2 italic'
                style={{ color: branding.primaryColor }}
              >
                {isDroneMode ? 'SYS_RECON // LIVE_FEED' : 'SYS_ORBIT // STANDBY'}
              </div>
              <div className='text-[8px] text-slate-500 flex flex-col gap-1'>
                <span>LAT: 34.0522 N</span>
                <span>LNG: 118.2437 W</span>
                <span>SIG: 100% STABLE</span>
              </div>
            </div>
          </div>
          
          {/* Drone Stats Overlay */}
          {isDroneMode && (
            <div className='absolute top-1/2 -translate-y-1/2 right-6 space-y-4 animate-in slide-in-from-right-4 duration-500'>
              <div className='bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 space-y-3'>
                <div className='flex items-center justify-end gap-3'>
                  <div className='text-right'>
                    <div className='text-[8px] text-slate-500 font-bold uppercase'>Altitude</div>
                    <div className='text-xs font-black text-white'>{droneState.current.pos.y.toFixed(1)}m</div>
                  </div>
                  <FaWind className='text-blue-400' />
                </div>
                <div className='flex items-center justify-end gap-3'>
                  <div className='text-right'>
                    <div className='text-[8px] text-slate-500 font-bold uppercase'>Velocity</div>
                    <div className='text-xs font-black text-white'>{(droneState.current.vel.magnitude() * 10).toFixed(1)}kn</div>
                  </div>
                  <FaCrosshairs className='text-red-400' />
                </div>
                <div className='flex items-center justify-end gap-3'>
                  <div className='text-right'>
                    <div className='text-[8px] text-slate-500 font-bold uppercase'>Heading</div>
                    <div className='text-xs font-black text-white'>{Math.floor((droneState.current.rot.yaw * 180 / Math.PI) % 360)}°</div>
                  </div>
                  <FaMap className='text-green-400' />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Info Panels */}
          <div className='absolute bottom-6 inset-x-6 flex justify-between items-end'>
            <div className='p-5 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl transition-all group-hover:border-blue-500/30'>
              <div className='text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mb-2 italic opacity-70'>Asset Locked</div>
              <div className='text-sm font-black text-white uppercase tracking-tighter'>{property?.name || 'GENERIC_UNIT_01'}</div>
              <div className='h-1 mt-3 w-full bg-slate-800 rounded-full overflow-hidden'>
                <div 
                  className='h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' 
                  style={{ width: '65%' }}
                />
              </div>
            </div>

            <div className='text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 text-right bg-black/60 p-4 rounded-2xl border border-white/5 backdrop-blur-xl'>
              {isDroneMode ? (
                <div className='space-y-1'>
                  <div><span className='text-blue-400'>[ LMB_DRAG ]</span> ROTATE_CHASSIS</div>
                  <div><span className='text-blue-400'>[ RMB_DRAG ]</span> THRUST_VECTOR</div>
                </div>
              ) : (
                'DRAG TO RE-POSITION ORBIT'
              )}
            </div>
          </div>

          {/* HUD Corner Elements */}
          <div className='absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-white/20 rounded-tl-lg' />
          <div className='absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-white/20 rounded-tr-lg' />
          <div className='absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-white/20 rounded-bl-lg' />
          <div className='absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-white/20 rounded-br-lg' />
          
          {/* Scanning Line */}
          {isDroneMode && (
            <div className='absolute left-0 right-0 h-[1px] bg-blue-400/30 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-[scan_4s_linear_infinite]' />
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default SunsetPulseViewer;
