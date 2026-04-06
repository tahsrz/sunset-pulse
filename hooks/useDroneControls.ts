import { useState, useRef, useEffect, useCallback } from 'react';
import { Vector, Matrix } from '@/lib/visualization/engine/math';
import { memoryBridge } from '@/lib/memory_bridge';
import { logEvent } from '@/lib/supabase';

export interface DroneState {
  pos: Vector;
  vel: Vector;
  rot: { yaw: number; pitch: number };
  angVel: { yaw: number; pitch: number };
}

export interface OrbitState {
  yaw: number;
  pitch: number;
}

export const useDroneControls = (canvasRef: React.RefObject<HTMLCanvasElement>, propId?: string, userId?: string, userName?: string) => {
  const [isDroneMode, setDroneMode] = useState(false);
  
  const droneState = useRef<DroneState>({
    pos: new Vector(0, 5, -40),
    vel: new Vector(0, 0, 0),
    rot: { yaw: 0, pitch: 0 },
    angVel: { yaw: 0, pitch: 0 }
  });

  const orbitState = useRef<OrbitState>({ yaw: 0, pitch: -0.2 });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef({ isDown: false, button: 0, lastX: 0, lastY: 0 });

  useEffect(() => {
    const prefs = memoryBridge.getPreferences();
    if (prefs.viewMode === 'neural' && isDroneMode) setDroneMode(false);
    if (prefs.viewMode === 'fiber' && !isDroneMode) setDroneMode(true);
  }, []);

  const handleDroneToggle = useCallback(() => {
    const newMode = !isDroneMode;
    setDroneMode(newMode);
    
    memoryBridge.save('static', 'viewMode', newMode ? 'fiber' : 'neural');
    memoryBridge.logInteraction(newMode ? 'Drone Mode Activated' : 'Orbit Mode Activated');

    logEvent({
      type: 'VIEW_MODE_SHIFT',
      description: `${userName || 'User'} shifted to ${newMode ? 'RECON' : 'ORBIT'} mode.`,
      actorId: userId,
      actorName: userName,
      targetId: propId,
      severity: 'INFO'
    });
  }, [isDroneMode, userId, userName, propId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    
    const handleMouseMoveRaw = (e: MouseEvent) => {
      if (document.pointerLockElement === canvasRef.current && isDroneMode) {
        const sensitivity = 0.003;
        droneState.current.rot.yaw += e.movementX * sensitivity;
        droneState.current.rot.pitch -= e.movementY * sensitivity;
        droneState.current.rot.pitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, droneState.current.rot.pitch));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMoveRaw);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMoveRaw);
    };
  }, [isDroneMode, canvasRef]);

  const updateDrone = useCallback((presentationMode: boolean, isMeLead: boolean, leadData?: any) => {
    const state = droneState.current;
    
    if (presentationMode && leadData && !isMeLead) {
      state.pos = new Vector(leadData.pos.x, leadData.pos.y, leadData.pos.z);
      state.rot = { yaw: leadData.rot.yaw, pitch: leadData.rot.pitch };
      return;
    }

    if (!isDroneMode) {
      if (!mouseRef.current.isDown) orbitState.current.yaw += 0.005;
      return;
    }

    const keys = keysRef.current;
    const speed = keys['shift'] ? 1.2 : 0.5;

    if (!presentationMode || isMeLead) {
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
  }, [isDroneMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    mouseRef.current.isDown = true;
    mouseRef.current.button = e.button;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
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

  const handleMouseUp = () => { mouseRef.current.isDown = false; };

  return {
    isDroneMode,
    droneState,
    orbitState,
    handleDroneToggle,
    updateDrone,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    keysRef
  };
};
