/**
 * Test for the improved SearchEvaluator
 */
import dotenv from 'dotenv';
import path from 'path';
// Load .env.local from the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { searchEvaluator } from './evaluator';

async function test() {
  console.log("--- TAH Search Evaluator Test ---");
  console.log("CWD:", process.cwd());
  
  const queries = [
    "(VERSION)",
    "(LIST-CARTRIDGES)",
    "(HELP)",
    "(SEARCH \"Bowie\" :beds-min 3)",
    "(EXISTS? \"listings_gate\" \"MFRTB8303016|2026-05-08T20:18:29.742000\")",
    "(QUERY \"listings_gate\" \"MFRTB8303016\")"
  ];

  for (const q of queries) {
    console.log(`\nQuery: ${q}`);
    try {
      const parsed = searchEvaluator.parse(q);
      const result = await searchEvaluator.evaluate(parsed);
      console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e: any) {
      console.error("Error:", e.message);
    }
  }
}

test();
