import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

export const POST = async (request: NextRequest) => {
  try {
    await connectDB();
    const { items, totalAmount } = await request.json();
    const sessionUser = await getSessionUser();

    const orderData: any = {
      items,
      totalAmount,
    };

    if (sessionUser && sessionUser.userId) {
      orderData.user = sessionUser.userId;
    }

    const newOrder = new Order(orderData);
    await newOrder.save();

    return successResponse({ message: 'Order processed successfully.' }, 201);
  } catch (error: any) {
    return errorResponse('Failed to process order.', 500, error.message);
  }
};
