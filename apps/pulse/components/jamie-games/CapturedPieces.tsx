'use client';

import React from 'react';
import type { Color, PieceSymbol } from 'chess.js';

type CapturedPiecesProps = {
  pieces: PieceSymbol[];
  color: Color;
  label: string;
};

const GLYPHS: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

export function CapturedPieces({ pieces, color, label }: CapturedPiecesProps) {
  return (
    <div className="text-right" aria-label={`${label}: ${pieces.length}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className="mt-1 min-h-5 font-serif text-base tracking-[-0.2em] text-slate-300">
        {pieces.length
          ? pieces.map((piece, index) => <span key={`${piece}-${index}`}>{GLYPHS[color][piece]}</span>)
          : '—'}
      </p>
    </div>
  );
}
