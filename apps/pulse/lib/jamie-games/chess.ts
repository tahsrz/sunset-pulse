import {
  BLACK,
  Chess,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
  WHITE,
} from 'chess.js';

export type JamieChessDifficulty = 'friendly' | 'sharp' | 'merciless';

export type ChessMoveInput = {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
};

export type JamieChessMove = ChessMoveInput & {
  san: string;
  score: number;
};

export type ChessOutcome = {
  status: 'playing' | 'checkmate' | 'stalemate' | 'insufficient-material' | 'draw';
  winner: Color | null;
};

export const JAMIE_CHESS_PROFILES: Record<JamieChessDifficulty, {
  label: string;
  description: string;
  depth: number;
  randomness: number;
}> = {
  friendly: {
    label: 'Friendly',
    description: 'Jamie plays quickly and leaves a little daylight.',
    depth: 1,
    randomness: 180,
  },
  sharp: {
    label: 'Sharp',
    description: 'Jamie looks ahead and punishes loose pieces.',
    depth: 2,
    randomness: 30,
  },
  merciless: {
    label: 'Merciless',
    description: 'Jamie calculates deeper and stops being polite.',
    depth: 3,
    randomness: 0,
  },
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20_000,
};

const MATE_SCORE = 1_000_000;

export function createChessGame(moves: ChessMoveInput[] = []) {
  const game = new Chess();
  for (const move of moves) game.move(move);
  return game;
}

export function chooseJamieChessMove(
  fen: string,
  difficulty: JamieChessDifficulty,
  random: () => number = Math.random
): JamieChessMove | null {
  const game = new Chess(fen);
  if (game.isGameOver()) return null;

  const aiColor = game.turn();
  const profile = JAMIE_CHESS_PROFILES[difficulty];
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestMoves: JamieChessMove[] = [];

  for (const move of orderedMoves(game)) {
    game.move(move);
    const calculated = minimax(
      game,
      profile.depth - 1,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      aiColor,
      1
    );
    game.undo();

    const noise = profile.randomness ? (random() * 2 - 1) * profile.randomness : 0;
    const score = calculated + noise;
    const candidate = { from: move.from, to: move.to, promotion: move.promotion, san: move.san, score };

    if (score > bestScore + 0.001) {
      bestScore = score;
      bestMoves = [candidate];
    } else if (Math.abs(score - bestScore) <= 0.001) {
      bestMoves.push(candidate);
    }
  }

  if (!bestMoves.length) return null;
  return bestMoves[Math.floor(random() * bestMoves.length)] || bestMoves[0];
}

export function getLegalMovesForSquare(fen: string, square: Square) {
  const game = new Chess(fen);
  return game.moves({ square, verbose: true }).map((move) => ({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    san: move.san,
    isCapture: move.isCapture(),
  }));
}

export function getChessOutcome(fen: string): ChessOutcome {
  const game = new Chess(fen);
  if (game.isCheckmate()) {
    return { status: 'checkmate', winner: game.turn() === WHITE ? BLACK : WHITE };
  }
  if (game.isStalemate()) return { status: 'stalemate', winner: null };
  if (game.isInsufficientMaterial()) return { status: 'insufficient-material', winner: null };
  if (game.isDraw()) return { status: 'draw', winner: null };
  return { status: 'playing', winner: null };
}

export function getJamieChessCommentary({
  fen,
  lastMove,
  jamieColor,
}: {
  fen: string;
  lastMove?: Pick<Move, 'san' | 'captured' | 'color'> | null;
  jamieColor: Color;
}) {
  const game = new Chess(fen);
  const outcome = getChessOutcome(fen);

  if (outcome.status === 'checkmate') {
    return outcome.winner === jamieColor
      ? 'Checkmate. Clean finish. I promise I was only calculating a little.'
      : 'Checkmate—you got me. That position belongs on the fridge.';
  }
  if (outcome.status !== 'playing') return 'Draw. The board has officially declined to pick a favorite.';
  if (game.isCheck()) {
    return game.turn() === jamieColor
      ? 'That is check. Rude, accurate, and now very much on my radar.'
      : 'Check. Your king has received a strongly worded calendar invitation.';
  }
  if (lastMove?.captured) {
    return lastMove.color === jamieColor
      ? `I took material with ${lastMove.san}. Small efficiencies become large problems.`
      : `${lastMove.san} takes material. Fair warning: I noticed.`;
  }
  if (lastMove?.color === jamieColor) return `${lastMove.san}. Your move—I have plans, but they are still technically private.`;
  if (lastMove) return `${lastMove.san}. Interesting. Let me stare at the board for a dramatically reasonable amount of time.`;
  return 'Board is live. You bring the opening theory; I will bring suspiciously calm eye contact.';
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  aiColor: Color,
  ply: number
): number {
  if (depth === 0 || game.isGameOver()) return evaluatePosition(game, aiColor, ply);

  const maximizing = game.turn() === aiColor;
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  for (const move of orderedMoves(game)) {
    game.move(move);
    const score = minimax(game, depth - 1, alpha, beta, aiColor, ply + 1);
    game.undo();

    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }

  return best;
}

function evaluatePosition(game: Chess, aiColor: Color, ply: number) {
  if (game.isCheckmate()) return game.turn() === aiColor ? -MATE_SCORE + ply : MATE_SCORE - ply;
  if (game.isDraw()) return 0;

  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] + positionalBonus(piece.type, piece.square, piece.color);
      score += piece.color === aiColor ? value : -value;
    }
  }

  const mobility = game.moves().length * 2;
  score += game.turn() === aiColor ? mobility : -mobility;
  if (game.isCheck()) score += game.turn() === aiColor ? -35 : 35;
  return score;
}

function positionalBonus(piece: PieceSymbol, square: Square, color: Color) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const forwardRank = color === WHITE ? rank : 7 - rank;
  const centerDistance = Math.abs(file - 3.5) + Math.abs(rank - 3.5);

  if (piece === 'p') return forwardRank * 8 - Math.abs(file - 3.5) * 2;
  if (piece === 'n') return Math.round(28 - centerDistance * 7);
  if (piece === 'b') return Math.round(18 - centerDistance * 3);
  if (piece === 'q') return Math.round(8 - centerDistance * 2);
  if (piece === 'k' && forwardRank <= 1 && (file <= 2 || file >= 6)) return 25;
  return 0;
}

function orderedMoves(game: Chess) {
  return game.moves({ verbose: true }).sort((left, right) => movePriority(right) - movePriority(left));
}

function movePriority(move: Move) {
  const capture = move.captured ? PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece] / 10 : 0;
  const promotion = move.promotion ? PIECE_VALUES[move.promotion] : 0;
  const check = move.san.includes('+') || move.san.includes('#') ? 80 : 0;
  return capture + promotion + check;
}
