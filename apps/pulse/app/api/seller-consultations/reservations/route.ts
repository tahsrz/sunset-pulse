import { sellerConsultationHttp } from '@/lib/scheduling/sellerConsultationHttp.server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const POST = (request: Request) => sellerConsultationHttp(request,'reservation');
