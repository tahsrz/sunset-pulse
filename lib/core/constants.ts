/**
 * Global Intelligence Constants
 * Standardized Time-To-Live (TTL) and decay parameters for the SunsetPulse grid
 */

export const GLOBAL_TTL_DAYS = 30;
export const GLOBAL_TTL_SECONDS = GLOBAL_TTL_DAYS * 24 * 60 * 60; // 2,592,000s
export const GLOBAL_TTL_MS = GLOBAL_TTL_SECONDS * 1000;          // 2,592,000,000ms

// Lead Intelligence Standards
export const MAX_VIEWS_FOR_SCORING = 20;
export const MAX_CHAT_MINS_FOR_SCORING = 30;
export const TOUR_REQUEST_MULTIPLIER = 3.0;

// Lead Decay Standards
export const DECAY_START_DAYS = 2;
export const DAILY_DECAY_RATE = 0.95; // 5% drop per day
