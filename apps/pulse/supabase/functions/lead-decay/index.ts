import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log("Starting Lead Decay Protocol...");

    // 1. Fetch all active leads with probability > 5
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, email, probability, updated_at')
      .gt('probability', 5);

    if (fetchError) throw fetchError;

    const now = new Date();
    const updates = [];

    for (const lead of (leads || [])) {
      const updatedAt = new Date(lead.updated_at);
      const diffInDays = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

      // Decay: 5% drop per day of inactivity after 2 days
      const decayStart = 2;
      if (diffInDays > decayStart) {
        const decayDays = diffInDays - decayStart;
        const decayFactor = Math.pow(0.95, decayDays);
        const newProbability = Math.max(5, Math.round(lead.probability * decayFactor));

        if (newProbability !== lead.probability) {
          updates.push({
            id: lead.id,
            email: lead.email,
            probability: newProbability,
            // We don't want to update 'updated_at' here or it will reset the decay timer
            // unless the database is configured to auto-update it.
            // If the database auto-updates, we might need a separate last_engagement field.
          });
        }
      }
    }

    if (updates.length > 0) {
      console.log(`Applying decay to ${updates.length} leads...`);
      // Bulk update (Supabase allows upsert for bulk updates if IDs are provided)
      const { error: updateError } = await supabase
        .from('leads')
        .upsert(updates, { onConflict: 'email' });

      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: leads?.length || 0, 
      updated: updates.length 
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Lead Decay Failure:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
