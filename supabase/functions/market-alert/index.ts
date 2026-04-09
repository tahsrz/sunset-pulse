import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { anomaly } = await req.json()
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log(`[MARKET_ALERT_PROTOCOL] Processing anomaly: ${anomaly.type} in ${anomaly.location}`);

    // Logic: Find leads interested in this location via metadata
    // Using Postgres JSONB containment operator via .contains()
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, email, reengagement_hook, metadata')
      .contains('metadata', { location_interest: anomaly.location });

    if (error) throw error;

    console.log(`Found ${leads?.length || 0} leads to alert via metadata profiling.`);

    const updates = [];
    for (const lead of (leads || [])) {
      const currentHooks = lead.reengagement_hook || {};
      
      // Inject new tactical hook based on anomaly
      const hookKey = `m_${anomaly.type.toLowerCase().substring(0, 3)}_${Date.now()}`;
      currentHooks[hookKey] = `MARKET_ALERT: ${anomaly.type} in ${anomaly.location}. Change: ${anomaly.change}. Source: ${anomaly.source}`;
      
      updates.push({
        id: lead.id,
        reengagement_hook: currentHooks,
        probability: 95, 
        jamie_notes: `[MARKET_ANOMALY] High-stakes shift detected in ${anomaly.location}. Lead interest matched.`
      });
    }

    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('leads')
        .upsert(updates);
      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notified: leads?.length || 0 
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Market Alert Failure:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
