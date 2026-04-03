'use client';
import { useEffect, useRef, useState } from 'react';
import { Vector, Matrix } from '@/lib/visualization/engine/math';
import { Renderer, Mesh3D } from '@/lib/visualization/engine/renderer';
import { generatePropertyModel } from '@/lib/visualization/engine/generator';
import { centerModel } from '@/lib/visualization/threeUtils';
import { useTheme } from '@/context/ThemeProvider';
import { useMultiplayer } from '@/hooks/useMultiplayer'; 
import { memoryBridge } from '@/lib/memory_bridge';
import { FaSync, FaCrosshairs, FaWind, FaMap, FaTrophy, FaUserSecret, FaEye, FaDatabase, FaHeart, FaCommentDots, FaPaperPlane } from 'react-icons/fa';
import { TbDrone, TbViewfinder } from 'react-icons/tb';
import { toggleCollection, addPropertyComment, subscribeToPropertyComments, supabase, logEvent } from '@/lib/supabase';

const SunsetPulseViewer = ({ objUrl, property, userId, userName }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const { branding, isDevMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isDroneMode, setDroneMode] = useState(false);
  const [fps, setFps] = useState(0);

  const [isInCollection, setIsInCollection] = useState(false);
  const [isCommentMode, setCommentMode] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [pendingCommentPos, setPendingCommentPos] = useState(null);
  const [projectedComments, setProjectedProjectedComments] = useState([]);

  // Load view mode from static memory on mount
  useEffect(() => {
    const prefs = memoryBridge.getPreferences();
    if (prefs.viewMode === 'neural' && isDroneMode) setDroneMode(false);
    if (prefs.viewMode === 'fiber' && !isDroneMode) setDroneMode(true);
  }, []);

  const handleDroneToggle = () => {
    const newMode = !isDroneMode;
    setDroneMode(newMode);
    
    // Save to Layer 1: Static (Persistent Preference)
    memoryBridge.save('static', 'viewMode', newMode ? 'fiber' : 'neural');
    
    // Log Interaction
    memoryBridge.logInteraction(newMode ? 'Drone Mode Activated' : 'Orbit Mode Activated');

    // Log THE_PAST
    logEvent({
      type: 'VIEW_MODE_SHIFT',
      description: `${userName || 'User'} shifted to ${newMode ? 'RECON' : 'ORBIT'} mode.`,
      actorId: userId,
      actorName: userName,
      targetId: propId,
      severity: 'INFO'
    });
  };

  const orbitState = useRef({ yaw: 0, pitch: -0.2 });
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  const droneState = useRef({
    pos: new Vector(0, 5, -40),
    vel: new Vector(0, 0, 0),
    rot: { yaw: 0, pitch: 0 },
    angVel: { yaw: 0, pitch: 0 }
  });

  // Multiplayer & Presentation Mode logic WIP
  const { 
    peers, 
    sendUpdate, 
    announceLead, 
    leadId, 
    isMeLead,
    presentationMode,
    setPresentationMode 
  } = useMultiplayer(property?.name || 'User', droneState.current.pos);

  const [isDataOverlayActive, setDataOverlayActive] = useState(false);
  const [projectedHotspots, setProjectedHotspots] = useState([]);

  // Collection & Feedback Sync
  useEffect(() => {
    if (!propId || !userId) return;

    const checkCollection = async () => {
      const { data } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .eq('property_id', propId)
        .single();
      setIsInCollection(!!data);
    };

    const fetchComments = async () => {
      const { data } = await supabase
        .from('property_comments')
        .select('*')
        .eq('property_id', propId)
        .order('created_at', { ascending: true });
      if (data) setComments(data);
    };

    checkCollection();
    fetchComments();

    const sub = subscribeToPropertyComments(propId, (payload) => {
      setComments(prev => [...prev, payload.new]);
      toast.info(`New Feedback from ${payload.new.user_name || 'Consumer'}`);
    });

    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, [propId, userId]);

  const handleToggleCollection = async () => {
    if (!userId) return toast.warn("Sign in to save properties.");
    await toggleCollection(userId, propId);
    
    const wasIn = isInCollection;
    setIsInCollection(!wasIn);
    
    // Log THE_PAST
    await logEvent({
      type: 'COLLECTION_SYNC',
      description: `${userName} ${wasIn ? 'removed' : 'added'} ${property?.name} to Pulse Folder.`,
      actorId: userId,
      actorName: userName,
      targetId: propId,
      severity: wasIn ? 'INFO' : 'TACTICAL'
    });

    toast.success(wasIn ? "Removed from Pulse Folder" : "Added to Pulse Folder");
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
      const savedComment = await addPropertyComment(commentData);
      
      // Log THE_PAST
      await logEvent({
        type: 'SPATIAL_INTEL',
        description: `${userName} dropped spatial feedback on ${property?.name}: "${newComment.substring(0, 30)}..."`,
        actorId: userId,
        actorName: userName,
        targetId: savedComment.id,
        metadata: { property_name: property?.name, content: newComment },
        severity: 'TACTICAL'
      });

      setNewComment('');
      setPendingCommentPos(null);
      setCommentMode(false);
    } catch (err) {
      toast.error("Feedback transmission failed.");
    }
  };

  const ghostMeshesRef = useRef({}); 
  const mouseRef = useRef({ isDown: false, button: 0, lastX: 0, lastY: 0 });
  const keysRef = useRef({});

  const hotspots = [
    { pos: new Vector(10, 10, 10), label: `Price/sqft: $${property?.square_feet ? Math.round(property.rates?.monthly / (property.square_feet / 10)) : 'N/A'}`, key: 'price' },
    { pos: new Vector(-10, 15, -10), label: `Score: ${property?.is_featured ? '9.8 (Elite)' : '8.2 (Solid)'}`, key: 'judge' },
    { pos: new Vector(0, 20, 5), label: `Status: ${property?.type || 'Available'}`, key: 'status' },
  ];

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
    if (isCommentMode) {
      // Drop pin at current camera position
      const pos = isDroneMode ? droneState.current.pos : new Vector(0,0,0);
      setPendingCommentPos({ x: pos.x, y: pos.y, z: pos.z });
      return;
    }
    if (isDroneMode && canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  };

  useEffect(() => {
    let animationId;
    if (!canvasRef.current) return;

    const initEngine = async () => {
      setLoading(true);
      
      // Conceptually wrap engine init in telemetry logs
      const telemetry = memoryBridge.wrapQuery(`INITIALIZE_ENGINE_PROPERTY_${propId}`, '3D_RECON_INITIALIZATION');
      if (isDevMode) console.log('[3D_VIEWER_TELEMETRY]', telemetry);

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

          const state = droneState.current;
          
          // Sync to lead if in presentation mode
          if (presentationMode && leadId && !isMeLead && peers[leadId]) {
            const lead = peers[leadId];
            state.pos = new Vector(lead.pos.x, lead.pos.y, lead.pos.z);
            state.rot = { yaw: lead.rot.yaw, pitch: lead.rot.pitch };
          }

          if (!isDroneMode) {
            camPos = new Vector(0, -5, 60);
            camRot = Matrix.fromEuler(orbitState.current.yaw, orbitState.current.pitch);
            if (!mouseRef.current.isDown) orbitState.current.yaw += 0.005;
            renderer.render(new Vector(0,0,0), camRot, camPos);
          } else {
            const keys = keysRef.current;
            const boost = keys['shift'] ? 2.5 : 1.0;
            const speed = 0.5 * boost;

            if (!presentationMode || isMeLead) {
              // WASD Logic
              const forward = new Vector(0, 0, 1).rotate(state.rot.yaw, 0);
              const right = new Vector(1, 0, 0).rotate(state.rot.yaw, 0);

              if (keys['w']) state.vel = state.vel.add(forward.multiplyByScalar(speed));
              if (keys['s']) state.vel = state.vel.add(forward.multiplyByScalar(-speed));
              if (keys['a']) state.vel = state.vel.add(right.multiplyByScalar(-speed));
              if (keys['d']) state.vel = state.vel.add(right.multiplyByScalar(speed));
              if (keys[' ']) state.vel.set(1, state.vel.y + speed); 
              if (keys['c'] || keys['control']) state.vel.set(1, state.vel.y - speed); 

              if (keys['q']) state.angVel.yaw -= 0.005;
              if (keys['e']) state.angVel.yaw += 0.005;

              state.rot.yaw += state.angVel.yaw;
              state.angVel.yaw *= 0.85;
              state.pos = state.pos.add(state.vel);
              state.vel = state.vel.multiplyByScalar(0.92);
            }

            camRot = Matrix.fromEuler(state.rot.yaw, state.rot.pitch);
            camPos = new Vector(0, -5, 60);
            renderer.render(state.pos, camRot, camPos);
            
            // Broadcast movement
            sendUpdate(state.pos, state.rot, isMeLead);
          }

          // Multiplayer Loop
          Object.entries(peers).forEach(([id, peer]) => {
            if (!ghostMeshesRef.current[id]) {
              ghostMeshesRef.current[id] = Mesh3D.createCube(0.5, { r: 255, g: 215, b: 0 });
            }
            const ghost = ghostMeshesRef.current[id];
            renderer.renderMesh(ghost, new Vector(peer.pos.x, peer.pos.y, peer.pos.z), camRot, camPos);
          });

          // Project hotspots if overlay active
          if (isDataOverlayActive) {
            const projected = hotspots.map(h => {
              const screenPos = renderer.projectPoint(h.pos, state.pos, camRot, new Vector(0,0,0));
              return screenPos ? { ...h, ...screenPos } : null;
            }).filter(Boolean);
            // Throttle state update to every 2 frames to save CPU
            if (frameCountRef.current % 2 === 0) {
              setProjectedHotspots(projected);
            }
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
  }, [objUrl, propId, isDroneMode, peers, isMeLead, presentationMode, isDataOverlayActive, leadId]);

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
              onClick={handleDroneToggle}
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

          {/* Hotspot Labels */}
          {isDataOverlayActive && projectedHotspots.map(h => (
            <div 
              key={h.key}
              className='absolute pointer-events-auto bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1 rounded text-[10px] text-white whitespace-nowrap shadow-xl flex items-center gap-2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300'
              style={{ left: h.x, top: h.y, opacity: h.z > 0 ? 1 : 0 }}
            >
              <div className='w-1.5 h-1.5 rounded-full animate-pulse' style={{ backgroundColor: branding.primaryColor }} />
              <span className='font-mono font-bold tracking-wider'>{h.label}</span>
            </div>
          ))}

          {/* Comment Pins */}
          {comments.map(c => {
            const screenPos = rendererRef.current?.projectPoint(new Vector(c.position_x, c.position_y, c.position_z), droneState.current.pos, Matrix.fromEuler(droneState.current.rot.yaw, droneState.current.rot.pitch), new Vector(0,0,0));
            if (!screenPos || screenPos.z <= 0) return null;
            return (
              <div 
                key={c.id}
                className='absolute pointer-events-auto group/pin'
                style={{ left: screenPos.x, top: screenPos.y }}
              >
                <div className='w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform'>
                  <FaCommentDots size={8} className='text-white' />
                </div>
                <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/pin:block bg-black/90 backdrop-blur-md border border-white/10 p-3 rounded-xl min-w-[150px] shadow-2xl z-50'>
                  <div className='text-[8px] font-black uppercase text-orange-400 mb-1'>{c.user_name}</div>
                  <p className='text-[10px] text-white leading-tight'>{c.content}</p>
                </div>
              </div>
            );
          })}
          
          {/* Enhanced Controls */}
          <div className='absolute bottom-6 inset-x-6 flex justify-between items-end'>
            <div className='p-5 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10'>
              <div className='flex justify-between items-start mb-2'>
                <div>
                  <div className='text-[9px] text-blue-400 uppercase mb-1'>Asset Locked</div>
                  <div className='text-sm font-black text-white'>{property?.name || 'GENERIC_UNIT_01'}</div>
                </div>
                <button 
                  onClick={handleToggleCollection}
                  className={`pointer-events-auto p-2 rounded-full transition-all ${isInCollection ? 'text-red-500 scale-110' : 'text-white/20 hover:text-white'}`}
                >
                  <FaHeart size={18} />
                </button>
              </div>
              
              <div className='flex gap-2 mt-4 pointer-events-auto'>
                <button 
                  onClick={() => setDataOverlayActive(!isDataOverlayActive)}
                  className={`p-2 rounded-lg border transition-all ${isDataOverlayActive ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  title="Toggle Data Overlay"
                >
                  <FaDatabase size={14} />
                </button>
                <button 
                  onClick={() => setCommentMode(!isCommentMode)}
                  className={`p-2 rounded-lg border transition-all ${isCommentMode ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  title="Drop 3D Comment"
                >
                  <FaCommentDots size={14} />
                </button>
                <button 
                  onClick={announceLead}
                  className={`p-2 rounded-lg border transition-all ${isMeLead ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  title="Become Lead Agent"
                >
                  <FaUserSecret size={14} />
                </button>
                <button 
                  onClick={() => setPresentationMode(!presentationMode)}
                  className={`p-2 rounded-lg border transition-all ${presentationMode ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  title="Toggle Presentation Mode"
                >
                  <FaEye size={14} />
                </button>
              </div>
            </div>

            {/* Spatial Comment Input */}
            {isCommentMode && (
              <div className='pointer-events-auto bg-black/80 backdrop-blur-xl border border-orange-500/30 p-4 rounded-2xl w-[250px] shadow-2xl animate-in slide-in-from-bottom-4 duration-300'>
                <div className='text-[8px] font-black uppercase text-orange-400 mb-3 tracking-widest'>Drop Spatial Feedback</div>
                {!pendingCommentPos ? (
                  <div className='text-[10px] text-white/60 italic leading-tight'>Click anywhere in the 3D grid to set a pin position.</div>
                ) : (
                  <div className='space-y-3'>
                    <textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="What are we looking at?"
                      className='w-full bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 resize-none h-20'
                    />
                    <div className='flex gap-2'>
                      <button 
                        onClick={() => setPendingCommentPos(null)}
                        className='flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black uppercase text-white/40 transition-all'
                      >
                        Reset Pin
                      </button>
                      <button 
                        onClick={handleDropComment}
                        className='flex-1 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-[8px] font-black uppercase text-white transition-all flex items-center justify-center gap-2'
                      >
                        <FaPaperPlane size={8} /> Transmit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {presentationMode && !isMeLead && leadId && (
              <div className='bg-green-500/20 backdrop-blur-md border border-green-500/50 px-4 py-2 rounded-xl flex items-center gap-3 animate-pulse'>
                <TbViewfinder className='text-green-400' size={18} />
                <div className='flex flex-col'>
                  <span className='text-[8px] text-green-400 uppercase font-black'>Presentation Mode</span>
                  <span className='text-[10px] text-white font-mono'>Following Lead: {leadId}</span>
                </div>
              </div>
            )}
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
