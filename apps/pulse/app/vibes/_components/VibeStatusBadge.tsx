import React from 'react';

type VibeStatusBadgeProps = { status: string };

const statusStyles: Record<string, string> = {
  draft: 'border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]',
  in_review: 'border-[#dba617] bg-[#fcf9e8] text-[#6b4f00]',
  published: 'border-[#00a32a] bg-[#edfaef] text-[#0a5c20]',
  archived: 'border-[#8c8f94] bg-[#f0f0f1] text-[#50575e]',
  trash: 'border-[#d63638] bg-[#fcf0f1] text-[#8a2424]',
};

export function VibeStatusBadge({ status }: VibeStatusBadgeProps) {
  const label = status.replace(/_/g, ' ');
  return <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[status] ?? statusStyles.draft}`}>{label}</span>;
}
