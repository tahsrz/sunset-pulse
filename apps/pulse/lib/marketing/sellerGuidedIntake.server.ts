import 'server-only';

export function isSellerGuidedIntakeEnabled() {
  return process.env.SELLER_GUIDED_INTAKE_ENABLED === 'true';
}
