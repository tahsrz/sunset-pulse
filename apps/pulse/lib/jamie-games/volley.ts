export const VOLLEY_COURT_WIDTH = 800;
export const VOLLEY_COURT_HEIGHT = 420;
export const VOLLEY_GROUND_Y = 360;
export const VOLLEY_NET_X = VOLLEY_COURT_WIDTH / 2;
export const VOLLEY_NET_TOP_Y = 205;
export const VOLLEY_PLAYER_RADIUS = 26;
export const VOLLEY_BALL_RADIUS = 12;
export const VOLLEY_TARGET_SCORE = 7;

export type VolleyPlayerId = 'human' | 'jamie';
export type VolleyStatus = 'ready' | 'playing' | 'point-over' | 'match-over';
export type VolleyInput = {
  left?: boolean;
  right?: boolean;
  jump?: boolean;
};

export type VolleyBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type VolleyGameState = {
  human: VolleyBody;
  jamie: VolleyBody;
  ball: VolleyBody;
  scores: Record<VolleyPlayerId, number>;
  status: VolleyStatus;
  server: VolleyPlayerId;
  lastPointWinner: VolleyPlayerId | null;
  rally: number;
  message: string;
};

export type VolleyGameOptions = {
  scores?: Partial<Record<VolleyPlayerId, number>>;
  server?: VolleyPlayerId;
};

const GRAVITY = 0.58;
const PLAYER_GRAVITY = 0.82;
const PLAYER_SPEED = 5.4;
const JUMP_VELOCITY = -14.8;
const BALL_DRAG = 0.997;
const BALL_BOUNCE = 0.72;
const PLAYER_HIT_POWER = 8.8;

export function createVolleyGame(options: VolleyGameOptions = {}): VolleyGameState {
  const server = options.server ?? 'human';
  const scores = {
    human: options.scores?.human ?? 0,
    jamie: options.scores?.jamie ?? 0,
  };

  return {
    human: createPlayer(145),
    jamie: createPlayer(655),
    ball: createServeBall(server),
    scores,
    status: 'ready',
    server,
    lastPointWinner: null,
    rally: 0,
    message: `${server === 'human' ? 'Your' : "Jamie's"} serve. Time the jump and send it over.`,
  };
}

export function serveVolley(state: VolleyGameState): VolleyGameState {
  if (state.status === 'match-over') return createVolleyGame();
  return {
    ...state,
    human: createPlayer(145),
    jamie: createPlayer(655),
    ball: {
      ...createServeBall(state.server),
      vx: state.server === 'human' ? 5.8 : -5.8,
      vy: -8.4,
    },
    status: 'playing',
    lastPointWinner: null,
    rally: 0,
    message: 'Ball is live.',
  };
}

export function tickVolley(state: VolleyGameState, input: VolleyInput = {}): VolleyGameState {
  if (state.status !== 'playing') return state;

  const human = updateHumanPlayer(state.human, input);
  const jamie = updateJamiePlayer(state.jamie, state.ball);
  let ball = updateBall(state.ball);

  ball = collideWithWalls(ball);
  ball = collideWithNet(ball);

  const humanHit = collideBallWithPlayer(ball, human, 'human');
  ball = humanHit.ball;
  const jamieHit = collideBallWithPlayer(ball, jamie, 'jamie');
  const hitCount = (humanHit.hit ? 1 : 0) + (jamieHit.hit ? 1 : 0);
  ball = jamieHit.ball;

  const scoredBy = getPointWinner(ball);
  if (scoredBy) {
    return awardVolleyPoint({
      ...state,
      human,
      jamie,
      ball,
      rally: state.rally + hitCount,
    }, scoredBy);
  }

  return {
    ...state,
    human,
    jamie,
    ball,
    rally: state.rally + hitCount,
    message: getVolleyRallyMessage(state.rally + hitCount),
  };
}

export function getVolleyCommentary(state: VolleyGameState) {
  if (state.status === 'match-over') {
    return state.scores.human > state.scores.jamie
      ? 'You took the beach. I will be filing a tasteful sand-related appeal.'
      : 'Jamie wins the match. The scouting report will mention suspiciously good footwork.';
  }
  if (state.status === 'point-over') {
    return state.lastPointWinner === 'human'
      ? 'Point to you. Clean landing, dramatic implications.'
      : 'Point to Jamie. I am trying very hard not to call that beach analytics.';
  }
  if (state.status === 'ready') return 'Serve when ready. The sand is mostly ceremonial, but the pressure is real.';
  if (state.rally >= 8) return 'This rally has become a committee meeting with gravity.';
  if (state.ball.x < VOLLEY_NET_X && state.ball.vy > 0) return 'Under it, jump, and send that thing back with paperwork.';
  return 'Read the arc. The ball tells on itself if you listen.';
}

function createPlayer(x: number): VolleyBody {
  return {
    x,
    y: VOLLEY_GROUND_Y - VOLLEY_PLAYER_RADIUS,
    vx: 0,
    vy: 0,
  };
}

function createServeBall(server: VolleyPlayerId): VolleyBody {
  return {
    x: server === 'human' ? 190 : 610,
    y: 178,
    vx: 0,
    vy: 0,
  };
}

function updateHumanPlayer(player: VolleyBody, input: VolleyInput): VolleyBody {
  const movement = (input.left ? -PLAYER_SPEED : 0) + (input.right ? PLAYER_SPEED : 0);
  const onGround = isPlayerGrounded(player);
  const vy = input.jump && onGround ? JUMP_VELOCITY : player.vy + PLAYER_GRAVITY;
  return clampPlayerToSide({
    ...player,
    x: player.x + movement,
    y: player.y + vy,
    vx: movement,
    vy,
  }, 'human');
}

function updateJamiePlayer(player: VolleyBody, ball: VolleyBody): VolleyBody {
  const targetX = ball.x > VOLLEY_NET_X ? ball.x : 650;
  const direction = Math.abs(targetX - player.x) < 12 ? 0 : targetX > player.x ? 1 : -1;
  const onGround = isPlayerGrounded(player);
  const shouldJump = onGround && ball.x > VOLLEY_NET_X && ball.y > 175 && ball.y < 325 && Math.abs(ball.x - player.x) < 76;
  const vy = shouldJump ? JUMP_VELOCITY : player.vy + PLAYER_GRAVITY;
  return clampPlayerToSide({
    ...player,
    x: player.x + direction * PLAYER_SPEED * 0.92,
    y: player.y + vy,
    vx: direction * PLAYER_SPEED * 0.92,
    vy,
  }, 'jamie');
}

function updateBall(ball: VolleyBody): VolleyBody {
  return {
    x: ball.x + ball.vx,
    y: ball.y + ball.vy,
    vx: ball.vx * BALL_DRAG,
    vy: ball.vy + GRAVITY,
  };
}

function clampPlayerToSide(player: VolleyBody, side: VolleyPlayerId): VolleyBody {
  const left = side === 'human' ? VOLLEY_PLAYER_RADIUS : VOLLEY_NET_X + VOLLEY_PLAYER_RADIUS;
  const right = side === 'human' ? VOLLEY_NET_X - VOLLEY_PLAYER_RADIUS : VOLLEY_COURT_WIDTH - VOLLEY_PLAYER_RADIUS;
  const groundedY = VOLLEY_GROUND_Y - VOLLEY_PLAYER_RADIUS;
  const y = Math.min(player.y, groundedY);
  return {
    ...player,
    x: Math.min(right, Math.max(left, player.x)),
    y,
    vy: y === groundedY && player.vy > 0 ? 0 : player.vy,
  };
}

function collideWithWalls(ball: VolleyBody): VolleyBody {
  let next = { ...ball };
  if (next.x - VOLLEY_BALL_RADIUS < 0) {
    next = { ...next, x: VOLLEY_BALL_RADIUS, vx: Math.abs(next.vx) * BALL_BOUNCE };
  }
  if (next.x + VOLLEY_BALL_RADIUS > VOLLEY_COURT_WIDTH) {
    next = { ...next, x: VOLLEY_COURT_WIDTH - VOLLEY_BALL_RADIUS, vx: -Math.abs(next.vx) * BALL_BOUNCE };
  }
  if (next.y - VOLLEY_BALL_RADIUS < 0) {
    next = { ...next, y: VOLLEY_BALL_RADIUS, vy: Math.abs(next.vy) * BALL_BOUNCE };
  }
  return next;
}

function collideWithNet(ball: VolleyBody): VolleyBody {
  const hitsNetPost = Math.abs(ball.x - VOLLEY_NET_X) < VOLLEY_BALL_RADIUS + 7 && ball.y + VOLLEY_BALL_RADIUS > VOLLEY_NET_TOP_Y;
  if (!hitsNetPost) return ball;
  return {
    ...ball,
    x: ball.x < VOLLEY_NET_X ? VOLLEY_NET_X - VOLLEY_BALL_RADIUS - 7 : VOLLEY_NET_X + VOLLEY_BALL_RADIUS + 7,
    vx: ball.x < VOLLEY_NET_X ? -Math.abs(ball.vx) * BALL_BOUNCE : Math.abs(ball.vx) * BALL_BOUNCE,
    vy: Math.min(ball.vy, -3),
  };
}

function collideBallWithPlayer(ball: VolleyBody, player: VolleyBody, side: VolleyPlayerId) {
  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = VOLLEY_BALL_RADIUS + VOLLEY_PLAYER_RADIUS;
  if (distance <= 0 || distance > minDistance) return { ball, hit: false };

  const nx = dx / distance;
  const ny = dy / distance;
  const directionalBoost = side === 'human' ? 1 : -1;
  return {
    hit: true,
    ball: {
      x: player.x + nx * minDistance,
      y: player.y + ny * minDistance,
      vx: nx * PLAYER_HIT_POWER + directionalBoost * 3.2 + player.vx * 0.35,
      vy: Math.min(-6.2, ny * PLAYER_HIT_POWER - 5.8 + player.vy * 0.08),
    },
  };
}

function getPointWinner(ball: VolleyBody): VolleyPlayerId | null {
  if (ball.y + VOLLEY_BALL_RADIUS < VOLLEY_GROUND_Y) return null;
  return ball.x < VOLLEY_NET_X ? 'jamie' : 'human';
}

function awardVolleyPoint(state: VolleyGameState, winner: VolleyPlayerId): VolleyGameState {
  const scores = {
    ...state.scores,
    [winner]: state.scores[winner] + 1,
  };
  const matchOver = scores[winner] >= VOLLEY_TARGET_SCORE;

  return {
    ...state,
    ball: createServeBall(winner),
    scores,
    status: matchOver ? 'match-over' : 'point-over',
    server: winner,
    lastPointWinner: winner,
    message: `${winner === 'human' ? 'You score' : 'Jamie scores'}. ${matchOver ? 'Match complete.' : `${winner === 'human' ? 'Your' : "Jamie's"} serve next.`}`,
  };
}

function isPlayerGrounded(player: VolleyBody) {
  return player.y >= VOLLEY_GROUND_Y - VOLLEY_PLAYER_RADIUS - 0.5;
}

function getVolleyRallyMessage(rally: number) {
  if (rally >= 10) return 'Long rally. Nobody breathe.';
  if (rally >= 5) return 'The beach is awake now.';
  return 'Ball is live.';
}
