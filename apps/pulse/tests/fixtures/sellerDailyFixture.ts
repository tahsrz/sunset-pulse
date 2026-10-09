import type { SellerDailyData } from '@/lib/realtor-workspace/sellerDailyContract';
export function sellerDailyFixture(changes: Partial<SellerDailyData> = {}): SellerDailyData {
  return { status: 'available', timeZone: 'America/Chicago', weekStartDate: '2026-10-05', weekEndDate: '2026-10-11',
    counts: { newRequests: 0, customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0 },
    firstContactTiming: { medianSeconds: null, sampleSize: 0 }, campaigns: [],
    unscheduledRequests: [], overdueActions: [], consultations: [],
    unscheduledHasMore: false, overdueHasMore: false, consultationsHasMore: false, ...changes };
}
