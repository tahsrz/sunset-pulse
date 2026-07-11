'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createInitialVolleyballState,
  stepVolleyballState,
  VOLLEYBALL_COURT,
  type VolleyballInput,
  type VolleyballState,
} from '@/lib/beach-volleyball/game';

const KEY_TO_ACTION: Record<string, keyof VolleyballInput | 'left' | 'right'> = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ArrowUp: 'jump',
  w: 'jump',
  W: 'jump',
  ' ': 'hit',
};

export default function BeachVolleyballGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<VolleyballState>(createInitialVolleyballState('left'));
  const inputRef = useRef<VolleyballInput>({ move: 0, jump: false, hit: false });
  const pressedRef = useRef<Set<string>>(new Set());
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [viewState, setViewState] = useState(stateRef.current);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = KEY_TO_ACTION[event.key];
      if (!action) return;
      event.preventDefault();
      pressedRef.current.add(event.key);
      syncInputFromPressedKeys();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const action = KEY_TO_ACTION[event.key];
      if (!action) return;
      event.preventDefault();
      pressedRef.current.delete(event.key);
      syncInputFromPressedKeys();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const tick = (time: number) => {
      const lastTime = lastTimeRef.current ?? time;
      lastTimeRef.current = time;
      const dt = (time - lastTime) / 1000;

      stateRef.current = stepVolleyballState(stateRef.current, inputRef.current, dt);
      inputRef.current.hit = false;
      inputRef.current.jump = pressedRef.current.has('ArrowUp') || pressedRef.current.has('w') || pressedRef.current.has('W');
      drawCourt(canvasRef.current, stateRef.current);
      setViewState(stateRef.current);

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const pressControl = (partial: Partial<VolleyballInput>) => {
    inputRef.current = {
      ...inputRef.current,
      ...partial,
    };
  };

  const releaseMove = () => {
    inputRef.current.move = 0;
  };

  const restart = () => {
    stateRef.current = createInitialVolleyballState('left');
    setViewState(stateRef.current);
    drawCourt(canvasRef.current, stateRef.current);
  };

  function syncInputFromPressedKeys() {
    const pressed = pressedRef.current;
    const movingLeft = pressed.has('ArrowLeft') || pressed.has('a') || pressed.has('A');
    const movingRight = pressed.has('ArrowRight') || pressed.has('d') || pressed.has('D');
    inputRef.current.move = movingLeft && !movingRight ? -1 : movingRight && !movingLeft ? 1 : 0;
    inputRef.current.jump = pressed.has('ArrowUp') || pressed.has('w') || pressed.has('W');
    if (pressed.has(' ')) inputRef.current.hit = true;
  }

  return (
    <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#081827] p-4 shadow-2xl">
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-teal-200/70">Beach Rally</div>
          <div className="mt-1 text-sm font-bold text-slate-200">{viewState.message}</div>
        </div>
        <div className="flex items-center gap-4 text-center">
          <ScorePill label="Sunset" value={viewState.score.left} active={viewState.servingSide === 'left'} />
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">vs</div>
          <ScorePill label="Jamie" value={viewState.score.right} active={viewState.servingSide === 'right'} />
        </div>
        <button
          type="button"
          onClick={restart}
          className="rounded-full border border-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-200 transition hover:border-teal-300/50 hover:bg-teal-300/10"
        >
          Reset
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={VOLLEYBALL_COURT.width}
        height={VOLLEYBALL_COURT.height}
        className="h-auto w-full rounded-2xl border border-white/10 bg-sky-950"
        aria-label="Sunset beach volleyball game canvas"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <TouchButton label="Left" onDown={() => pressControl({ move: -1 })} onUp={releaseMove} />
        <TouchButton label="Right" onDown={() => pressControl({ move: 1 })} onUp={releaseMove} />
        <TouchButton label="Jump" onDown={() => pressControl({ jump: true })} onUp={() => pressControl({ jump: false })} />
        <TouchButton label={viewState.phase === 'ready' ? 'Serve' : 'Bump'} onDown={() => pressControl({ hit: true })} />
      </div>

      <div className="mt-4 rounded-2xl bg-white/[0.03] p-4 text-xs leading-6 text-slate-300">
        Keyboard: <span className="font-bold text-white">A/D</span> or arrows to move,{' '}
        <span className="font-bold text-white">W/Up</span> to jump,{' '}
        <span className="font-bold text-white">Space</span> to serve or bump.
      </div>
    </div>
  );
}

function ScorePill({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-2 ${active ? 'border-teal-300/50 bg-teal-300/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function TouchButton({
  label,
  onDown,
  onUp,
}: {
  label: string;
  onDown: () => void;
  onUp?: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition active:scale-95 active:bg-teal-300/20"
    >
      {label}
    </button>
  );
}

function drawCourt(canvas: HTMLCanvasElement | null, state: VolleyballState) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height, groundY, netX, netTopY, netWidth } = VOLLEYBALL_COURT;
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#38bdf8');
  sky.addColorStop(0.62, '#0f766e');
  sky.addColorStop(1, '#0f172a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, groundY);

  ctx.fillStyle = '#f8d28c';
  ctx.fillRect(0, groundY, width, height - groundY);
  ctx.fillStyle = 'rgba(120, 53, 15, 0.25)';
  for (let x = -30; x < width; x += 70) {
    ctx.beginPath();
    ctx.ellipse(x, groundY + 28, 60, 9, -0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, groundY);
  ctx.lineTo(width - 60, groundY);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(netX - netWidth / 2, netTopY, netWidth, groundY - netTopY);
  ctx.strokeStyle = 'rgba(15,23,42,0.45)';
  ctx.lineWidth = 1;
  for (let y = netTopY + 18; y < groundY; y += 18) {
    ctx.beginPath();
    ctx.moveTo(netX - 28, y);
    ctx.lineTo(netX + 28, y);
    ctx.stroke();
  }

  drawPlayer(ctx, state.player, '#14b8a6', 'Sunset');
  drawPlayer(ctx, state.opponent, '#f97316', 'Jamie');
  drawBall(ctx, state.ball);

  if (state.phase === 'point') {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, width / 2, 170);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: VolleyballState['player'], color: string, label: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '900 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, player.x, player.y + player.radius + 22);
}

function drawBall(ctx: CanvasRenderingContext2D, ball: VolleyballState['ball']) {
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius - 4, 0.2, Math.PI * 1.4);
  ctx.stroke();
}
