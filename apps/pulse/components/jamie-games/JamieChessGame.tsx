'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BLACK,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
  WHITE,
} from 'chess.js';
import {
  BrainCircuit,
  ChevronLeft,
  Crown,
  History,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CapturedPieces } from '@/components/jamie-games/CapturedPieces';
import { ChessBoard } from '@/components/jamie-games/ChessBoard';
import {
  chooseJamieChessMove,
  createChessGame,
  getJamieChessCommentary,
  getLegalMovesForSquare,
  JAMIE_CHESS_PROFILES,
  type ChessMoveInput,
  type JamieChessDifficulty,
} from '@/lib/jamie-games/chess';
import { cn } from '@/lib/utils';

type PromotionChoice = {
  from: Square;
  to: Square;
  options: PieceSymbol[];
};

type MatchRecord = {
  wins: number;
  draws: number;
  losses: number;
};

const RECORD_KEY = 'sunset_play_jamie_chess_record';
const EMPTY_RECORD: MatchRecord = { wins: 0, draws: 0, losses: 0 };
const PROMOTION_PIECES: PieceSymbol[] = ['q', 'r', 'b', 'n'];
const PIECE_GLYPHS: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

export function JamieChessGame() {
  const [moves, setMoves] = useState<ChessMoveInput[]>([]);
  const [undoPoints, setUndoPoints] = useState<number[]>([]);
  const [playerColor, setPlayerColor] = useState<Color>(WHITE);
  const [difficulty, setDifficulty] = useState<JamieChessDifficulty>('sharp');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [promotionChoice, setPromotionChoice] = useState<PromotionChoice | null>(null);
  const [jamieThinking, setJamieThinking] = useState(false);
  const [record, setRecord] = useState<MatchRecord>(EMPTY_RECORD);
  const recordedPositionRef = useRef<string | null>(null);

  const game = useMemo(() => createChessGame(moves), [moves]);
  const fen = game.fen();
  const history = game.history({ verbose: true });
  const lastMove = history.at(-1) || null;
  const jamieColor = playerColor === WHITE ? BLACK : WHITE;
  const legalMoves = selectedSquare ? getLegalMovesForSquare(fen, selectedSquare) : [];
  const gameOver = game.isGameOver();
  const playerTurn = game.turn() === playerColor;
  const interactionDisabled = gameOver || jamieThinking || !playerTurn;
  const commentary = jamieThinking
    ? 'I am calculating. This is the part where I pretend the answer arrived effortlessly.'
    : getJamieChessCommentary({ fen, lastMove, jamieColor });
  const capturedByPlayer = history.filter((move) => move.color === playerColor && move.captured).map((move) => move.captured!);
  const capturedByJamie = history.filter((move) => move.color === jamieColor && move.captured).map((move) => move.captured!);
  const status = describeStatus(game, playerColor, jamieThinking);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECORD_KEY);
      if (saved) setRecord({ ...EMPTY_RECORD, ...JSON.parse(saved) });
    } catch {
      setRecord(EMPTY_RECORD);
    }
  }, []);

  useEffect(() => {
    if (gameOver || game.turn() !== jamieColor) {
      setJamieThinking(false);
      return;
    }

    const sourceFen = fen;
    setJamieThinking(true);
    const timer = window.setTimeout(() => {
      const choice = chooseJamieChessMove(sourceFen, difficulty);
      if (!choice) {
        setJamieThinking(false);
        return;
      }

      setMoves((currentMoves) => {
        const currentGame = createChessGame(currentMoves);
        if (currentGame.fen() !== sourceFen) return currentMoves;
        return [...currentMoves, normalizeMove(choice)];
      });
      setSelectedSquare(null);
      setJamieThinking(false);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [difficulty, fen, gameOver, jamieColor, game]);

  useEffect(() => {
    if (!gameOver || recordedPositionRef.current === fen) return;
    recordedPositionRef.current = fen;

    setRecord((currentRecord) => {
      const nextRecord = { ...currentRecord };
      if (game.isCheckmate()) {
        const winner = game.turn() === WHITE ? BLACK : WHITE;
        if (winner === playerColor) nextRecord.wins += 1;
        else nextRecord.losses += 1;
      } else {
        nextRecord.draws += 1;
      }

      try {
        window.localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecord));
      } catch {
        // The in-memory record remains useful when browser storage is unavailable.
      }
      return nextRecord;
    });
  }, [fen, game, gameOver, playerColor]);

  const handleSquareClick = (square: Square) => {
    if (interactionDisabled || promotionChoice) return;
    const clickedPiece = game.get(square);

    if (!selectedSquare) {
      if (clickedPiece?.color === playerColor) setSelectedSquare(square);
      return;
    }

    const matchingMoves = legalMoves.filter((move) => move.to === square);
    if (matchingMoves.length) {
      const promotionOptions = matchingMoves
        .map((move) => move.promotion)
        .filter((piece): piece is PieceSymbol => Boolean(piece));

      if (promotionOptions.length > 1) {
        setPromotionChoice({ from: selectedSquare, to: square, options: promotionOptions });
      } else {
        playPlayerMove({ from: selectedSquare, to: square, promotion: promotionOptions[0] });
      }
      return;
    }

    setSelectedSquare(clickedPiece?.color === playerColor ? square : null);
  };

  const playPlayerMove = (move: ChessMoveInput) => {
    const validationGame = createChessGame(moves);
    try {
      validationGame.move(move);
    } catch {
      setSelectedSquare(null);
      setPromotionChoice(null);
      return;
    }

    setUndoPoints((points) => [...points, moves.length]);
    setMoves((currentMoves) => [...currentMoves, move]);
    setSelectedSquare(null);
    setPromotionChoice(null);
  };

  const resetGame = () => {
    recordedPositionRef.current = null;
    setMoves([]);
    setUndoPoints([]);
    setSelectedSquare(null);
    setPromotionChoice(null);
    setJamieThinking(false);
  };

  const changeSide = (color: Color) => {
    setPlayerColor(color);
    resetGame();
  };

  const undoTurn = () => {
    const target = undoPoints.at(-1);
    if (target === undefined || gameOver) return;
    recordedPositionRef.current = null;
    setMoves((currentMoves) => currentMoves.slice(0, target));
    setUndoPoints((points) => points.slice(0, -1));
    setSelectedSquare(null);
    setPromotionChoice(null);
  };

  return (
    <main className="min-h-screen bg-[#060913] pb-32 text-slate-100">
      <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/play-jamie" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-violet-300 transition hover:text-violet-100">
              <ChevronLeft className="h-4 w-4" />
              Play Jamie
            </Link>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              <Crown className="h-8 w-8 text-amber-200" />
              Chess with Jamie
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Legal, local, and slightly judgmental. No model tokens are consumed during a match.
            </p>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-center">
            {Object.entries(record).map(([label, value]) => (
              <div key={label} className="min-w-20 border-r border-white/10 px-4 py-2 last:border-r-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,900px)_minmax(330px,1fr)]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-400/15 text-lg">{PIECE_GLYPHS[jamieColor].q}</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">Jamie</p>
                  <p className="text-xs text-slate-500">{JAMIE_CHESS_PROFILES[difficulty].label} engine</p>
                </div>
              </div>
              <CapturedPieces pieces={capturedByPlayer} color={jamieColor} label="You captured" />
            </div>

            <ChessBoard
              fen={fen}
              orientation={playerColor}
              selectedSquare={selectedSquare}
              legalTargets={legalMoves}
              lastMove={lastMove}
              disabled={interactionDisabled}
              onSquareClick={handleSquareClick}
            />

            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/15 text-lg">{PIECE_GLYPHS[playerColor].k}</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">You</p>
                  <p className="text-xs text-slate-500">Playing {playerColor === WHITE ? 'white' : 'black'}</p>
                </div>
              </div>
              <CapturedPieces pieces={capturedByJamie} color={playerColor} label="Jamie captured" />
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-violet-200/15 bg-violet-400/[0.07] p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-violet-200">
                <Sparkles className="h-4 w-4" />
                Jamie says
              </div>
              <p className="mt-4 text-base font-semibold leading-7 text-violet-50">“{commentary}”</p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Match status</p>
                  <p className={cn('mt-2 text-lg font-black', status.tone)}>{status.label}</p>
                </div>
                {gameOver ? <Crown className="h-7 w-7 text-amber-200" /> : <Swords className="h-7 w-7 text-cyan-200" />}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="outline" className="border-white/10 bg-white/[0.03]" onClick={undoTurn} disabled={!undoPoints.length || gameOver || jamieThinking}>
                  <Undo2 className="mr-2 h-4 w-4" /> Undo turn
                </Button>
                <Button variant="outline" className="border-white/10 bg-white/[0.03]" onClick={resetGame}>
                  <RotateCcw className="mr-2 h-4 w-4" /> New game
                </Button>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                <Shield className="h-4 w-4 text-cyan-200" />
                Your side
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {([WHITE, BLACK] as Color[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={playerColor === color}
                    onClick={() => changeSide(color)}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-sm font-black transition',
                      playerColor === color
                        ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-50'
                        : 'border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/20 hover:text-white'
                    )}
                  >
                    <span className="mr-2 text-lg">{PIECE_GLYPHS[color].k}</span>
                    {color === WHITE ? 'White' : 'Black'}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                <BrainCircuit className="h-4 w-4 text-violet-200" />
                Jamie difficulty
              </div>
              <div className="mt-4 space-y-2">
                {(Object.entries(JAMIE_CHESS_PROFILES) as Array<[JamieChessDifficulty, typeof JAMIE_CHESS_PROFILES[JamieChessDifficulty]]>).map(([id, profile]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={difficulty === id}
                    onClick={() => setDifficulty(id)}
                    className={cn(
                      'w-full rounded-lg border px-4 py-3 text-left transition',
                      difficulty === id
                        ? 'border-violet-300/45 bg-violet-300/10'
                        : 'border-white/10 bg-slate-950/50 hover:border-white/20'
                    )}
                  >
                    <span className="block text-sm font-black text-white">{profile.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{profile.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                <History className="h-4 w-4 text-amber-200" />
                Move log
              </div>
              <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/70 p-3 font-mono text-xs">
                {history.length ? (
                  <ol className="space-y-2">
                    {pairMoves(history).map((turn) => (
                      <li key={turn.number} className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-slate-300">
                        <span className="text-slate-600">{turn.number}.</span>
                        <span className="font-bold text-slate-100">{turn.white || '—'}</span>
                        <span className="font-bold text-slate-100">{turn.black || '—'}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-5 text-center text-slate-600">No moves yet.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>

      {promotionChoice && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="promotion-title" className="w-full max-w-sm rounded-xl border border-violet-200/20 bg-[#0b1020] p-6 shadow-2xl">
            <h2 id="promotion-title" className="text-xl font-black text-white">Promote your pawn</h2>
            <p className="mt-2 text-sm text-slate-400">Choose the piece that enters the board.</p>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {PROMOTION_PIECES.filter((piece) => promotionChoice.options.includes(piece)).map((piece) => (
                <button
                  key={piece}
                  type="button"
                  aria-label={`Promote to ${pieceName(piece)}`}
                  onClick={() => playPlayerMove({ from: promotionChoice.from, to: promotionChoice.to, promotion: piece })}
                  className="aspect-square rounded-lg border border-white/10 bg-white/[0.05] font-serif text-4xl text-white transition hover:border-violet-300/50 hover:bg-violet-300/10"
                >
                  {PIECE_GLYPHS[playerColor][piece]}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-4 w-full" onClick={() => setPromotionChoice(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </main>
  );
}

function normalizeMove(move: ChessMoveInput): ChessMoveInput {
  return { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) };
}

function describeStatus(game: ReturnType<typeof createChessGame>, playerColor: Color, thinking: boolean) {
  if (game.isCheckmate()) {
    const winner = game.turn() === WHITE ? BLACK : WHITE;
    return winner === playerColor
      ? { label: 'You checkmated Jamie', tone: 'text-emerald-200' }
      : { label: 'Jamie wins by checkmate', tone: 'text-red-200' };
  }
  if (game.isStalemate()) return { label: 'Draw by stalemate', tone: 'text-amber-100' };
  if (game.isInsufficientMaterial()) return { label: 'Draw by insufficient material', tone: 'text-amber-100' };
  if (game.isThreefoldRepetition()) return { label: 'Draw by repetition', tone: 'text-amber-100' };
  if (game.isDrawByFiftyMoves()) return { label: 'Draw by fifty-move rule', tone: 'text-amber-100' };
  if (thinking) return { label: 'Jamie is calculating', tone: 'text-violet-200' };
  if (game.isCheck()) return { label: game.turn() === playerColor ? 'Your king is in check' : 'Jamie is in check', tone: 'text-red-200' };
  return { label: game.turn() === playerColor ? 'Your move' : 'Jamie to move', tone: 'text-cyan-100' };
}

function pairMoves(history: Move[]) {
  const turns: Array<{ number: number; white?: string; black?: string }> = [];
  history.forEach((move, index) => {
    const turnIndex = Math.floor(index / 2);
    const existing = turns[turnIndex] || { number: turnIndex + 1 };
    if (move.color === WHITE) existing.white = move.san;
    else existing.black = move.san;
    turns[turnIndex] = existing;
  });
  return turns;
}

function pieceName(piece: PieceSymbol) {
  return ({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn', k: 'king' } as const)[piece];
}
