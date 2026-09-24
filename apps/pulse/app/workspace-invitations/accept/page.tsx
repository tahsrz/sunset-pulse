import type { Metadata } from 'next';
import { AcceptWorkspaceInvitation } from '@/components/platform/AcceptWorkspaceInvitation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Accept workspace invitation',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function AcceptWorkspaceInvitationPage() {
  return <AcceptWorkspaceInvitation token="" />;
}
