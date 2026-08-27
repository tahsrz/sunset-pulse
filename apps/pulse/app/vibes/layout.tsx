import { VibeSidebar } from './VibeSidebar';

export default function VibeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <VibeSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
