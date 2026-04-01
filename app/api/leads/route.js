import connectDB from '@/config/database';
import Lead from '@/models/Lead';
import Property from '@/models/Property';
import { getSessionUser } from '@/utils/getSessionUser';
import { LeadSchema } from '@/lib/validation';
import { getJamieResponse } from '@/lib/ai/jamie';
import { pulseRNG } from '@/utils/pulseRNG';

export const GET = async () => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();

    // In a production app restrict this to Admin/Owner
    // 
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

    // Validate incoming data
    const validation = LeadSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      return new Response(JSON.stringify({ message: 'Validation failed', errors }), { status: 400 });
    }

    const leadData = validation.data;

    // --- ENHANCED LEAD SCORING V5.0  ---
    // SUNSETPULSE Formula: Score = round( (min(Views, 20)*10 + min(ChatMins, 30)*5) * (TourRequest ? 3.0 : 1.0) )
    
    const viewPoints = Math.min(leadData.views || 0, 20) * 10;
    const chatPoints = Math.min(leadData.chatMinutes || 0, 30) * 5;
    const baseIntent = viewPoints + chatPoints;
    
    const hotMultiplier = leadData.tourRequested ? 3.0 : 1.0;
    
    // Calculate raw probability/score (0-100 scale for UI consistency)
    let probability = Math.round(baseIntent * hotMultiplier);

    // 1. Phone Number bonus (+15 points)
    if (leadData.phone && leadData.phone.trim() !== '') {
      probability += 15;
    }

    // 2. Repeat Lead Check (+10 points)
    const existingLead = await Lead.findOne({ email: leadData.email });
    if (existingLead) {
      probability += 10;
    }

    // --- PULSE_RNG JITTER PROTOCOL ---
    // Use geometric randomness to add "human" variance (+/- 3 points)
    const jitter = pulseRNG.range(-3, 3);
    probability = Math.round(probability + jitter);

    // Cap at 99% until human verified
    probability = Math.max(0, Math.min(probability, 99));

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
