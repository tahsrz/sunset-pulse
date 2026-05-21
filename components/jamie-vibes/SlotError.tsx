'use client';

type SlotErrorProps = {
  title: string;
  error: Error & { digest?: string };
  reset: () => void;
};

export function SlotError({ title, error, reset }: SlotErrorProps) {
  return (
    <section className="rounded-lg border border-red-300/30 bg-red-500/10 p-5 text-red-50">
      <p className="text-[10px] font-black uppercase text-red-200">{title}</p>
      <p className="mt-3 text-sm leading-6">{error.message || 'This Jamie slot failed to load.'}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded border border-red-200/30 px-3 py-2 text-xs font-black uppercase text-red-50 transition hover:bg-red-200/10"
      >
        Retry
      </button>
    </section>
  );
}
