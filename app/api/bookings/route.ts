import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Booking from '@/models/Booking';
import Lead from '@/models/Lead';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

// GET /api/bookings
export const GET = async (request: NextRequest) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const role = request.nextUrl.searchParams.get('role');

    let bookings;
    if (role === 'agent') {
      // Fetch all bookings for properties owned by this user
      const userProperties = await Property.find({ owner: userId }).select('_id');
      const propertyIds = userProperties.map(p => p._id);
      bookings = await Booking.find({ property: { $in: propertyIds } })
        .populate('property')
        .populate('user', 'username email image')
        .sort({ checkIn: -1 });
    } else {
      // Fetch bookings made BY this user
      bookings = await Booking.find({ user: userId }).populate('property');
    }

    return successResponse({ bookings });
  } catch (error: any) {
    return errorResponse('Failed to fetch booking history.', 500, error.message);
  }
};

// POST /api/bookings
export const POST = async (request: NextRequest) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId, user } = sessionUser as any; // Assuming sessionUser has email/name or need to fetch user
    const { propertyId, checkIn, checkOut, totalPrice, guests, rvType, rvLength, beds, baths } = await request.json();

    const bookingData = {
      property: propertyId,
      user: userId,
      checkIn,
      checkOut,
      guests: guests || 1,
      totalPrice,
      specifications: {
        rvType,
        rvLength,
        beds,
        baths,
      },
    };

    const newBooking = new Booking(bookingData);
    await newBooking.save();

    // Auto-capture Lead upon booking
    const property = await Property.findById(propertyId);
    const isRV = property?.type === 'RV' || property?.type === 'RV Park';
    
    // Attempt to find or create lead
    // use the email from the session if available, otherwise we might need the user model
    const userEmail = user?.email || (sessionUser as any).email;
    const userName = user?.name || (sessionUser as any).name || 'Valued Client';

    if (userEmail) {
      await Lead.findOneAndUpdate(
        { email: userEmail, property: propertyId },
        {
          name: userName,
          email: userEmail,
          property: propertyId,
          leadCategory: isRV ? 'RV' : 'Residential',
          status: 'contacted',
          probability: 100,
          $push: { tags: 'Booked' },
          jamieNotes: `AUTO_INTEL: User confirmed a booking for $${totalPrice.toLocaleString()}. Deployment period: ${checkIn} to ${checkOut}.`,
          lastActivity: new Date()
        },
        { upsert: true, new: true }
      );
    }

    return successResponse({ message: 'Reservation locked in.', id: newBooking._id }, 201);
  } catch (error: any) {
    return errorResponse('Critical failure in reservation deployment.', 500, error.message);
  }
};
