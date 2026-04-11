import React from 'react';
import '@/assets/styles/globals.css'; 
import Navbar from '@/components/Navbar';
import GlobalMarketPulse from '@/components/GlobalMarketPulse';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/context/ThemeProvider';
import JamieChat from '@/components/JamieChat';
import KeybindHandler from '@/components/KeybindHandler';
import JamieInsightsLoginToast from '@/components/JamieInsightsLoginToast';
import DevPortal from '@/components/DevPortal';
import { SiteConfig } from '@/models/SiteConfig';
import connectDB from '@/lib/core/database';
import { createClient } from '@/utils/supabase/server';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata = {
  title: 'Sunset Pulse | Real Estate & Intelligence',
  description: 'Find your dream home in North Texas, powered by Jamie AI.',
  keywords: 'rental, property, real estate, keller tx, rhome tx, investment',
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

/**
 * Root layout component for the application.
 * Establishes database connection and provides global context providers.
 */
const MainLayout = async ({ children }: { children: React.ReactNode }) => {
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

  let branding: Branding;
  
  if (sbConfig && sbConfig.branding) {
    // Merge Supabase branding with fallback to ensure all properties exist
    branding = {
      ...fallbackBranding,
      ...sbConfig.branding,
      quadrants: {
        ...fallbackBranding.quadrants,
        ...(sbConfig.branding.quadrants || {})
      }
    };
  } else {
    // 2. Fallback to MongoDB (Legacy)
    try {
      await connectDB();
      const config = await SiteConfig.findOne({ agentId: 'taz-realty-001' }).lean();
      
      if (config && config.branding) {
        branding = {
          ...fallbackBranding,
          ...config.branding,
          quadrants: {
            ...fallbackBranding.quadrants,
            ...(config.branding.quadrants || {})
          }
        };
      } else {
        branding = fallbackBranding;
      }
    } catch (dbError) {
      console.error('Failed to connect to MongoDB fallback:', dbError);
      branding = fallbackBranding;
    }
  }

  return (
    <html lang='en'>
      <body className='bg-slate-950'>
        <AuthProvider>
          <CartProvider>
            <ThemeProvider branding={branding}>
              <div className='flex flex-col min-h-screen'>
                <GlobalMarketPulse />
                <Navbar />
                <main className='flex-grow'>
                  {children}
                </main>
                <Footer />
              </div>
              
              <JamieChat />
              <DevPortal />
              <KeybindHandler />
              <JamieInsightsLoginToast />
              
              <ToastContainer />
            </ThemeProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
};

export default MainLayout;
