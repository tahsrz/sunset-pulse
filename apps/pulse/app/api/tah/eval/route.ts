import { NextResponse } from 'next/server';
import { searchEvaluator } from '@/lib/core/evaluator';

/**
 * POST /api/tah/eval
 * High-stakes evaluation of TAH S-expressions.
 * Payload: { query: string }
 */
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log(`[API_TAH_EVAL] Executing: ${query}`);
    const parsed = searchEvaluator.parse(query);
    const result = await searchEvaluator.evaluate(parsed);

    return NextResponse.json({
      success: true,
      query,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[API_TAH_EVAL_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Evaluation stream interrupted." 
    }, { status: 500 });
  }
}
