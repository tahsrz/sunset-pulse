/**
 * SunsetPulse Lead Intelligence Utility
 * Handles complex lead scoring, probability decay, and engagement velocity.
 */

import { 
  DECAY_START_DAYS, 
  DAILY_DECAY_RATE, 
  MAX_VIEWS_FOR_SCORING, 
  MAX_CHAT_MINS_FOR_SCORING,
  TOUR_REQUEST_MULTIPLIER
} from '../core/constants';

export const calculateLeadScore = (leadData, existingLead = null) => {
  // --- ENHANCED LEAD SCORING V6.0 ---
  
  const viewPoints = Math.min(leadData.views || 0, MAX_VIEWS_FOR_SCORING) * 10;
  const chatPoints = Math.min(leadData.chatMinutes || 0, MAX_CHAT_MINS_FOR_SCORING) * 5;
  const baseIntent = viewPoints + chatPoints;
  
  const hotMultiplier = leadData.tourRequested ? TOUR_REQUEST_MULTIPLIER : 1.0;
  
  let probability = Math.round(baseIntent * hotMultiplier);

  // 1. Phone Number bonus (+15 points)
  if (leadData.phone && leadData.phone.trim() !== '') {
    probability += 15;
  }

  // 2. Repeat Lead Check (+10 points)
  if (existingLead) {
    probability += 10;
  }

  // 3. Budget Bonus (if budget > 0, +5 points)
  if (leadData.budget > 0) {
    probability += 5;
  }

  // 4. Timeframe Multiplier
  if (leadData.timeframe === 'immediate') {
    probability *= 1.2;
  } else if (leadData.timeframe === '1-3 months') {
    probability *= 1.1;
  }

  // 5. VIP Tour Bonus (+20 points flat after multiplier)
  if (leadData.tourRequested) {
    probability += 20;
  }

  return Math.round(probability);
};

export const applyDecay = (probability, lastActivity) => {
  if (!lastActivity) return probability;

  const now = new Date();
  const activityDate = new Date(lastActivity);
  const diffInDays = Math.floor((now - activityDate) / (1000 * 60 * 60 * 24));

  if (diffInDays <= 0) return probability;

  // Decay: Standardized via Constants
  if (diffInDays > DECAY_START_DAYS) {
    const decayDays = diffInDays - DECAY_START_DAYS;
    const decayFactor = Math.pow(DAILY_DECAY_RATE, decayDays);
    return Math.max(5, Math.round(probability * decayFactor));
  }

  return probability;
};

export const calculateVelocity = (lead) => {
  // --- LOGISTIC VELOCITY NORMALIZATION V2.0 ---
  // Formula: EngagementScore / (1 + e^(-k * (t - x)))
  // Ensures velocity matures over time rather than decaying linearly.

  const now = new Date();
  const createdDate = new Date(lead.createdAt || now);
  const t = Math.max(0.1, (now - createdDate) / (1000 * 60 * 60 * 24)); // Time in days

  const engagementScore = (lead.views || 0) + (lead.chatMinutes || 0) * 2 + (lead.tourRequested ? 20 : 0);
  
  // Sigmoid Parameters
  const k = 0.5;   // Steepness of growth
  const x = 7;     // Inflection point (velocity matures significantly after 7 days)
  
  const timeFactor = 1 / (1 + Math.exp(-k * (t - x)));
  
  // We divide score by the time factor (clamped to prevent div by zero)
  // This means for very new leads, the "time divisor" is small (logistic curve value is low), 
  // making the velocity higher initially and then stabilizing as the curve approaches 1.
  return parseFloat((engagementScore * timeFactor).toFixed(2));
};
