'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeProvider';
import { 
  FaServer, FaRobot, FaCube, FaCode, FaPaintBrush, FaBolt, 
  FaDatabase, FaNetworkWired, FaMicrochip, FaShieldAlt, FaLayerGroup,
  FaFighterJet, FaLock 
} from 'react-icons/fa';

const ArchitecturePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isDevMode } = useTheme();
  const router = useRouter();

  const isSubscribed = user?.user_metadata?.isSubscribed;
  const hasAccess = isDevMode && isSubscribed;

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      // Small delay to allow session to settle
      const timer = setTimeout(() => {
        if (!hasAccess) router.push('/premium');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasAccess, authLoading, router]);

  if (authLoading) {
    return (
      <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center'>
        <div className='p-6 bg-red-500/10 rounded-full mb-8 border border-red-500/20 animate-pulse'>
          <FaLock className='text-6xl text-red-500' />
        </div>
        <h1 className='text-4xl font-black uppercase italic tracking-tighter text-white mb-4'>
          Access Denied
        </h1>
        <p className='text-slate-400 max-w-md mb-8 leading-relaxed'>
          Core Schematics are restricted to Premium Operators in Oversight Mode. 
          Please ensure your subscription is active and Dev Mode is enabled.
        </p>
        <button 
          onClick={() => router.push('/premium')}
          className='px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all'
        >
          Initialize Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 p-8 font-sans transition-all duration-500'>
      <header className='mb-12 border-b border-slate-800 pb-6'>
        <h1 className='text-6xl font-black tracking-tighter uppercase italic text-[var(--primary-color)]'>
          Core Schematics
        </h1>
        <p className='text-slate-400 font-mono text-sm mt-2'>
          [ ACCESS LEVEL: HIGH COMMANDER // SYSTEM: SUNSET PULSE V1.2.2 ]
        </p>
      </header>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-12 mb-20'>
        
        {/* SECTION 1: THE INFRASTRUCTURE GRID */}
        <section className='space-y-6'>
          <div className='flex items-center gap-4 text-blue-400'>
            <FaServer size={32} />
            <h2 className='text-3xl font-black uppercase tracking-tighter'>The Infrastructure Grid</h2>
          </div>
          
          <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
            <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
              <FaLayerGroup className='text-blue-500' /> Next.js 14 Framework
            </h3>
            <p className='text-sm text-slate-400 leading-relaxed mb-6'>
              The application leverages the full power of **Next.js 14 App Router**, utilizing Server Components for initial data reconnaissance and Client Components for the Agentic UI. 
              Our deployment strategy uses **Edge Runtime** for API routes to minimize latency during Jamie's real-time intelligence parsing.
            </p>
            <div className='grid grid-cols-2 gap-4 text-[10px] font-mono'>
              <div className='bg-black/40 p-3 rounded-xl border border-white/5'>
                <span className='text-blue-400 block mb-1'>DATA FETCHING</span>
                - Server-Side Rendering (SSR)<br/>
                - Dynamic Segment Config<br/>
                - Route Handlers (REST)
              </div>
              <div className='bg-black/40 p-3 rounded-xl border border-white/5'>
                <span className='text-blue-400 block mb-1'>AUTHENTICATION</span>
                - NextAuth.js Integration<br/>
                - Google OAuth 2.0<br/>
                - JWT Session Persistence
              </div>
            </div>
          </div>

          <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
            <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
              <FaDatabase className='text-blue-500' /> MongoDB Atlas Cluster
            </h3>
            <p className='text-sm text-slate-400 leading-relaxed mb-4'>
              A high-availability NoSQL grid storing tactical real estate data and lead intelligence. Our schemas are designed for high-speed cross-referencing between local commerce (Sunset Grill) and property listings.
            </p>
            <ul className='space-y-2 text-[10px] font-mono text-slate-500'>
              <li><span className='text-blue-300'>[Property]</span> - Multi-modal data including OBJ mesh URLs.</li>
              <li><span className='text-blue-300'>[Lead]</span> - Intelligence capture with Jamie's analytical notes.</li>
              <li><span className='text-blue-300'>[SiteConfig]</span> - The persistence layer for the Agentic UI branding.</li>
            </ul>
          </div>
        </section>

        {/* SECTION 2: THE AI INTELLIGENCE LAYER */}
        <section className='space-y-6'>
          <div className='flex items-center gap-4 text-green-400'>
            <FaRobot size={32} />
            <h2 className='text-3xl font-black uppercase tracking-tighter'>Jamie AI Intelligence Layer</h2>
          </div>

          <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
            <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
              <FaMicrochip className='text-green-500' /> Groq LPU Inference
            </h3>
            <p className='text-sm text-slate-400 leading-relaxed mb-6'>
              Jamie's reasoning is computed on **Groq's Language Processing Units (LPUs)**, delivering near-instant token generation. This allows the UI to morph at the speed of thought without traditional LLM lag.
            </p>
            <div className='bg-black/60 p-4 rounded-2xl border border-green-500/20 mb-6'>
              <div className='flex justify-between items-center mb-2'>
                <span className='text-[10px] font-black text-green-400'>MODEL: LLAMA-3.1-8B-INSTANT</span>
                <span className='text-[10px] font-mono text-slate-500'>TOKENS/SEC: 300+</span>
              </div>
              <div className='h-1 w-full bg-slate-800 rounded-full overflow-hidden'>
                <div className='h-full bg-green-500 w-[95%] animate-pulse' />
              </div>
            </div>
            <h4 className='text-xs font-bold uppercase tracking-widest mb-3'>Context Injection Pipeline</h4>
            <p className='text-xs text-slate-500 leading-relaxed'>
              Jamie is fed a constant stream of "Neighborhood Intel" (Sunset Grill menu items and traffic) and "Property Intel" (RentCast estimates and property specs). This creates a "Data Moat" that proves market dominance.
            </p>
          </div>

          <div className='bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl'>
            <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
              <FaPaintBrush className='text-green-500' /> Agentic UI Transformation
            </h3>
            <p className='text-sm text-slate-400 leading-relaxed mb-4'>
              Unlike static themes, Jamie operates on an **Optimistic UI Mutation Pipeline**. When a command is parsed, the system immediately updates the `ThemeProvider` state before syncing with the database.
            </p>
            <div className='bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-green-300'>
              // THE INJECTION FLOW<br/>
              1. NLP Command -&gt; Groq Parse<br/>
              2. Extract ---JSON--- Payload<br/>
              3. React Context Dispatch (updateBranding)<br/>
              4. DOM CSS Variable Injection (:root)<br/>
              5. Smooth CSS Transitions (500ms)
            </div>
          </div>
        </section>

        {/* SECTION 3: THE SP-RE 3D ENGINE */}
        <section className='col-span-1 xl:col-span-2 space-y-6'>
          <div className='flex items-center gap-4 text-orange-400'>
            <FaCube size={32} />
            <h2 className='text-3xl font-black uppercase tracking-tighter'>The SP-RE 3D Engine (Software Rasterizer)</h2>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
              <h4 className='font-bold mb-3 flex items-center gap-2'><FaNetworkWired size={12}/> Math & Matrices</h4>
              <p className='text-xs text-slate-400 leading-relaxed'>
                A custom implementation of 3D math using pure JavaScript. We utilize **Euler Rotation Matrices** for orientation and a **Projection Matrix** to transform 3D world coordinates into 2D canvas space.
              </p>
            </div>
            <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
              <h4 className='font-bold mb-3 flex items-center gap-2'><FaBolt size={12}/> Render Pipeline</h4>
              <p className='text-xs text-slate-400 leading-relaxed'>
                Our pipeline includes **Backface Culling** (dot product analysis) to skip invisible triangles and **Painter's Algorithm** for depth sorting, ensuring correct visual occlusion without a complex Z-buffer.
              </p>
            </div>
            <div className='bg-white/5 border border-white/10 p-6 rounded-2xl'>
              <h4 className='font-bold mb-3 flex items-center gap-2'><FaFighterJet size={12}/> Flight Physics</h4>
              <p className='text-xs text-slate-400 leading-relaxed'>
                The "Helicopter Mode" implements a momentum-based physics loop with **linear damping** and **angular inertia**, allowing for smooth, high-stakes aerial reconnaissance of property listings.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* FOOTER MESSAGE: THE SUNSET COLLECTIVE */}
      <footer className='border-t border-white/10 pt-12 pb-20'>
        <div className='max-w-4xl mx-auto text-center'>
          <div className='inline-block p-4 bg-[var(--primary-color)] text-white rounded-full mb-8 shadow-2xl'>
            <FaShieldAlt size={40} />
          </div>
          <h2 className='text-4xl font-black uppercase tracking-tighter italic mb-6'>
            Message from the Sunset Collective
          </h2>
          <div className='space-y-6 text-lg text-slate-400 font-serif italic leading-relaxed'>
            <p>
              "We do not build websites; we build intelligence grids. Sunset Pulse is the apex of real estate technology—a fusion of raw local commerce and elite AI reasoning."
            </p>
            <p>
              "By connecting Jamie to the core schematics, we have created a living architecture. One that breathes, morphs, and responds to the High Commander's intent. The street data is locked. The grid is active. The market belongs to those with the best intel."
            </p>
          </div>
          <div className='mt-12 flex flex-col items-center'>
            <div className='h-px w-24 bg-slate-800 mb-4' />
            <div className='text-[10px] font-mono tracking-[0.5em] uppercase text-slate-500'>
              Integrity // Intelligence // Dominance
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ArchitecturePage;
