import { NextResponse } from 'next/server';
import { listVibeTaxonomyTerms } from '@/lib/cms/taxonomy';

export async function GET() {
  return NextResponse.json({ terms: listVibeTaxonomyTerms() });
}
