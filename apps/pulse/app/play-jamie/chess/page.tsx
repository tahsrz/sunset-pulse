import type { Metadata } from 'next';
import { JamieChessGame } from '@/components/jamie-games/JamieChessGame';

export const metadata: Metadata = {
  title: 'Chess with Jamie | Sunset Pulse',
  description: 'Play a complete local chess match against Jamie.',
};

export default function JamieChessPage() {
  return <JamieChessGame />;
}
