import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  chooseJamieChessMove,
  createChessGame,
  getChessOutcome,
  getJamieChessCommentary,
  getLegalMovesForSquare,
} from '@/lib/jamie-games/chess';

describe('Play Jamie chess engine', () => {
  it('replays move inputs into a legal position', () => {
    const game = createChessGame([
      { from: 'e2', to: 'e4' },
      { from: 'e7', to: 'e5' },
      { from: 'g1', to: 'f3' },
    ]);

    expect(game.history()).toEqual(['e4', 'e5', 'Nf3']);
    expect(game.turn()).toBe('b');
  });

  it('returns legal targets for a selected square', () => {
    const moves = getLegalMovesForSquare(new Chess().fen(), 'e2');
    expect(moves.map((move) => move.to).sort()).toEqual(['e3', 'e4']);
  });

  it('always chooses a legal move without mutating the supplied position', () => {
    const game = new Chess();
    game.move('e4');
    const fen = game.fen();
    const choice = chooseJamieChessMove(fen, 'sharp', () => 0.5);

    expect(choice).not.toBeNull();
    expect(game.fen()).toBe(fen);
    expect(() => new Chess(fen).move(choice!)).not.toThrow();
  });

  it('takes a hanging queen at merciless difficulty', () => {
    const fen = 'r3k3/8/8/8/8/8/8/Q3K3 b - - 0 1';
    const choice = chooseJamieChessMove(fen, 'merciless', () => 0.5);

    expect(choice).toMatchObject({ from: 'a8', to: 'a1' });
  });

  it('recognizes finished games and stops choosing moves', () => {
    const checkmate = '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1';

    expect(getChessOutcome(checkmate)).toEqual({ status: 'checkmate', winner: 'w' });
    expect(chooseJamieChessMove(checkmate, 'friendly')).toBeNull();
  });

  it('generates Jamie commentary from board state rather than model output', () => {
    const game = new Chess();
    game.move('e4');
    const lastMove = game.history({ verbose: true }).at(-1);

    expect(getJamieChessCommentary({ fen: game.fen(), lastMove, jamieColor: 'b' })).toContain('Interesting');
    expect(getJamieChessCommentary({
      fen: '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1',
      jamieColor: 'b',
    })).toContain('got me');
  });
});
