import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/jamie/audit
 * Logs a false positive or correction for the Scythe Purifier.
 */
export async function POST(req: Request) {
  try {
    const { detection, context, corrective_action } = await req.json();

    // Log the audit event for Ozriel's next "dream" cycle
    const { error } = await supabase
      .from('intelligence_events')
      .insert({
        event_type: 'SCYTHE_AUDIT',
        description: `False positive reported: "${detection.robotic}"`,
        metadata: {
          original_fragment: detection.robotic,
          suggested_replacement: detection.purified,
          context_text: context,
          user_correction: corrective_action,
          action: 'FALSE_POSITIVE_REPORT'
        },
        severity: 'WARNING'
      });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Ozriel has noted this discrepancy. The registry will be adjusted in the next cycle." });

  } catch (error: any) {
    console.error('Audit API Error:', error);
    return NextResponse.json({ error: 'Failed to log audit.' }, { status: 500 });
  }
}
