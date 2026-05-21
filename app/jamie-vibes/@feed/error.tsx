'use client';

import { SlotError } from '@/components/jamie-vibes/SlotError';

export default function FeedSlotError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SlotError title="Jamie feed failed" error={error} reset={reset} />;
}
