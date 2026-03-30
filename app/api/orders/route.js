import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';

export const POST = async (request) => {
  try {
    await connectDB();
    const { items, totalAmount } = await request.json();
    const sessionUser = await getSessionUser();

    const orderData = {
      items,
      totalAmount,
    };

    if (sessionUser) {
      orderData.user = sessionUser.userId;
    }

    const newOrder = new Order(orderData);
    await newOrder.save();

    return new Response(JSON.stringify({ message: 'Order Placed' }), { status: 201 });
  } catch (error) {
    return new Response('Failed to place order', { status: 500 });
  }
};