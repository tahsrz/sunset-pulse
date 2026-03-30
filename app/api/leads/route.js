import connectDB from '@/config/database';
import Lead from '@/models/Lead';
import Property from '@/models/Property';
import { getSessionUser } from '@/utils/getSessionUser';

export const GET = async () => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();

    // In a production app, we'd restrict this to Admin/Owner
    // For now, we'll allow access if logged in for testing
    if (!sessionUser || !sessionUser.userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const leads = await Lead.find({})
      .populate('property', 'name rates')
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify(leads), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};

export const POST = async (request) => {
  try {
    await connectDB();
    const data = await request.json();

    const newLead = new Lead(data);
    await newLead.save();

    return new Response(JSON.stringify({ message: 'Lead Captured' }), { status: 201 });
  } catch (error) {
    return new Response('Failed to capture lead', { status: 500 });
  }
};
