import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agent Launch Kit | Sunset Pulse',
  description: 'Agent branding is now managed from the primary Launch Kit workspace.',
};

export default function BrandingRedirectPage() {
  redirect('/admin/launch-kit');
}
