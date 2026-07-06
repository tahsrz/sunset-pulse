import type { Metadata } from 'next';
import { JamieTetrisGame } from '@/components/jamie-games/JamieTetrisGame';

export const metadata: Metadata = {
  title: 'Block Drop with Jamie | Sunset Pulse',
  description: 'Play a fast, local falling-block game against the stack with Jamie.',
};

export default function JamieTetrisPage() {
  return <JamieTetrisGame />;
}
