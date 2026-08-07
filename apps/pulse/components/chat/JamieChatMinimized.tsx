'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot } from 'lucide-react';

interface JamieChatMinimizedProps {
  onOpen: () => void;
  isLefthandMode: boolean;
  assistantName?: string;
  listeningStatus?: 'off' | 'permission-required' | 'starting' | 'listening' | 'speech-detected' | 'submitting' | 'jamie-speaking' | 'paused' | 'denied' | 'unavailable';
  liveCaption?: string;
}

const DRAG_THRESHOLD = 6; // Movement in pixels before a tap turns into a drag

export default function JamieChatMinimized({
const JamieChatMinimized: React.FC<JamieChatMinimizedProps> = ({
  onOpen,
  isLefthandMode,
  assistantName = 'Jamie',
  listeningStatus = 'off',
  liveCaption = '',
}: JamieChatMinimizedProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const totalMovedRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Whenever `isLefthandMode` changes invalidate custom drag coordinates
  // Snap Jamie back to the active edge
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setPosition(null);
    try {
      localStorage.removeItem('jamie_widget_pos');
    } catch {
      // Safe fallback for private browser modes
    }
  }, [isLefthandMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    totalMovedRef.current = 0;

    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    
    // Fall back to current DOM rect if position isn't explicitly set yet
    initialPosRef.current = position || {
      x: containerRef.current?.getBoundingClientRect().left ?? (isLefthandMode ? 16 : window.innerWidth - 64),
      y: containerRef.current?.getBoundingClientRect().top ?? window.innerHeight / 2,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;
    totalMovedRef.current = Math.hypot(deltaX, deltaY);

    if (totalMovedRef.current > DRAG_THRESHOLD) {
      const elementWidth = containerRef.current?.offsetWidth || 48;
      const elementHeight = containerRef.current?.offsetHeight || 160;

      const padding = 12;
      const maxX = window.innerWidth - elementWidth - padding;
      const maxY = window.innerHeight - elementHeight - padding;

      // coordinates inside window boundaries
      const clampedX = Math.min(Math.max(padding, initialPosRef.current.x + deltaX), maxX);
      const clampedY = Math.min(Math.max(padding, initialPosRef.current.y + deltaY), maxY);

      setPosition({ x: clampedX, y: clampedY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDraggingRef.current = false;

    if (position && totalMovedRef.current > DRAG_THRESHOLD) {
      try {
        localStorage.setItem('jamie_widget_pos', JSON.stringify(position));
      } catch {
        // safe fallback
      }
    }
  };

  const handleClick = () => {
    if (totalMovedRef.current <= DRAG_THRESHOLD) {
      onOpen();
    }
  };

}) => {
  const isListening = listeningStatus === 'listening' || listeningStatus === 'speech-detected';
  const statusLabel = isListening
    ? 'Listening for Pull that up'
    : listeningStatus === 'paused' || listeningStatus === 'jamie-speaking'
      ? 'Listening paused while Jamie speaks'
      : listeningStatus === 'permission-required' || listeningStatus === 'starting'
        ? 'Waiting for microphone permission'
        : listeningStatus === 'denied'
          ? 'Microphone permission denied'
          : listeningStatus === 'unavailable'
            ? 'Voice wake is unavailable in this browser'
            : 'Voice wake is off';

  // apply absolute inline position only if dragged; otherwise rely on responsive docking classes
  const dragOverrideStyle = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : undefined;

  return (
    <div
      ref={containerRef}
      style={dragOverrideStyle}
      className={`fixed z-40 ${
        position
          ? 'touch-none'
          : `bottom-4 ${isLefthandMode ? 'left-4 sm:left-0' : 'right-4 sm:right-0'} transition-all duration-300 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2`
      }`}
    >
      {(isListening || liveCaption) ? (
        <button
          type="button"
          onClick={handleClick}
          className={`absolute bottom-14 w-[min(320px,calc(100vw-2rem))] border border-white/15 bg-slate-950/95 px-3 py-2 text-left shadow-xl backdrop-blur-md transition-opacity hover:border-emerald-300/40 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 ${
            isLefthandMode ? 'left-0 sm:left-16' : 'right-0 sm:right-16'
          }`}
  return (
    <div className={`fixed bottom-4 ${isLefthandMode ? 'left-4 sm:left-0' : 'right-4 sm:right-0'} z-40 transition-all duration-500 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2`}>
      {(isListening || liveCaption) ? (
        <div
          className={`absolute bottom-14 w-[min(320px,calc(100vw-2rem))] border border-white/15 bg-slate-950/95 px-3 py-2 text-left shadow-xl backdrop-blur-md sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 ${isLefthandMode ? 'left-0 sm:left-16' : 'right-0 sm:right-16'}`}
          aria-live="polite"
          aria-label="Jamie live transcript"
        >
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">Pending query context</p>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-200">{liveCaption || 'Listening...'}</p>
        </button>
      ) : null}

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        aria-label="Open Jamie"
        title={`${assistantName}: ${statusLabel}`}
        className={`group flex h-11 w-11 cursor-grab items-center justify-center rounded-lg border border-blue-200/20 bg-gradient-to-b from-blue-600 to-cyan-500 text-white shadow-2xl shadow-cyan-950/40 active:cursor-grabbing hover:brightness-110 sm:h-40 sm:w-12 sm:flex-col sm:gap-3 sm:rounded-none sm:hover:w-14 ${
        </div>
      ) : null}
      <button
        onClick={onOpen}
        aria-label="Open Jamie"
        title={`${assistantName}: ${statusLabel}`}
        className={`group flex h-11 w-11 items-center justify-center rounded-lg border border-blue-200/20 bg-gradient-to-b from-blue-600 to-cyan-500 text-white shadow-2xl shadow-cyan-950/40 transition-all duration-300 hover:brightness-110 sm:h-40 sm:w-12 sm:flex-col sm:gap-3 sm:rounded-none sm:hover:w-14 ${
          isLefthandMode ? 'sm:rounded-r-xl sm:border-l-0' : 'sm:rounded-l-xl sm:border-r-0'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${
            isListening
              ? 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]'
              : listeningStatus === 'paused' || listeningStatus === 'jamie-speaking' || listeningStatus === 'permission-required' || listeningStatus === 'starting'
                ? 'bg-amber-300'
                : 'bg-slate-500'
          }`}
          className={`h-2 w-2 rounded-full ${isListening ? 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]' : listeningStatus === 'paused' || listeningStatus === 'jamie-speaking' || listeningStatus === 'permission-required' || listeningStatus === 'starting' ? 'bg-amber-300' : 'bg-slate-500'}`}
        />
        <span className="sr-only" aria-live="polite">{statusLabel}</span>
        <Bot size={18} className="transition-transform group-hover:scale-110" />
        <span className="hidden [writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.24em] sm:block">
          {assistantName}
        </span>
      </button>
    </div>
  );
}