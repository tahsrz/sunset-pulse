import { describe, expect, it } from 'vitest';
import {
  TETRIS_BOARD_HEIGHT,
  TETRIS_BOARD_WIDTH,
  TETROMINO_TYPES,
  canPlaceTetromino,
  clearCompletedLines,
  createEmptyTetrisBoard,
  createTetrominoBag,
  createTetrisGame,
  getGhostTetromino,
  getTetrominoCells,
  hardDropTetromino,
  moveTetromino,
  rotateTetromino,
} from '@/lib/jamie-games/tetris';

describe('Play Jamie falling-block engine', () => {
  it('creates a complete seven-piece bag without duplicates', () => {
    const bag = createTetrominoBag(() => 0.5);

    expect(bag).toHaveLength(7);
    expect([...bag].sort()).toEqual([...TETROMINO_TYPES].sort());
  });

  it('creates a correctly sized empty board', () => {
    const board = createEmptyTetrisBoard();

    expect(board).toHaveLength(TETRIS_BOARD_HEIGHT);
    expect(board.every((row) => row.length === TETRIS_BOARD_WIDTH)).toBe(true);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });

  it('moves pieces while preventing movement through a wall', () => {
    let game = createTetrisGame('O', 'I', ['T']);
    game = { ...game, current: { ...game.current, x: -1 } };

    expect(moveTetromino(game, -1, 0)).toBeNull();
    expect(moveTetromino(game, 1, 0)?.current.x).toBe(0);
  });

  it('rotates a piece and keeps every cell on the board', () => {
    const game = createTetrisGame('T', 'I', ['O']);
    const rotated = rotateTetromino(game);

    expect(rotated?.current.rotation).toBe(1);
    expect(rotated && canPlaceTetromino(rotated.board, rotated.current)).toBe(true);
  });

  it('clears completed lines and inserts empty rows at the top', () => {
    const board = createEmptyTetrisBoard();
    board[18] = Array(TETRIS_BOARD_WIDTH).fill('I');
    board[19] = Array(TETRIS_BOARD_WIDTH).fill('T');

    const result = clearCompletedLines(board);

    expect(result.cleared).toBe(2);
    expect(result.board[0].every((cell) => cell === null)).toBe(true);
    expect(result.board[1].every((cell) => cell === null)).toBe(true);
  });

  it('hard drops, locks the piece, scores distance, and advances the queue', () => {
    const game = createTetrisGame('O', 'I', ['T', 'Z']);
    const ghost = getGhostTetromino(game.board, game.current);
    const result = hardDropTetromino(game);

    expect(result.score).toBe((ghost.y - game.current.y) * 2);
    expect(result.current.type).toBe('I');
    expect(result.next).toBe('T');
    expect(result.queue).toEqual(['Z']);
    expect(getTetrominoCells(ghost).every(([x, y]) => result.board[y][x] === 'O')).toBe(true);
  });
});
