import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Lead from '@/models/Lead';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/core/apiResponse';

/**
 * POST /api/leads/reengage
 * Attaches a briefing URL to a lead's reengagement_hook.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { leadId, briefingUrl, notes } = await req.json();

    if (!leadId || !briefingUrl) {
      return errorResponse('Lead ID and Briefing URL are required.', 400);
    }

    const lead = await Lead.findById(leadId);
    if (!lead) return notFoundResponse('Lead');

    // Update the JSONB-style reengagement_hook
    lead.reengagement_hook = {
      type: 'VIDEO_BRIEFING',
      url: briefingUrl,
      sentAt: new Date(),
      notes: notes || 'Personalized property intelligence briefing.'
    };

    await lead.save();

    console.log(`[REENGAGE] Briefing attached to lead: ${lead.email}`);

    return successResponse({ 
      message: 'Briefing successfully attached to lead.',
      lead: lead.email 
    });

  } catch (error: any) {
    console.error('Reengage API Error:', error);
    return errorResponse('Failed to attach briefing.', 500, error.message);
  }
}
