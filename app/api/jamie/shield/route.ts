import { NextResponse } from 'next/server';
import { GuardianBridge } from '@/lib/security/guardianBridge';

/**
 * API Route: /api/jamie/shield
 * POST: Scans user input for adversarial patterns and token leakage.
 */
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    // Call the Guardian Shield Bridge
    const analysis = GuardianBridge.scan(query);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('API Shield Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred while scanning the query.' },
      { status: 500 }
    );
  }
}
