'use client';

import { Trash2 } from 'lucide-react';
import {
  starterJobs,
  type SavedExample,
} from './agentConsoleConfig';

export function AgentConsoleSavedExamplesLibrary({
  examples,
  onCopy,
  onDelete,
  onUse,
  selectedJobId,
  totalCount,
}: {
  examples: SavedExample[];
  onCopy: (example: SavedExample) => void | Promise<void>;
  onDelete: (id: string) => void;
  onUse: (example: SavedExample) => void;
  selectedJobId: string;
  totalCount: number;
}) {
  if (!examples.length) return null;

  return (
    <details className="rounded-md border border-[#c9d3ca] bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-[#24312f]">
        Saved examples
        <span className="ml-2 rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2 py-1 text-xs text-[#4c5a55]">
          {totalCount}
        </span>
      </summary>
      <div className="mt-3 grid gap-2">
        {examples.map((example) => {
          const matchingJob = starterJobs.find((job) => job.id === example.jobId);
          const isCurrentJob = example.jobId === selectedJobId;
          return (
            <div key={example.id} className="rounded-md border border-[#d8dfd9] bg-[#fbfcf8] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#517268]">
                    {isCurrentJob ? 'This workflow' : matchingJob?.label || 'Saved'}
                  </p>
                  <p className="truncate text-sm font-semibold text-[#17201f]">{example.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#4c5a55]">{example.input}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onUse(example)}
                    className="inline-flex h-9 items-center rounded-md border border-[#b9c6bd] bg-white px-3 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1]"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => void onCopy(example)}
                    className="inline-flex h-9 items-center rounded-md border border-[#b9c6bd] bg-white px-3 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1]"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    aria-label="Delete saved example"
                    onClick={() => onDelete(example.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e2b8ad] bg-white text-[#8a2e20] hover:bg-[#fff4f1]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
