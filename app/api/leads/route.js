import connectDB from '@/lib/core/database';
import Lead from '@/models/Lead';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { applyDecay, calculateVelocity } from '@/lib/intelligence/leadIntelligence';
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { supabase } from '@/lib/supabase';
import { processLeadIntelligence, syncLeadToSupabase } from '@/lib/intelligence/leadProcessor';
import { LeadSchema } from '@/lib/core/validation';

export const GET = async () => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to access lead intelligence.');
    }

    // 1. Fetch from MongoDB & Enrich
    const leads = await Lead.find({})
      .populate('property', 'name rates location type')
      .sort({ createdAt: -1 });

    const enrichedLeads = leads.map(lead => {
      const leadObj = lead.toObject();
      leadObj.probability = applyDecay(leadObj.probability, leadObj.lastActivity || leadObj.updatedAt);
      leadObj.engagementVelocity = calculateVelocity(leadObj);
      return leadObj;
    });

    // 2. Fetch from Supabase for grid consistency
    const { data: supabaseLeads } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    // 3. Merge streams by email to prevent duplication
    const finalLeads = [...enrichedLeads];
    if (supabaseLeads) {
      supabaseLeads.forEach(sl => {
        if (!finalLeads.find(l => l.email === sl.email)) {
          finalLeads.push({
            ...sl,
            _id: sl.id,
            mongo: false
          });
        }
      });
    }

    return successResponse(finalLeads);
  } catch (error: any) {
    return errorResponse('Failed to retrieve lead data feed.', 500, error.message);
  }
};

export const POST = async (request: Request) => {
  try {
    await connectDB();
    
    // Rate Limiting: 3 entries per minute
    const sessionUser = await getSessionUser();
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitToken = sessionUser?.userId || ip;
    
    const limitResponse = await applyApiRateLimit(rateLimitToken, 3);
    if (limitResponse) return limitResponse;

    const body = await request.json();

    // 1. Validate Schema
    const validation = LeadSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    // 2. Process Intelligence (Probability, Tags, AI Analysis)
    const { leadData, probability, tags, jamieNotes, reengagementHook, leadCategory } = await processLeadIntelligence(body);

    // 3. Persist to Primary Data Store (MongoDB)
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

    // 4. Synchronize to Secondary Grid (Supabase)
    await syncLeadToSupabase(newLead);

    return successResponse({ message: 'Lead successfully integrated.', id: newLead._id }, 201);
  } catch (error: any) {
    console.error('[LEAD_POST_FAILURE]:', error);
    return errorResponse('Failed to process lead intelligence.', 500, error.message);
  }
};
