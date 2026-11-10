import type { Metadata } from 'next';
import ArchitectureOverview from '@/components/architecture/ArchitectureOverview';

export const metadata: Metadata = {
  title: 'How Sunset Pulse Works',
  description: 'See how property search, local research, seller tools, and the Sunset Pulse Atlas work together.',
  alternates: { canonical: '/how-it-works' },
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#061017] text-white">
      <ArchitectureOverview title="How Sunset Pulse Works" headingLevel="h1" />
    </main>
  );
}
