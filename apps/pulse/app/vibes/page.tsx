import { VibeList } from './VibeList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vibes | Sunset Pulse', description: 'Manage published and draft vibe systems.' };

export default function VibesPage() {
  return <VibeList />;
}
