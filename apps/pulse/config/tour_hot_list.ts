/**
 * Backend-controlled default homes for the Tour Studio / homepage inventory.
 *
 * Prefer production env vars so the public site does not need a consumer-facing
 * address entry form:
 * - TOUR_HOT_LIST_ADDRESSES: newline, semicolon, or pipe separated addresses
 * - TOUR_HOT_LIST_MLS_IDS: comma, newline, semicolon, or pipe separated MLS IDs
 *
 * Keep these arrays empty in source unless a non-sensitive test hot list is safe
 * to commit.
 */
export const tourHotListConfig = {
  addresses: [] as string[],
  mlsIds: [] as string[],
  fallbackLimit: 10,
};
