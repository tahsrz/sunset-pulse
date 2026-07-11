import React from 'react';
import { getSuitSymbol, type PokerCard as PokerCardType } from '@/lib/jamie-games/poker';

type PokerCardProps = {
  card?: PokerCardType;
  hidden?: boolean;
  label?: string;
};

export function PokerCard({ card, hidden = false, label }: PokerCardProps) {
  if (hidden || !card) {
    return (
      <span
        aria-label={label ?? 'Hidden card'}
        className="flex aspect-[2.5/3.5] min-h-24 items-center justify-center rounded-xl border border-violet-200/25 bg-gradient-to-br from-violet-500/70 via-slate-950 to-cyan-500/50 p-2 text-lg font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.3)]"
      >
        JP
      </span>
    );
  }

  const redSuit = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <span
      aria-label={label ?? `${card.rank} of ${card.suit}`}
      className={`flex aspect-[2.5/3.5] min-h-24 flex-col justify-between rounded-xl border border-white/60 bg-white p-2 font-black shadow-[0_18px_40px_rgba(15,23,42,0.28)] ${
        redSuit ? 'text-rose-600' : 'text-slate-950'
      }`}
    >
      <span className="text-base leading-none sm:text-lg">{card.rank}</span>
      <span className="self-center text-3xl leading-none sm:text-4xl">{getSuitSymbol(card.suit)}</span>
      <span className="self-end text-base leading-none rotate-180 sm:text-lg">{card.rank}</span>
    </span>
  );
}
