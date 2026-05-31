import { AlertTriangle, BadgeCheck, Ban, ShieldCheck } from 'lucide-react';
import type { RestrictedCategory } from './orderVerificationTypes';

type RestrictedItemBadgeProps = {
  category?: RestrictedCategory;
  minimumAge?: 18 | 21;
  compact?: boolean;
};

const categoryLabels: Record<RestrictedCategory, string> = {
  tobacco: 'Tobacco',
  alcohol: 'Alcohol',
  lotto: 'Lotto',
  fuel: 'Fuel',
  none: 'No restriction',
};

export function RestrictedItemBadge({ category = 'none', minimumAge, compact = false }: RestrictedItemBadgeProps) {
  if (category === 'none' && !minimumAge) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
        <BadgeCheck className="h-3.5 w-3.5" />
        Clear
      </span>
    );
  }

  const icon = category === 'fuel' ? <Ban className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />;
  const label = minimumAge ? `${minimumAge}+ ${categoryLabels[category]}` : categoryLabels[category];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
      {compact ? <AlertTriangle className="h-3.5 w-3.5" /> : icon}
      {label}
    </span>
  );
}
