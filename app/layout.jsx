import '@/assets/styles/globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/context/ThemeProvider'; // New
import JamieChat from '@/components/JamieChat'; // New
import { SiteConfig } from '@/models/SiteConfig'; // New
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata = {
  title: 'Sunset Pulse | Real Estate & Grill',
  description: 'Find your dream home in North Texas and order the best burgers in Montague County.',
  keywords: 'rental, property, real estate, bowie tx, rhome tx, sunset grill, burgers',
};

const MainLayout = async ({ children }) => {
  // Fetch the branding config for the current agent/user
  // Jamie will update this document in MongoDB based on voice commands
  const config = await SiteConfig.findOne({ agentId: 'taz-realty-001' }); 
  const branding = config?.branding || { 
    primaryColor: '#2563eb', 
    fontFamily: 'Inter', 
    siteName: 'Sunset Pulse' 
  };

  return (
    <html lang='en'>
      <body>
        <AuthProvider>
          <CartProvider>
            {/* ThemeProvider sits here to inject CSS variables based on Jamie's choices */}
            <ThemeProvider branding={branding}>
              <div className='flex flex-col min-h-screen'>
                <Navbar />
                <main className='flex-grow'>
                  {children}
                </main>
                <Footer />
              </div>
              
              {/* Jamie floats on every page, ready to help or edit */}
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