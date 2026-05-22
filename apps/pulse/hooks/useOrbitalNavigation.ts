import { useRef, useCallback } from 'react';

/**
 * Hook to handle orbital mouse-based navigation for custom renderers.
 */
export const useOrbitalNavigation = () => {
  const orbitState = useRef({ yaw: 0, pitch: -0.2 });
  const mouseRef = useRef({ isDown: false, button: 0, lastX: 0, lastY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    mouseRef.current.isDown = true;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseRef.current.isDown) return;
    const deltaX = e.clientX - mouseRef.current.lastX;
    const deltaY = e.clientY - mouseRef.current.lastY;
    
    orbitState.current.yaw += deltaX * 0.01;
    orbitState.current.pitch += deltaY * 0.01;
    orbitState.current.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, orbitState.current.pitch));
    
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDown = false;
  }, []);

  return {
    orbitState,
    mouseRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
};
