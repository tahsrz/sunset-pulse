import React from 'react';
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
import JamieChat from '@/components/JamieChat';
import KeybindHandler from '@/components/KeybindHandler';
import JamieInsightsLoginToast from '@/components/JamieInsightsLoginToast';
import JamiePulseOverlay from '@/components/JamiePulseOverlay';
import DevPortal from '@/components/DevPortal';
import FeedbackWidget from '@/components/FeedbackWidget';
import { SiteConfig } from '@/models/SiteConfig';
import connectDB from '@/lib/core/database';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata = {
  title: 'Sunset Pulse | North Texas Intelligence Atlas',
  description: 'A living atlas for North Texas place memory, real estate intelligence, and market context.',
  keywords: 'north texas real estate, atlas pulse, idx search, property intelligence, sunset pulse',
  icons: {
    icon: '/next.svg',
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
  const tenantSite = headers().get('x-sunset-tenant');

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

  // 1. Fetch from Supabase (Primary)
  const supabase = createClient();
  const { data: sbConfig } = await supabase
    .from('site_config')
    .select('*')
    .eq('agent_id', 'taz-realty-001')
    .single();

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
      tagline: 'Quality Meat - Friendly Service',
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
  } else {
    // 2. Fallback to MongoDB (Legacy)
    try {
      await connectDB();
      const config: any = await SiteConfig.findOne({ agentId: 'taz-realty-001' }).lean();
      
      if (config) {
        branding = {
          ...fallbackBranding,
          ...(config.branding || {}),
          quadrants: {
            ...fallbackBranding.quadrants,
            ...(config.branding?.quadrants || {})
          }
        };
        // Deep merge for grill
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
    } catch (dbError) {
      console.error('Failed to connect to MongoDB fallback:', dbError);
      branding = fallbackBranding;
      intelligence = fallbackIntelligence;
    }
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
                  
                  <JamieChat />
                  <FeedbackWidget />
                  <DevPortal />
                  <KeybindHandler />
                  <JamieInsightsLoginToast />
                  <JamiePulseOverlay />
                  
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
