import { NextRequest } from 'next/server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { readClientProgress } from '@/lib/realtor-workspace/sellerService.server';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) { return realtorApi(request, readClientProgress); }
