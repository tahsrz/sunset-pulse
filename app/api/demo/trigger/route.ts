import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export const POST = async (request: Request) => {
  try {
    const { action } = await request.json();

    if (action === 'seed') {
      const mockLeads = [
        { name: 'John Austin', email: 'john@austin.com', metadata: { location_interest: 'Austin', lead_category: 'Residential' }, stage: 'New', probability: 45 },
        { name: 'Alex Decatur', email: 'alex@decatur.com', metadata: { location_interest: 'Decatur', lead_category: 'Commercial' }, stage: 'New', probability: 55 },
        { name: 'Sarah Dallas', email: 'sarah@dallas.com', metadata: { location_interest: 'Dallas', lead_category: 'Commercial' }, stage: 'New', probability: 60 },
        { name: 'Houston Tex', email: 'houston@gmail.com', metadata: { location_interest: 'Houston', lead_category: 'RV' }, stage: 'New', probability: 30 },
      ];
      const { error } = await supabase.from('leads').upsert(mockLeads, { onConflict: 'email' });
      if (error) throw error;
      return successResponse({ status: 'SUCCESS', message: 'Intelligence grid seeded with 4 operatives.' });
    }

    if (action === 'anomaly') {
      const { location = 'Decatur', change = '+10%' } = await request.clone().json(); // clone to avoid stream consumption issues
      
      const requestUrl = new URL(request.url);
      const domain = process.env.NEXT_PUBLIC_DOMAIN || `${requestUrl.protocol}//${requestUrl.host}`;
      
      const res = await fetch(`${domain}/api/market-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Market Volatility',
          location,
          change,
          severity: 'Critical',
          source: 'DYNAMIC_DEMO_INJECTION'
        })
      });
      const data = await res.json();
      return successResponse({ status: 'ANOMALY_TRIGGERED', data });
    }

    return errorResponse('Unknown protocol action.', 400);
  } catch (error: any) {
    return errorResponse('Demo trigger failed.', 500, error.message);
  }
};
