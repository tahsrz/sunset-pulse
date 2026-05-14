import Lead from '@/models/Lead';
import Property from '@/models/Property';
import { LeadSchema } from '@/lib/core/validation';
import { generateHighStakesHook, getJamieResponse } from '@/lib/ai/jamie';
import { pulseRNG } from '@/lib/core/pulseRNG';
import { calculateLeadScore } from '@/lib/intelligence/leadIntelligence';
import { supabase } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/communication/telegram';

export interface ProcessedLeadResult {
  leadData: any;
  probability: number;
  tags: string[];
  jamieNotes: string;
  reengagementHook: any;
  leadCategory: string;
}

/**
 * Encapsulates the logic for processing new lead data, 
 * including probability scoring, AI analysis, and external sync.
 */
export const processLeadIntelligence = async (body: any): Promise<ProcessedLeadResult> => {
  const validation = LeadSchema.safeParse(body);
  if (!validation.success) {
    throw new Error('Validation failed');
  }

  const leadData = validation.data;
  const existingLead = await Lead.findOne({ email: leadData.email });

  // 1. Calculate Probability with Jitter
  let probability = calculateLeadScore(leadData, existingLead);
  const jitter = pulseRNG.range(-3, 3);
  probability = Math.round(probability + jitter);
  probability = Math.max(0, Math.min(probability, 99));

  // 2. Determine Category
  const property = await Property.findById(leadData.property);
  const isRV = property?.type === 'RV' || property?.type === 'RV Park';
  const leadCategory = leadData.leadCategory || (isRV ? 'RV' : 'Residential');

  // 3. Generate Tags
  const tags = leadData.tags || [];
  if (leadData.tourRequested) tags.push('TOUR-REQUEST');
  if (probability > 80) tags.push('HIGH-VALUE');
  if (isRV) tags.push('RV-ASSET');
  if (leadData.budget > 500000) tags.push('PREMIUM-TIER');

  // 4. Generate AI Intelligence Hooks
  const reengagementHook = await generateHighStakesHook(leadData, property);

  // Proactive Telegram Notification
  const topHook = reengagementHook?.a || reengagementHook?.b || "New high-stakes lead detected.";
  const notification = `🚀 *NEW LEAD ALERT*\n\n*Name:* ${leadData.name}\n*Probability:* ${probability}%\n*Top Hook:* ${topHook}\n\nView details in the Pulse Collective Command Center.`;
  await sendTelegramNotification(notification);

  // 5. Generate Jamie AI Notes
  const propertyInfo = property 
    ? `Property: ${property.name}, Location: ${property.location.city}, ${property.location.state}, Type: ${property.type}`
    : 'Unknown Property';

  const prompt = `Analyze this ${leadCategory} lead: ${leadData.name}. Interested in ${propertyInfo}. Budget: ${leadData.budget || 'Unknown'}. Probability: ${probability}%. Provide a professional summary of their intent.`;
  
  const response = await getJamieResponse([{ role: 'user', content: prompt }], property);
  
  let jamieNotes = '';
  if (typeof response === 'string') {
    jamieNotes = response;
  } else {
    // Consume the stream
    for await (const chunk of response) {
      jamieNotes += chunk.choices[0]?.delta?.content || '';
    }
  }

  return {
    leadData,
    probability,
    tags,
    jamieNotes,
    reengagementHook,
    leadCategory
  };
};

/**
 * Synchronizes lead data to the Supabase secondary grid.
 * Hardened with conflict resolution and integrity checks.
 */
export const syncLeadToSupabase = async (lead: any, retries = 2) => {
  try {
    const payload = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      property_id: lead.property?.toString(),
      budget: lead.budget,
      timeframe: lead.timeframe,
      probability: lead.probability,
      jamie_notes: lead.jamieNotes,
      reengagement_hook: lead.reengagementHook, // JSONB
      stage: lead.stage || 'New',
      last_activity: lead.lastActivity || new Date().toISOString()
    };

    const { error } = await supabase
      .from('leads')
      .upsert(payload, { 
        onConflict: 'email',
        ignoreDuplicates: false // We want to update existing leads
      });

    if (error) {
      console.error(`[SUPABASE_SYNC_ATTEMPT_FAILED]: ${error.message}`);
      if (retries > 0) {
        console.log(`Retrying sync... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, 1000));
        return await syncLeadToSupabase(lead, retries - 1);
      }
      throw error;
    }

    console.log(`[SUPABASE_SYNC_SUCCESS]: Lead ${lead.email} synchronized to grid.`);
  } catch (err: any) {
    console.error('[SUPABASE_SYNC_CRITICAL_FAILURE]:', err.message);
    // In a production tactical environment, we would queue this for later retry
  }
};
