import '@/assets/styles/globals.css'; // Path must exist in root/assets/styles/
import Navbar from '@/components/Navbar';
import GlobalMarketPulse from '@/components/GlobalMarketPulse';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/context/ThemeProvider';
import JamieChat from '@/components/JamieChat';
import KeybindHandler from '@/components/KeybindHandler';
import AdvancedModeIndicator from '@/components/AdvancedModeIndicator';
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

/**
 * Root layout component for the application.
 * Establishes database connection and provides global context providers.
 */
const MainLayout = async ({ children }) => {
  // 1. Fetch from Supabase (Primary)
  const supabase = createClient();
  const { data: sbConfig } = await supabase
    .from('site_config')
    .select('*')
    .eq('agent_id', 'taz-realty-001')
    .single();

  let branding;
  if (sbConfig) {
    branding = sbConfig.branding;
  } else {
    // 2. Fallback to MongoDB (Legacy)
    await connectDB();
    const config = await SiteConfig.findOne({ agentId: 'taz-realty-001' }).lean();
    branding = config?.branding ? {
      primaryColor: config.branding.primaryColor,
      fontFamily: config.branding.fontFamily,
      siteName: config.branding.siteName,
      borderRadius: '8px',
      quadrants: {
        topLeft: { background: 'transparent', color: 'inherit' },
        topRight: { background: 'transparent', color: 'inherit' },
        bottomLeft: { background: 'transparent', color: 'inherit' },
        bottomRight: { background: 'transparent', color: 'inherit' },
      }
    } : { 
      primaryColor: '#2563eb', 
      fontFamily: 'Inter', 
      siteName: 'Sunset Pulse',
      borderRadius: '8px',
      quadrants: {
        topLeft: { background: 'transparent', color: 'inherit' },
        topRight: { background: 'transparent', color: 'inherit' },
        bottomLeft: { background: 'transparent', color: 'inherit' },
        bottomRight: { background: 'transparent', color: 'inherit' },
      }
    };
  }

  return (
    <html lang='en'>
      <body className='bg-gray-50'>
        <AuthProvider>
          <CartProvider>
            <ThemeProvider branding={branding}>
              <div className='flex flex-col min-h-screen'>
                <Navbar />
                <main className='flex-grow'>
                  {children}
                </main>
                <Footer />
              </div>
              
              <JamieChat />
              <KeybindHandler />
              <AdvancedModeIndicator />
              
              <ToastContainer />
            </ThemeProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
};

export default MainLayout;
