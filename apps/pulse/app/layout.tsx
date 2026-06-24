import React from 'react';
import type { Metadata } from 'next';
import '@/assets/styles/globals.css'; 
import Navbar from '@/components/Navbar';
import TRECConsumerNotice from '@/components/TRECConsumerNotice';
import GlobalMarketPulse from '@/components/GlobalMarketPulse';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/context/ThemeProvider';
import { JamiePulseProvider } from '@/context/JamiePulseContext';
import { VibeProvider } from '@/context/VibeContext';
import KeybindHandler from '@/components/KeybindHandler';
import ClientWidgets from '@/components/ClientWidgets';
import { SiteConfig } from '@/models/SiteConfig';
import connectDB from '@/lib/core/database';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sunsetpulse.app'),
  title: 'Sunset Pulse | North Texas Intelligence Atlas',
  description: 'A living atlas for North Texas place memory, real estate intelligence, and market context.',
  applicationName: 'Sunset Pulse',
  keywords: 'north texas real estate, atlas pulse, idx search, property intelligence, sunset pulse',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/images/logo.png',
  },
  openGraph: {
    title: 'Sunset Pulse | North Texas Intelligence Atlas',
    description: 'Real estate intelligence, grill ordering, scheduling, voice relay, and local market memory in one live operations platform.',
    url: 'https://sunsetpulse.app',
    siteName: 'Sunset Pulse',
    images: [
      {
        url: '/images/logo.png',
        width: 512,
        height: 512,
        alt: 'Sunset Pulse',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Sunset Pulse',
    description: 'North Texas intelligence atlas and operations platform.',
    images: ['/images/logo.png'],
  },
};

interface Branding {
  primaryColor: string;
  fontFamily: string;
  siteName: string;
  borderRadius: string;
  navBackground?: string;
  mainBackground?: string;
  quadrants: {
    topLeft: { background: string; color: string };
    topRight: { background: string; color: string };
    bottomLeft: { background: string; color: string };
    bottomRight: { background: string; color: string };
  };
}

interface IntelligenceConfig {
  grill: {
    name: string;
    tagline: string;
    coordinates: [number, number];
    address: string;
    mapUrl?: string;
  };
}

/**
 * Root layout component for the application.
 * Establishes database connection and provides global context providers.
 */
const MainLayout = async ({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) => {
  const requestHeaders = await headers();
  const tenantSite = requestHeaders.get('x-sunset-tenant');

  if (tenantSite) {
    return (
      <html lang='en'>
        <body className='waterlily-surface antialiased selection:bg-cyan-200 selection:text-slate-950'>
          {children}
          {modal}
        </body>
      </html>
    );
  }

  const sbConfigLookup = await loadSupabaseSiteConfig();
  const sbConfig = sbConfigLookup.data;

  // Define default branding as a fallback
  const fallbackBranding: Branding = {
    primaryColor: '#3b82f6',
    fontFamily: 'Inter',
    siteName: 'Sunset Pulse',
    borderRadius: '12px',
    navBackground: '#0f172a', // Slate 900
    mainBackground: '#0f172a', // Slate 900 - Unified with Navbar
    quadrants: {
      topLeft: { background: 'transparent', color: 'inherit' },
      topRight: { background: 'transparent', color: 'inherit' },
      bottomLeft: { background: 'transparent', color: 'inherit' },
      bottomRight: { background: 'transparent', color: 'inherit' },
    }
  };

  const fallbackIntelligence: IntelligenceConfig = {
    grill: {
      name: 'Sunset Gas & Grill',
      tagline: 'Fresh Never Frozen Meat | Ask Us To Look At It!',
      coordinates: [-97.766724, 33.453823],
      address: '101 S. Council, Sunset, TX 76270'
    }
  };

  let branding: Branding;
  let intelligence: IntelligenceConfig;
  
  if (sbConfig) {
    // Merge Supabase branding with fallback
    branding = {
      ...fallbackBranding,
      ...(sbConfig.branding || {}),
      quadrants: {
        ...fallbackBranding.quadrants,
        ...(sbConfig.branding?.quadrants || {})
      }
    };
    // Merge Supabase intelligence with fallback (Deep merge for grill)
    intelligence = {
      ...fallbackIntelligence,
      ...(sbConfig.intelligence || {}),
      grill: {
        ...fallbackIntelligence.grill,
        ...(sbConfig.intelligence?.grill || {})
      }
    };
  } else if (!sbConfigLookup.timedOut) {
    const config: any = await loadLegacySiteConfig();

    if (config) {
      branding = {
        ...fallbackBranding,
        ...(config.branding || {}),
        quadrants: {
          ...fallbackBranding.quadrants,
          ...(config.branding?.quadrants || {})
        }
      };
      intelligence = {
        ...fallbackIntelligence,
        ...(config.intelligence || {}),
        grill: {
          ...fallbackIntelligence.grill,
          ...(config.intelligence?.grill || {})
        }
      };
    } else {
      branding = fallbackBranding;
      intelligence = fallbackIntelligence;
    }
  } else {
    branding = fallbackBranding;
    intelligence = fallbackIntelligence;
  }

  return (
    <html lang='en'>
      <body className='waterlily-surface antialiased selection:bg-cyan-200 selection:text-slate-950'>
        <AuthProvider>
          <CartProvider>
            <ThemeProvider branding={branding} intelligence={intelligence} agentId={sbConfig?.agent_id || 'taz-realty-001'}>
              <VibeProvider>
                <JamiePulseProvider>
                  <div className='flex min-h-screen flex-col bg-[#06131d]/30'>
                    <TRECConsumerNotice />
                    <GlobalMarketPulse />
                    <Navbar />
                    <main className='flex-grow'>
                      {children}
                    </main>
                    {modal}
                    <Footer />
                  </div>
                  
                  <ClientWidgets />
                  <KeybindHandler />
                  <ToastContainer />
                </JamiePulseProvider>
              </VibeProvider>
            </ThemeProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
};

export default MainLayout;

async function loadSupabaseSiteConfig() {
  const fallbackTimeoutMs = 1500;
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const siteConfigLookup = (async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('site_config')
        .select('*')
        .eq('agent_id', 'taz-realty-001')
        .maybeSingle();

      if (error && !timedOut) {
        console.warn('Supabase site config lookup failed; checking legacy fallback.', error.message);
      }

      return data ?? null;
    } catch (configError) {
      if (!timedOut) {
        console.warn('Supabase site config lookup failed; checking legacy fallback.', configError);
      }
      return null;
    }
  })();

  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      console.warn(`Supabase site config lookup timed out after ${fallbackTimeoutMs}ms; using default branding.`);
      resolve(null);
    }, fallbackTimeoutMs);
  });

  const config = await Promise.race([siteConfigLookup, timeout]);
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return {
    data: config,
    timedOut
  };
}

async function loadLegacySiteConfig() {
  const fallbackTimeoutMs = 1500;
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const legacyLookup = (async () => {
    try {
      await connectDB();
      return await SiteConfig.findOne({ agentId: 'taz-realty-001' }).lean();
    } catch (dbError) {
      if (!timedOut) {
        console.error('Failed to connect to MongoDB fallback:', dbError);
      }
      return null;
    }
  })();

  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      console.warn(`MongoDB site config fallback timed out after ${fallbackTimeoutMs}ms; using default branding.`);
      resolve(null);
    }, fallbackTimeoutMs);
  });

  const config = await Promise.race([legacyLookup, timeout]);
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return config;
}
