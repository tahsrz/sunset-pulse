export const TETRIS_BOARD_WIDTH = 10;
export const TETRIS_BOARD_HEIGHT = 20;

export const TETROMINO_TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'] as const;

export type TetrominoType = (typeof TETROMINO_TYPES)[number];
export type TetrisCell = TetrominoType | null;
export type TetrisBoard = TetrisCell[][];

export type FallingPiece = {
  type: TetrominoType;
  rotation: number;
  x: number;
  y: number;
};

export type TetrisStatus = 'playing' | 'paused' | 'game-over';

export type TetrisGameState = {
  board: TetrisBoard;
  current: FallingPiece;
  next: TetrominoType;
  queue: TetrominoType[];
  score: number;
  lines: number;
  level: number;
  status: TetrisStatus;
};

type Point = readonly [x: number, y: number];

const SHAPES: Record<TetrominoType, readonly (readonly Point[])[]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
};

const LINE_SCORES = [0, 100, 300, 500, 800] as const;

export function createEmptyTetrisBoard(): TetrisBoard {
  return Array.from({ length: TETRIS_BOARD_HEIGHT }, () =>
    Array<TetrisCell>(TETRIS_BOARD_WIDTH).fill(null)
  );
}

export function createTetrominoBag(random: () => number = Math.random): TetrominoType[] {
  const bag = [...TETROMINO_TYPES];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
  return bag;
}

export function spawnTetromino(type: TetrominoType): FallingPiece {
  return { type, rotation: 0, x: 3, y: 0 };
}

export function createTetrisGame(
  first: TetrominoType,
  next: TetrominoType,
  queue: TetrominoType[] = []
): TetrisGameState {
  return {
    board: createEmptyTetrisBoard(),
    current: spawnTetromino(first),
    next,
    queue,
    score: 0,
    lines: 0,
    level: 1,
    status: 'playing',
  };
}

export function getTetrominoCells(piece: FallingPiece): Point[] {
  return SHAPES[piece.type][piece.rotation % 4].map(([x, y]) => [piece.x + x, piece.y + y]);
}

export function canPlaceTetromino(board: TetrisBoard, piece: FallingPiece): boolean {
  return getTetrominoCells(piece).every(([x, y]) => (
    x >= 0
    && x < TETRIS_BOARD_WIDTH
    && y >= 0
    && y < TETRIS_BOARD_HEIGHT
    && board[y][x] === null
  ));
}

export function moveTetromino(
  state: TetrisGameState,
  deltaX: number,
  deltaY: number
): TetrisGameState | null {
  if (state.status !== 'playing') return null;
  const candidate = { ...state.current, x: state.current.x + deltaX, y: state.current.y + deltaY };
  return canPlaceTetromino(state.board, candidate) ? { ...state, current: candidate } : null;
}

export function rotateTetromino(state: TetrisGameState): TetrisGameState | null {
  if (state.status !== 'playing') return null;
  const rotated = { ...state.current, rotation: (state.current.rotation + 1) % 4 };
  for (const kick of [0, -1, 1, -2, 2]) {
    const candidate = { ...rotated, x: rotated.x + kick };
    if (canPlaceTetromino(state.board, candidate)) return { ...state, current: candidate };
  }
  return null;
}

export function getGhostTetromino(board: TetrisBoard, piece: FallingPiece): FallingPiece {
  let ghost = piece;
  while (canPlaceTetromino(board, { ...ghost, y: ghost.y + 1 })) {
    ghost = { ...ghost, y: ghost.y + 1 };
  }
  return ghost;
}

export function lockTetromino(state: TetrisGameState): TetrisGameState {
  const locked = state.board.map((row) => [...row]);
  for (const [x, y] of getTetrominoCells(state.current)) locked[y][x] = state.current.type;

  const { board, cleared } = clearCompletedLines(locked);
  const lines = state.lines + cleared;
  const level = Math.floor(lines / 10) + 1;
  const current = spawnTetromino(state.next);
  const next = state.queue[0] ?? state.next;
  const score = state.score + LINE_SCORES[cleared] * state.level;

  return {
    board,
    current,
    next,
    queue: state.queue.slice(1),
    score,
    lines,
    level,
    status: canPlaceTetromino(board, current) ? 'playing' : 'game-over',
  };
}

export function hardDropTetromino(state: TetrisGameState): TetrisGameState {
  const ghost = getGhostTetromino(state.board, state.current);
  const distance = ghost.y - state.current.y;
  return lockTetromino({ ...state, current: ghost, score: state.score + distance * 2 });
}

export function clearCompletedLines(board: TetrisBoard): { board: TetrisBoard; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = TETRIS_BOARD_HEIGHT - remaining.length;
  return {
    board: [
      ...Array.from({ length: cleared }, () => Array<TetrisCell>(TETRIS_BOARD_WIDTH).fill(null)),
      ...remaining.map((row) => [...row]),
    ],
    cleared,
  };
}

export function getTetrisDropInterval(level: number): number {
  return Math.max(90, 800 - (level - 1) * 65);
}

export function getTetrisPreview(type: TetrominoType): Point[] {
  return SHAPES[type][0].map(([x, y]) => [x, y]);
}
