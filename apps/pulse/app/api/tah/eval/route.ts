import { NextResponse } from 'next/server';
import { searchEvaluator } from '@/lib/core/evaluator';

/**
 * POST /api/tah/eval
 * High-stakes evaluation of TAH S-expressions.
 * Payload: { query: string }
 */
export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log(`[API_TAH_EVAL] Executing: ${query}`);
    const parsed = searchEvaluator.parse(query);
    const result = await searchEvaluator.evaluate(parsed);

    const jsonString = JSON.stringify({
      success: true,
      query,
      result,
      timestamp: new Date().toISOString()
    }, (key, value) => typeof value === 'bigint' ? value.toString() : value);

    return new Response(jsonString, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("[API_TAH_EVAL_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Evaluation stream interrupted." 
    }, { status: 500 });
  }
}
