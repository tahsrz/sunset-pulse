import connectDB from '@/lib/core/database';
import Lead from '@/models/Lead';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { getJamieReengagement } from '@/lib/ai/jamie';
import { applyDecay } from '@/lib/intelligence/leadIntelligence';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/core/apiResponse';

export const POST = async (request) => {
  try {
    await connectDB();
    const { leadId } = await request.json();

    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const lead = await Lead.findById(leadId).populate('property');
    if (!lead) {
      return notFoundResponse('Lead');
    }

    const currentScore = lead.probability;
    const decayedScore = applyDecay(currentScore, lead.lastActivity || lead.updatedAt);
    
    // Generate reactivation hooks
    const hooks = await getJamieReengagement(
      lead,
      lead.property,
      currentScore,
      decayedScore
    );

    // Update lead with the hooks and mark as re-engaged
    lead.reengagementHook = hooks;
    lead.status = 'contacted';
    lead.lastActivity = new Date();
    lead.probability = decayedScore;
    
    await lead.save();

    return successResponse({ 
      message: 'Re-activation hooks generated.', 
      hooks: hooks 
    });
  } catch (error) {
    return errorResponse('Failed to execute re-engagement protocol.', 500, error.message);
  }
};
