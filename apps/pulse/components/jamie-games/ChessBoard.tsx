'use client';

import React from 'react';
import { Chess, SQUARES, type Color, type PieceSymbol, type Square } from 'chess.js';
import { cn } from '@/lib/utils';

type LegalTarget = {
  to: Square;
  isCapture: boolean;
};

type ChessBoardProps = {
  fen: string;
  orientation: Color;
  selectedSquare: Square | null;
  legalTargets: LegalTarget[];
  lastMove?: { from: Square; to: Square } | null;
  disabled?: boolean;
  onSquareClick: (square: Square) => void;
};

const PIECES: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PIECE_NAMES: Record<PieceSymbol, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

export function ChessBoard({
  fen,
  orientation,
  selectedSquare,
  legalTargets,
  lastMove,
  disabled = false,
  onSquareClick,
}: ChessBoardProps) {
  const game = new Chess(fen);
  const squares = orientation === 'w' ? SQUARES : [...SQUARES].reverse();
  const checkedKing = game.isCheck() ? game.findPiece({ type: 'k', color: game.turn() })[0] : null;
  const targetMap = new Map(legalTargets.map((target) => [target.to, target]));

  return (
    <div
      role="grid"
      aria-label={`Chess board, ${orientation === 'w' ? 'white' : 'black'} perspective`}
      className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-xl border border-violet-200/20 bg-slate-950 shadow-[0_30px_90px_rgba(2,6,23,0.55)]"
    >
      {squares.map((square, index) => {
        const piece = game.get(square);
        const target = targetMap.get(square);
        const isLight = isLightSquare(square);
        const isLastMove = lastMove?.from === square || lastMove?.to === square;
        const showFile = index >= 56;
        const showRank = index % 8 === 0;
        const pieceLabel = piece ? `${piece.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece.type]}` : 'empty';

        return (
          <button
            key={square}
            type="button"
            role="gridcell"
            aria-label={`${square}, ${pieceLabel}${target ? ', legal destination' : ''}`}
            aria-selected={selectedSquare === square}
            disabled={disabled}
            onClick={() => onSquareClick(square)}
            className={cn(
              'group relative flex aspect-square items-center justify-center outline-none transition focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-cyan-300/80 disabled:cursor-default',
              isLight ? 'bg-[#d8d4c4]' : 'bg-[#5a6072]',
              isLastMove && 'after:absolute after:inset-0 after:bg-amber-300/30',
              selectedSquare === square && 'after:absolute after:inset-0 after:bg-cyan-300/40',
              checkedKing === square && 'after:absolute after:inset-0 after:bg-red-500/55'
            )}
          >
            {target && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute z-10 rounded-full bg-cyan-950/50',
                  target.isCapture ? 'inset-[9%] border-[5px] border-cyan-200/80 bg-transparent' : 'h-[22%] w-[22%]'
                )}
              />
            )}
            {piece && (
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-20 select-none font-serif text-[clamp(2rem,8vw,5.3rem)] leading-none transition-transform group-enabled:group-hover:scale-105',
                  piece.color === 'w'
                    ? 'text-white [text-shadow:0_2px_1px_#0f172a,0_0_2px_#0f172a]'
                    : 'text-slate-950 [text-shadow:0_1px_1px_rgba(255,255,255,0.45)]'
                )}
              >
                {PIECES[piece.color][piece.type]}
              </span>
            )}
            {showFile && (
              <span className={cn(
                'pointer-events-none absolute bottom-0.5 right-1 z-30 text-[9px] font-black uppercase',
                isLight ? 'text-slate-700/70' : 'text-slate-100/70'
              )}>
                {square[0]}
              </span>
            )}
            {showRank && (
              <span className={cn(
                'pointer-events-none absolute left-1 top-0.5 z-30 text-[9px] font-black',
                isLight ? 'text-slate-700/70' : 'text-slate-100/70'
              )}>
                {square[1]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function isLightSquare(square: Square) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return (file + rank) % 2 === 0;
}
