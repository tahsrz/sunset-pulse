import type { Metadata } from 'next';
import { JamieVolleyGame } from '@/components/jamie-games/JamieVolleyGame';

export const metadata: Metadata = {
  title: 'Sunset Volley with Jamie | Sunset Pulse',
  description: 'Play a local beach volleyball rally game against Jamie.',
};

export default function JamieVolleyPage() {
  return <JamieVolleyGame />;
}
