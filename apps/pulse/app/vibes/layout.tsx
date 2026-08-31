import Link from 'next/link';
import { VibeSidebar } from './VibeSidebar';

export default function VibeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f0f0f1] font-sans text-[#1d2327]">
      <header className="sticky top-0 z-20 flex h-10 items-center justify-between bg-[#1d2327] px-3 text-sm text-[#f0f0f1] shadow-sm">
        <Link href="/vibes" className="font-semibold hover:text-white">Vibe CMS</Link>
        <Link href="/vibes/new" className="rounded bg-[#2271b1] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#135e96]">+ Add New</Link>
      </header>
      <div className="min-h-[calc(100vh-2.5rem)] lg:flex">
        <VibeSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
