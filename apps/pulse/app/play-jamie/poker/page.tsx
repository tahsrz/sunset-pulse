import type { Metadata } from 'next';
import { JamiePokerGame } from '@/components/jamie-games/JamiePokerGame';

export const metadata: Metadata = {
  title: "Texas Hold'em with Jamie | Sunset Pulse",
  description: "Play a local heads-up Texas Hold'em hand against Jamie.",
};

export default function JamiePokerPage() {
  return <JamiePokerGame />;
}
