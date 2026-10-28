import { z } from 'zod';

export const consultationKinds = {
  buyer_consultation: 'Buyer Consultation', rental_consultation: 'Rental Consultation', seller_consultation: 'Seller Consultation',
} as const;
export type ConsultationKind = keyof typeof consultationKinds;

export function consultationRequestContext(params: Pick<URLSearchParams, 'get'>) {
  const kind = params.get('appointmentType') ?? 'buyer_consultation';
  const site = (params.get('site') ?? '').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(consultationKinds, kind) || !/^[a-z0-9](?:[a-z0-9.-]{0,78}[a-z0-9])?$/.test(site)) return null;
  return { kind: kind as ConsultationKind, site };
}

// A 2xx response alone does not prove that a saved request exists.
export const consultationRequestReceiptSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accepted: z.literal(true), id: z.string().guid(), funnelId: z.string().guid(),
    agentId: z.string().trim().min(1).max(120), site: z.string().trim().min(1).max(180),
  }),
});
