export const dynamic = 'force-dynamic';
import connectDB from '@/lib/core/database';
import Lead from '@/models/Lead';
import type { LeadDocument } from '@/models/types';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { applyDecay, calculateVelocity } from '@/lib/intelligence/leadIntelligence';
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { supabase } from '@/lib/supabase';
import { notifyProcessedLead, processLeadIntelligence, syncLeadToSupabase } from '@/lib/intelligence/leadProcessor';
import { LeadSchema } from '@/lib/core/validation';
import mongoose from 'mongoose';

export const GET = async () => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to access lead intelligence.');
    }
    if (sessionUser.role !== 'admin' && sessionUser.role !== 'operator') {
      return errorResponse('Lead intelligence access requires an operator account.', 403);
    }

    //  Fetch from MongoDB & Enrich
    const leads = await Lead.find({})
      .populate('property', 'name rates location type')
      .sort({ createdAt: -1 });

    const enrichedLeads = leads.map((lead: LeadDocument) => {
      const leadObj = lead.toObject();
      leadObj.probability = applyDecay(leadObj.probability, leadObj.lastActivity || leadObj.updatedAt);
      leadObj.engagementVelocity = calculateVelocity(leadObj);
      return leadObj;
    });

    // Fetch from Supabase for grid consistency
    const { data: supabaseLeads } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    //  Merge streams by email to prevent duplication
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
    
    if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
      const limitResponse = await applyApiRateLimit(rateLimitToken, 3);
      if (limitResponse) return limitResponse;
    }

    const body = await request.json();

    //  Validate Schema
    const validation = LeadSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    // Check if email already registered in MongoDB
    const existingLead = await Lead.findOne({ email: validation.data.email });
    if (existingLead) {
      return errorResponse('This email is already registered.', 400);
    }

    // E2E mock leads use synthetic property IDs; keep persistence deterministic without
    // asking the intelligence pipeline to hydrate a non-existent Mongo ObjectId.
    const intelligence = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'
      ? {
          leadData: { ...validation.data, property: new mongoose.Types.ObjectId('650c8e2b1f4e1a2b3c4d5e6f') },
          probability: validation.data.probability ?? 50,
          tags: [],
          jamieNotes: '',
          reengagementHook: '',
          leadCategory: 'Residential',
        }
      : await processLeadIntelligence(body);
    const { leadData, probability, tags, jamieNotes, reengagementHook, leadCategory } = intelligence;

    //  Persist to Mongo
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

    //  Synchronize to Supabase
    let synchronized = true;
    try {
      await syncLeadToSupabase(newLead);
    } catch (syncError) {
      synchronized = false;
      console.error('[LEAD_SUPABASE_SYNC_DEFERRED]:', syncError);
    }
    if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
      try {
        await notifyProcessedLead(intelligence, intelligence.propertyName);
      } catch (notificationError) {
        console.error('[LEAD_NOTIFICATION_FAILURE]:', notificationError);
      }
    }

    return successResponse({ message: 'Lead successfully integrated.', id: newLead._id, synchronized }, 201);
  } catch (error: any) {
    console.error('[LEAD_POST_FAILURE]:', error);
    return errorResponse('Failed to process lead intelligence.', 500, error.message);
  }
};
