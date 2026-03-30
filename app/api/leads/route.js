import connectDB from '@/config/database';
import Lead from '@/models/Lead';
import Property from '@/models/Property';
import { getSessionUser } from '@/utils/getSessionUser';
import { LeadSchema } from '@/lib/validation';
import { getJamieResponse } from '@/lib/ai/jamie';

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
    console.error('[API_LEADS_GET] Error:', error);
    return new Response('Something went wrong', { status: 500 });
  }
};

export const POST = async (request) => {
  try {
    await connectDB();
    const body = await request.json();

    // Validate the incoming data
    const validation = LeadSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      return new Response(JSON.stringify({ message: 'Validation failed', errors }), { status: 400 });
    }

    const leadData = validation.data;

    // --- ENHANCED LEAD SCORING ---
    let probability = 50; // Base probability

    // 1. Phone Number availability (+15%)
    if (leadData.phone && leadData.phone.trim() !== '') {
      probability += 15;
    }

    // 2. IDX Viewed status (+20%)
    if (leadData.idxViewed) {
      probability += 20;
    }

    // 3. Repeat Lead Check (+10%)
    const existingLead = await Lead.findOne({ email: leadData.email });
    if (existingLead) {
      probability += 10;
    }

    // Cap at 99% until human verified
    probability = Math.min(probability, 99);

    // --- JAMIE NOTES GENERATION ---
    const property = await Property.findById(leadData.property);
    const propertyInfo = property 
      ? `Property: ${property.name}, Location: ${property.location.city}, ${property.location.state}, Type: ${property.type}`
      : 'Unknown Property';

    const jamieNotes = await getJamieResponse(
      `Analyze this lead: ${leadData.name} (${leadData.email}). They are interested in ${propertyInfo}. Provide a high-stakes summary and mention if they are a 'hot' lead based on their probability of ${probability}%.`,
      property
    );

    const newLead = new Lead({
      ...leadData,
      probability,
      jamieNotes
    });

    await newLead.save();

    return new Response(JSON.stringify({ message: 'Lead Captured', id: newLead._id }), { status: 201 });
  } catch (error) {
    console.error('[API_LEADS_POST] Error:', error);
    return new Response('Failed to capture lead', { status: 500 });
  }
};
