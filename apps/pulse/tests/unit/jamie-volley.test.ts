import { describe, expect, it } from 'vitest';
import {
  VOLLEY_GROUND_Y,
  VOLLEY_NET_X,
  VOLLEY_PLAYER_RADIUS,
  VOLLEY_TARGET_SCORE,
  createVolleyGame,
  serveVolley,
  tickVolley,
} from '@/lib/jamie-games/volley';

describe('Play Jamie Sunset Volley engine', () => {
  it('serves the ball into live play toward Jamie when the human serves', () => {
    const ready = createVolleyGame({ server: 'human' });
    const playing = serveVolley(ready);

    expect(playing.status).toBe('playing');
    expect(playing.ball.vx).toBeGreaterThan(0);
    expect(playing.ball.vy).toBeLessThan(0);
  });

  it('moves and jumps the human player while keeping them on their side', () => {
    const playing = serveVolley(createVolleyGame());
    const jumped = tickVolley(playing, { right: true, jump: true });

    expect(jumped.human.x).toBeGreaterThan(playing.human.x);
    expect(jumped.human.y).toBeLessThanOrEqual(VOLLEY_GROUND_Y - VOLLEY_PLAYER_RADIUS);
    expect(jumped.human.x).toBeLessThan(VOLLEY_NET_X);
  });

  it('awards a point to Jamie when the ball lands on the human side', () => {
    const playing = serveVolley(createVolleyGame());
    const result = tickVolley({
      ...playing,
      ball: { x: 150, y: VOLLEY_GROUND_Y - 4, vx: 0, vy: 8 },
    });

    expect(result.status).toBe('point-over');
    expect(result.lastPointWinner).toBe('jamie');
    expect(result.scores.jamie).toBe(1);
  });

  it('ends the match when the target score is reached', () => {
    const playing = serveVolley(createVolleyGame({ scores: { human: VOLLEY_TARGET_SCORE - 1 } }));
    const result = tickVolley({
      ...playing,
      ball: { x: 650, y: VOLLEY_GROUND_Y - 4, vx: 0, vy: 8 },
    });

    expect(result.status).toBe('match-over');
    expect(result.lastPointWinner).toBe('human');
    expect(result.scores.human).toBe(VOLLEY_TARGET_SCORE);
  });
});
