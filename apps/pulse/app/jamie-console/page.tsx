import JamieVercelConsole from '@/components/chat/JamieVercelConsole';

export default function JamieConsolePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Sunset Pulse</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Jamie bot consolidation</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            A Vercel-style streaming bot surface backed by Jamie's shared property tools. This is the bridge between the current floating Jamie widget and a full assistant UI.
          </p>
        </div>

        <JamieVercelConsole />
      </div>
    </main>
  );
}
