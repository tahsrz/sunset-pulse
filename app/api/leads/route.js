import connectDB from '@/lib/core/database';
import Lead from '@/models/Lead';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { LeadSchema } from '@/lib/core/validation';
import { generateHighStakesHook, getJamieResponse } from '@/lib/ai/jamie';
import { pulseRNG } from '@/lib/core/pulseRNG';
import { calculateLeadScore, applyDecay, calculateVelocity } from '@/lib/intelligence/leadIntelligence';
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/core/apiResponse';

export const GET = async () => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const leads = await Lead.find({})
      .populate('property', 'name rates location type')
      .sort({ createdAt: -1 });

    const enrichedLeads = leads.map(lead => {
      const leadObj = lead.toObject();
      leadObj.probability = applyDecay(leadObj.probability, leadObj.lastActivity || leadObj.updatedAt);
      leadObj.engagementVelocity = calculateVelocity(leadObj);
      return leadObj;
    });

    return successResponse(enrichedLeads);
  } catch (error) {
    return errorResponse('Failed to fetch lead intelligence feed.', 500, error.message);
  }
};

export const POST = async (request) => {
  try {
    await connectDB();
    const body = await request.json();

    const validation = LeadSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    const leadData = validation.data;
    const existingLead = await Lead.findOne({ email: leadData.email });

    let probability = calculateLeadScore(leadData, existingLead);
    const jitter = pulseRNG.range(-3, 3);
    probability = Math.round(probability + jitter);
    probability = Math.max(0, Math.min(probability, 99));

    const property = await Property.findById(leadData.property);
    const isRV = property?.type === 'RV' || property?.type === 'RV Park';
    const leadCategory = leadData.leadCategory || (isRV ? 'RV' : 'Residential');

    // Tagging
    const tags = leadData.tags || [];
    if (leadData.tourRequested) tags.push('VIP-TOUR');
    if (probability > 80) tags.push('HIGH-VALUE');
    if (isRV) tags.push('RV-ENTHUSIAST');
    if (leadData.budget > 500000) tags.push('ESTATE-LEVEL');

    // Generate  Re-engagement Hooks A-Z
    const reengagementHook = await generateHighStakesHook(leadData, property);

    const propertyInfo = property 
      ? `Property: ${property.name}, Location: ${property.location.city}, ${property.location.state}, Type: ${property.type}`
      : 'Unknown Property';

    const jamieNotes = await getJamieResponse(
      `Analyze this ${leadCategory} lead: ${leadData.name} (${leadData.email}). They are interested in ${propertyInfo}. Budget: ${leadData.budget || 'Unknown'}. Timeframe: ${leadData.timeframe || 'Unknown'}. Tour Requested: ${leadData.tourRequested ? 'YES' : 'NO'}. Provide a high-stakes summary and mention if they are a hot lead based on their probability of ${probability}%?`,
      property
    );

    const newLead = new Lead({
      ...leadData,
      leadCategory,
      probability,
      jamieNotes,
      tags,
      reengagementHook,
      lastActivity: new Date()
    });

    await newLead.save();

    return successResponse({ message: 'Lead Captured', id: newLead._id }, 201);
  } catch (error) {
    return errorResponse('Failed to capture high-stakes lead data.', 500, error.message);
  }
};
