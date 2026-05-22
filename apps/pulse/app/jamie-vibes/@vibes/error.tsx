'use client';

import { SlotError } from '@/components/jamie-vibes/SlotError';

export default function VibesSlotError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SlotError title="Vibe dictionary failed" error={error} reset={reset} />;
}
