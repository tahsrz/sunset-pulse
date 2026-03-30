import '@/assets/styles/globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthProvider from '@/components/AuthProvider';
import { CartProvider } from '@/context/CartContext'; // Import your new context
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata = {
  title: 'Sunset Pulse | Real Estate & Grill',
  description: 'Find your dream home in North Texas and order the best burgers in Montague County.',
  keywords: 'rental, property, real estate, bowie tx, rhome tx, sunset grill, burgers',
};

const MainLayout = ({ children }) => {
  return (
    <AuthProvider>
      <CartProvider>
        <html lang='en'>
          <body>
            <div className='flex flex-col min-h-screen'>
              <Navbar />
              <main className='flex-grow'>
                {children}
              </main>
              <Footer />
            </div>
            <ToastContainer />
          </body>
        </html>
      </CartProvider>
    </AuthProvider>
  );
};

export default MainLayout;