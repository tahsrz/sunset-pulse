'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Vector, Matrix } from '@/lib/visualization/engine/math';
import { Renderer, Mesh3D } from '@/lib/visualization/engine/renderer';
import { generatePropertyModel } from '@/lib/visualization/engine/generator';
import { centerModel } from '@/lib/visualization/threeUtils';
import { useTheme } from '@/context/ThemeProvider';
import { useMultiplayer } from '@/hooks/useMultiplayer'; 
import { toggleCollection, addPropertyComment, subscribeToPropertyComments, supabase, logEvent } from '@/lib/supabase';
import { toast } from 'react-toastify';

import { useDroneControls } from '@/hooks/useDroneControls';
import ViewerHUD from './viewer/ViewerHUD';

const SunsetPulseViewer = ({ objUrl, property, userId, userName }) => {
  const propId = property?._id;
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const { branding, isDevMode } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [fps, setFps] = useState(0);
  const [isInCollection, setIsInCollection] = useState(false);
  const [isCommentMode, setCommentMode] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [pendingCommentPos, setPendingCommentPos] = useState(null);
  const [isDataOverlayActive, setDataOverlayActive] = useState(false);
  const [projectedHotspots, setProjectedHotspots] = useState([]);

  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  const {
    isDroneMode,
    droneState,
    orbitState,
    handleDroneToggle,
    updateDrone,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useDroneControls(canvasRef, propId, userId, userName);

  const { 
    peers, 
    sendUpdate, 
    leadId, 
    isMeLead,
    presentationMode,
    setPresentationMode 
  } = useMultiplayer(property?.name || 'User', droneState.current.pos);

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

  const togglePointerLock = () => {
    if (isCommentMode) {
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
      const canvas = canvasRef.current;
      const color = getBrandingColor();
      const renderer = new Renderer(canvas, { 
        wireframe: true, 
        wireframeColor: `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)` 
      });
      rendererRef.current = renderer;

      try {
        let mesh = null;
        if (isDroneMode) {
          const rawObj = generatePropertyModel(property, false);
          mesh = Mesh3D.loadFromRaw(rawObj, color);
        } else if (objUrl) {
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
          
          const leadData = leadId ? peers[leadId] : null;
          updateDrone(presentationMode, isMeLead, leadData);

          if (!isDroneMode) {
            camPos = new Vector(0, -5, 60);
            camRot = Matrix.fromEuler(orbitState.current.yaw, orbitState.current.pitch);
            renderer.render(new Vector(0,0,0), camRot, camPos);
          } else {
            camRot = Matrix.fromEuler(state.rot.yaw, state.rot.pitch);
            camPos = new Vector(0, -5, 60);
            renderer.render(state.pos, camRot, camPos);
            
            sendUpdate(state.pos, state.rot, isMeLead);
          }

          if (isDataOverlayActive) {
            const projected = hotspots.map(h => {
              const screenPos = renderer.projectPoint(h.pos, state.pos, camRot, new Vector(0,0,0));
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
  }, [objUrl, propId, isDroneMode, peers, isMeLead, presentationMode, isDataOverlayActive, leadId, property, updateDrone, hotspots]);

  return (
    <div className='relative w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group' onContextMenu={(e) => e.preventDefault()}>
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

      <ViewerHUD
        loading={loading}
        branding={branding}
        isDroneMode={isDroneMode}
        handleDroneToggle={handleDroneToggle}
        fps={fps}
        isDevMode={isDevMode}
        isDataOverlayActive={isDataOverlayActive}
        setDataOverlayActive={setDataOverlayActive}
        projectedHotspots={projectedHotspots}
        comments={comments}
        renderer={rendererRef.current}
        droneState={droneState}
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
    </div>
  );
};

export default SunsetPulseViewer;
