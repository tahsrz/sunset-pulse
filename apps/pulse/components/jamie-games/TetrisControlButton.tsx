import React, { type ReactElement } from 'react';

type TetrisControlButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactElement<{ className?: string }>;
};

export function TetrisControlButton({
  label,
  onClick,
  disabled = false,
  children,
}: TetrisControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-slate-950/60 text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-300/10 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
