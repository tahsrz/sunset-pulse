import '@/assets/styles/globals.css'; // Path must exist in root/assets/styles/
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/context/ThemeProvider';
import JamieChat from '@/components/JamieChat';
import { SiteConfig } from '@/models/SiteConfig';
import connectDB from '@/config/database';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata = {
  title: 'Sunset Pulse | Real Estate & Intelligence',
  description: 'Find your dream home in North Texas, powered by Jamie AI.',
  keywords: 'rental, property, real estate, keller tx, rhome tx, investment',
};

/**
 * Root layout component for the application.
 * Establishes database connection and provides global context providers.
 */
const MainLayout = async ({ children }) => {
  await connectDB();

  const config = await SiteConfig.findOne({ agentId: 'taz-realty-001' }); 
  
  const branding = config?.branding || { 
    primaryColor: '#2563eb', 
    fontFamily: 'Inter', 
    siteName: 'Sunset Pulse' 
  };

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
              
              <ToastContainer />
            </ThemeProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
};

export default MainLayout;