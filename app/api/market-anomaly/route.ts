export const dynamic = 'force-dynamic';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import connectDB from '@/lib/core/database';
import { supabase } from '@/lib/supabase'; // Using the client for internal triggers if needed

export const POST = async (request: Request) => {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // Rate limit: 20 anomaly pings per minute
    const limitResponse = await applyApiRateLimit(ip, 20);
    if (limitResponse) return limitResponse;

    const body = await request.json();
    const { type, location, change, severity, source } = body;

    if (!type || !location) {
      return errorResponse('Invalid anomaly payload. Protocol mapping failed.', 400);
    }

    console.log(`[ANOMALY_DETECTED] Type: ${type}, Location: ${location}, Severity: ${severity}`);

    // Trigger Supabase Edge Function for real-time processing and lead matching
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/market-alert`;
      
      // Fire and forget (or wait depending on needs)
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          anomaly: { type, location, change, severity, source, timestamp: new Date() }
        })
      }).catch(err => console.error('Failed to trigger edge function:', err));
    }

    return successResponse({ 
      status: 'PROTOCOL_ACKNOWLEDGED', 
      message: 'Market anomaly data intercepted and queued for analysis.',
      severity
    }, 202);

  } catch (error: any) {
    return errorResponse('Anomaly intercept failure.', 500, error.message);
  }
};
