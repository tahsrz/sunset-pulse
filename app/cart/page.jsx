'use client';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { FaTrash, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

const CartPage = () => {
  const { cart, removeFromCart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          totalAmount: cartTotal,
        }),
      });

      if (res.status === 201) {
        toast.success('Order sent to the grill!');
        if (clearCart) clearCart(); // Clear the tray after successful order
        router.push('/'); // Redirect home or to a "Thank You" page
      } else {
        toast.error('Something went wrong with the order.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Could not connect to the server.');
    }
  };

  return (
    <section className='px-4 py-6'>
      <div className='container-xl lg:container m-auto max-w-3xl'>
        <div className='bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0'>
          <h1 className='text-3xl font-bold mb-6 text-blue-600 font-serif'>
            Sunset Grill Order
          </h1>

          {cart.length === 0 ? (
            <div className='text-center py-10'>
              <p className='text-xl text-gray-600 mb-6'>Your tray is empty!</p>
              <Link
                href='/grill'
                className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded'
              >
                Go to the Grill
              </Link>
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <div
                  key={item.id}
                  className='flex items-center justify-between border-b py-4'
                >
                  <div className='flex-1'>
                    <h2 className='text-lg font-bold'>{item.name}</h2>
                    <p className='text-gray-600'>
                      ${item.price.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <div className='flex items-center gap-4'>
                    <span className='font-bold text-lg'>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className='text-red-500 hover:text-red-700 transition-colors'
                      aria-label='Remove item'
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}

              <div className='mt-8 pt-4 border-t border-gray-200'>
                <div className='flex justify-between text-2xl font-bold text-gray-800'>
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                <div className='mt-8 flex flex-col md:flex-row gap-4'>
                  <Link
                    href='/grill'
                    className='flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-colors'
                  >
                    <FaArrowLeft className='mr-2' /> Add More Food
                  </Link>
                  <button
                    onClick={handleCheckout}
                    className='flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-lg transition-transform active:scale-95'
                  >
                    Place Order (Pay at Counter)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default CartPage;
