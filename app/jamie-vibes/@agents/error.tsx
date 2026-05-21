'use client';

import { SlotError } from '@/components/jamie-vibes/SlotError';

export default function AgentsSlotError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SlotError title="Agent mesh failed" error={error} reset={reset} />;
}
