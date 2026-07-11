import { describe, expect, it } from 'vitest';
import {
  awardPoint,
  collideBallWithNet,
  collideBallWithPlayer,
  createInitialVolleyballState,
  getPointWinner,
  serveBall,
  stepVolleyballState,
  VOLLEYBALL_COURT,
} from '@/lib/beach-volleyball/game';

describe('beach volleyball game rules', () => {
  it('starts in a held serve state and launches the ball across the net', () => {
    const ready = createInitialVolleyballState('left');
    const served = serveBall(ready, 'left');

    expect(ready.phase).toBe('ready');
    expect(served.phase).toBe('playing');
    expect(served.ball.vx).toBeGreaterThan(0);
    expect(served.ball.vy).toBeLessThan(0);
  });

  it('awards the right side when the ball lands on the left court', () => {
    const winner = getPointWinner({
      x: VOLLEYBALL_COURT.netX - 100,
      y: VOLLEYBALL_COURT.groundY - 5,
      vx: 0,
      vy: 100,
      radius: VOLLEYBALL_COURT.ballRadius,
    });

    expect(winner).toBe('right');
  });

  it('turns a player collision into an upward return', () => {
    const state = createInitialVolleyballState('left');
    const ball = {
      ...state.ball,
      x: state.player.x + state.player.radius,
      y: state.player.y,
      vx: -100,
      vy: 300,
    };

    expect(collideBallWithPlayer(ball, state.player, true)).toBe(true);
    expect(ball.vx).toBeGreaterThan(0);
    expect(ball.vy).toBeLessThan(0);
  });

  it('blocks low balls that hit the net', () => {
    const ball = {
      x: VOLLEYBALL_COURT.netX - 2,
      y: VOLLEYBALL_COURT.netTopY + 30,
      vx: 300,
      vy: 80,
      radius: VOLLEYBALL_COURT.ballRadius,
    };

    expect(collideBallWithNet(ball)).toBe(true);
    expect(ball.x).toBeLessThan(VOLLEYBALL_COURT.netX);
    expect(ball.vx).toBeLessThan(0);
  });

  it('resets after a scored point with the winner serving next', () => {
    const scored = awardPoint(createInitialVolleyballState('left'), 'right');
    let reset = scored;
    for (let frame = 0; frame < 80; frame += 1) {
      reset = stepVolleyballState(reset, { move: 0, jump: false, hit: false }, 1 / 60);
    }

    expect(scored.score.right).toBe(1);
    expect(reset.phase).toBe('playing');
    expect(reset.servingSide).toBe('right');
    expect(reset.score.right).toBe(1);
    expect(reset.ball.vx).toBeLessThan(0);
  });
});
