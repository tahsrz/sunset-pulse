import { Check, Command, Copy, ExternalLink, Zap } from 'lucide-react';
import type { CommandActionItem } from '@/lib/command-center/actionTypes';

type CommandActionPanelProps = {
  actions: CommandActionItem[];
  copiedActionId: string | null;
  saved: boolean;
  onAction: (item: CommandActionItem) => void;
};

export function CommandActionPanel({ actions, copiedActionId, saved, onAction }: CommandActionPanelProps) {
  if (!actions.length) return null;

  return (
    <section className="border border-emerald-200/20 bg-emerald-300/10 p-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
        <Zap size={15} />
        Next Actions
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {actions.map((item) => (
          <CommandActionTile
            key={item.id}
            item={item}
            copied={copiedActionId === item.id}
            saved={saved}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
}

function CommandActionTile({
  item,
  copied,
  saved,
  onAction
}: {
  item: CommandActionItem;
  copied: boolean;
  saved: boolean;
  onAction: (item: CommandActionItem) => void;
}) {
  if (item.kind === 'external-link' && item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        onClick={() => onAction(item)}
        className="group border border-white/10 bg-[#071016] p-3 transition hover:border-emerald-200/50 hover:bg-emerald-300/10"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-black text-white">{item.label}</span>
          <ExternalLink size={15} className="text-emerald-100" />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">{item.description}</p>
      </a>
    );
  }

  if (item.kind === 'saved') {
    return (
      <div className="border border-white/10 bg-[#071016] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-black text-white">{saved ? 'Saved Locally' : 'Local Save Ready'}</span>
          <Check size={15} className={saved ? 'text-emerald-100' : 'text-slate-500'} />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          {saved ? 'This answer has already been saved to local query memory.' : item.description}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAction(item)}
      className="border border-white/10 bg-[#071016] p-3 text-left transition hover:border-emerald-200/50 hover:bg-emerald-300/10"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-white">{copied ? 'Copied' : item.label}</span>
        {item.kind === 'copy'
          ? (copied ? <Check size={15} className="text-emerald-100" /> : <Copy size={15} className="text-emerald-100" />)
          : <Command size={15} className="text-emerald-100" />}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-300">{item.description}</p>
    </button>
  );
}
