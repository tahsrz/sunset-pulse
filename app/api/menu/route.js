import connectDB from '@/config/database';
import MenuItem from '@/models/MenuItem';

export const GET = async (request) => {
  try {
    await connectDB();

    const menuItems = await MenuItem.find({});

    return new Response(JSON.stringify(menuItems), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};