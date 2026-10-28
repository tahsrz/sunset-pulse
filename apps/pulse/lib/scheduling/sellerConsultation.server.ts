import 'server-only';

import type {
  SellerAvailabilityRequest,
  SellerAvailabilityResult,
  SellerReservationRequest,
  SellerReservationResult,
} from './sellerConsultationContract';

/** A real calendar adapter must revalidate slotId at reservation time and make requestId idempotent. */
export interface SellerConsultationAuthority {
  listSlots(input: SellerAvailabilityRequest): Promise<SellerAvailabilityResult>;
  reserve(input: SellerReservationRequest): Promise<SellerReservationResult>;
}
