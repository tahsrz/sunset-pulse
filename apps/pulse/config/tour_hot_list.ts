/**
 * Backend-controlled default homes for the Tour Studio / homepage inventory.
 *
 * Prefer production env vars so the public site does not need a consumer-facing
 * address entry form:
 * - TOUR_HOT_LIST_ADDRESSES: newline, semicolon, or pipe separated addresses
 * - TOUR_HOT_LIST_MLS_IDS: comma, newline, semicolon, or pipe separated MLS IDs
 *
 * These committed IDs are non-sensitive public NTREIS listings selected as the
 * default homepage hot list. Saved Supabase hot lists still take precedence.
 */
export const tourHotListConfig = {
  addresses: [] as string[],
  mlsIds: [
    '21255035', // 15306 Trails End Dr, Dallas, TX 75248
    '21177832', // 13656 County Road 238, Clyde, TX 79510
  ] as string[],
  fallbackLimit: 10,
};
