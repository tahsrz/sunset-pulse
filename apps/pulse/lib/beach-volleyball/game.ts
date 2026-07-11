export type VolleyballSide = 'left' | 'right';

export type VolleyballPhase = 'ready' | 'playing' | 'point';

export type VolleyballInput = {
  move: -1 | 0 | 1;
  jump: boolean;
  hit: boolean;
};

export type VolleyballBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export type VolleyballPlayer = VolleyballBody & {
  side: VolleyballSide;
  onGround: boolean;
};

export type VolleyballState = {
  player: VolleyballPlayer;
  opponent: VolleyballPlayer;
  ball: VolleyballBody;
  score: Record<VolleyballSide, number>;
  servingSide: VolleyballSide;
  phase: VolleyballPhase;
  phaseElapsed: number;
  message: string;
  lastPointWinner?: VolleyballSide;
};

export const VOLLEYBALL_COURT = {
  width: 900,
  height: 520,
  groundY: 455,
  netX: 450,
  netTopY: 250,
  netWidth: 12,
  playerRadius: 28,
  ballRadius: 13,
  gravity: 1500,
  playerSpeed: 360,
  jumpVelocity: -720,
  hitVelocityY: -680,
  hitVelocityX: 470,
};

const EMPTY_INPUT: VolleyballInput = { move: 0, jump: false, hit: false };

export function createInitialVolleyballState(servingSide: VolleyballSide = 'left'): VolleyballState {
  return holdBallForServe({
    player: createPlayer('left', 190),
    opponent: createPlayer('right', 710),
    ball: {
      x: servingSide === 'left' ? 220 : 680,
      y: 315,
      vx: 0,
      vy: 0,
      radius: VOLLEYBALL_COURT.ballRadius,
    },
    score: { left: 0, right: 0 },
    servingSide,
    phase: 'ready',
    phaseElapsed: 0,
    message: servingSide === 'left' ? 'Press Space to serve' : 'Jamie serves next',
  });
}

export function stepVolleyballState(
  state: VolleyballState,
  input: VolleyballInput = EMPTY_INPUT,
  dtSeconds = 1 / 60
): VolleyballState {
  const dt = clamp(dtSeconds, 0, 1 / 30);
  let next = cloneState(state);

  if (next.phase === 'point') {
    next.phaseElapsed += dt;
    return next.phaseElapsed >= 1.2
      ? resetForNextServe(next, next.lastPointWinner || next.servingSide)
      : next;
  }

  movePlayer(next.player, input, dt);
  moveOpponent(next, dt);

  if (next.phase === 'ready') {
    next = holdBallForServe(next);
    if (input.hit || next.servingSide === 'right') {
      return serveBall(next, next.servingSide);
    }
    return next;
  }

  next.ball.vy += VOLLEYBALL_COURT.gravity * dt;
  next.ball.x += next.ball.vx * dt;
  next.ball.y += next.ball.vy * dt;

  collideBallWithPlayer(next.ball, next.player, input.hit);
  collideBallWithPlayer(next.ball, next.opponent, shouldOpponentSwing(next));
  collideBallWithNet(next.ball);

  const winner = getPointWinner(next.ball);
  if (winner) return awardPoint(next, winner);

  return next;
}

export function serveBall(state: VolleyballState, side: VolleyballSide): VolleyballState {
  const next = cloneState(state);
  const direction = side === 'left' ? 1 : -1;
  next.phase = 'playing';
  next.phaseElapsed = 0;
  next.servingSide = side;
  next.message = 'Rally live';
  next.ball = {
    ...next.ball,
    vx: direction * 360,
    vy: -620,
    x: side === 'left' ? next.player.x + 34 : next.opponent.x - 34,
    y: side === 'left' ? next.player.y - 80 : next.opponent.y - 80,
  };
  return next;
}

export function awardPoint(state: VolleyballState, winner: VolleyballSide): VolleyballState {
  const next = cloneState(state);
  next.score[winner] += 1;
  next.phase = 'point';
  next.phaseElapsed = 0;
  next.servingSide = winner;
  next.lastPointWinner = winner;
  next.message = winner === 'left' ? 'Point Sunset' : 'Point Jamie';
  next.ball.vx = 0;
  next.ball.vy = 0;
  return next;
}

export function getPointWinner(ball: VolleyballBody): VolleyballSide | null {
  if (ball.x < ball.radius) return 'right';
  if (ball.x > VOLLEYBALL_COURT.width - ball.radius) return 'left';
  if (ball.y + ball.radius < VOLLEYBALL_COURT.groundY) return null;
  return ball.x < VOLLEYBALL_COURT.netX ? 'right' : 'left';
}

export function collideBallWithNet(ball: VolleyballBody): boolean {
  const halfNet = VOLLEYBALL_COURT.netWidth / 2;
  const overlapsNetX = Math.abs(ball.x - VOLLEYBALL_COURT.netX) <= ball.radius + halfNet;
  const overlapsNetY = ball.y + ball.radius >= VOLLEYBALL_COURT.netTopY && ball.y - ball.radius <= VOLLEYBALL_COURT.groundY;
  if (!overlapsNetX || !overlapsNetY) return false;

  if (ball.x < VOLLEYBALL_COURT.netX) {
    ball.x = VOLLEYBALL_COURT.netX - halfNet - ball.radius;
    ball.vx = -Math.abs(ball.vx) * 0.55;
  } else {
    ball.x = VOLLEYBALL_COURT.netX + halfNet + ball.radius;
    ball.vx = Math.abs(ball.vx) * 0.55;
  }
  ball.vy = Math.min(ball.vy, -120);
  return true;
}

export function collideBallWithPlayer(ball: VolleyballBody, player: VolleyballPlayer, hardHit = false): boolean {
  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const minDistance = ball.radius + player.radius;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || distance > minDistance) return false;

  const nx = dx / distance;
  const ny = dy / distance;
  ball.x = player.x + nx * minDistance;
  ball.y = player.y + ny * minDistance;

  const sideDirection = player.side === 'left' ? 1 : -1;
  const swingBoost = hardHit ? 1.25 : 0.9;
  ball.vx = sideDirection * VOLLEYBALL_COURT.hitVelocityX * swingBoost + player.vx * 0.25;
  ball.vy = Math.min(-260, VOLLEYBALL_COURT.hitVelocityY * swingBoost);
  return true;
}

function createPlayer(side: VolleyballSide, x: number): VolleyballPlayer {
  return {
    side,
    x,
    y: VOLLEYBALL_COURT.groundY - VOLLEYBALL_COURT.playerRadius,
    vx: 0,
    vy: 0,
    radius: VOLLEYBALL_COURT.playerRadius,
    onGround: true,
  };
}

function movePlayer(player: VolleyballPlayer, input: VolleyballInput, dt: number) {
  player.vx = input.move * VOLLEYBALL_COURT.playerSpeed;
  if (input.jump && player.onGround) {
    player.vy = VOLLEYBALL_COURT.jumpVelocity;
    player.onGround = false;
  }

  player.vy += VOLLEYBALL_COURT.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const minX = player.side === 'left' ? player.radius : VOLLEYBALL_COURT.netX + VOLLEYBALL_COURT.netWidth + player.radius;
  const maxX = player.side === 'left'
    ? VOLLEYBALL_COURT.netX - VOLLEYBALL_COURT.netWidth - player.radius
    : VOLLEYBALL_COURT.width - player.radius;
  player.x = clamp(player.x, minX, maxX);

  const floorY = VOLLEYBALL_COURT.groundY - player.radius;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    player.onGround = true;
  }
}

function moveOpponent(state: VolleyballState, dt: number) {
  const targetX = state.phase === 'playing' && state.ball.x > VOLLEYBALL_COURT.netX
    ? state.ball.x
    : 710;
  const move = targetX < state.opponent.x - 12 ? -1 : targetX > state.opponent.x + 12 ? 1 : 0;
  const jump = state.phase === 'playing'
    && state.ball.x > VOLLEYBALL_COURT.netX
    && state.ball.y < state.opponent.y
    && Math.abs(state.ball.x - state.opponent.x) < 85;

  movePlayer(state.opponent, { move, jump, hit: false }, dt);
}

function shouldOpponentSwing(state: VolleyballState) {
  return state.ball.x > VOLLEYBALL_COURT.netX && Math.abs(state.ball.x - state.opponent.x) < 95;
}

function holdBallForServe(state: VolleyballState): VolleyballState {
  const next = cloneState(state);
  const server = next.servingSide === 'left' ? next.player : next.opponent;
  next.ball.x = server.x + (next.servingSide === 'left' ? 34 : -34);
  next.ball.y = server.y - 78;
  next.ball.vx = 0;
  next.ball.vy = 0;
  return next;
}

function resetForNextServe(state: VolleyballState, servingSide: VolleyballSide): VolleyballState {
  return holdBallForServe({
    ...state,
    player: createPlayer('left', 190),
    opponent: createPlayer('right', 710),
    servingSide,
    phase: 'ready',
    phaseElapsed: 0,
    message: servingSide === 'left' ? 'Press Space to serve' : 'Jamie serves next',
    lastPointWinner: undefined,
  });
}

function cloneState(state: VolleyballState): VolleyballState {
  return {
    ...state,
    player: { ...state.player },
    opponent: { ...state.opponent },
    ball: { ...state.ball },
    score: { ...state.score },
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
