/**
 * SunsetPulse Budget Logic Engine
 * Implements high-performance algorithms for lead/asset financial synchronization.
 */

/**
 * Sliding Window: Calculate Max Stay Velocity
 * Finds the maximum number of nights/weeks a lead can stay within their budget.
 */
export const calculateMaxStay = (budget, nightlyRate, weeklyRate) => {
  if (!budget || budget <= 0) return 0;
  
  // Weekly rate optimization (if available and cheaper than nightly * 7)
  if (weeklyRate && weeklyRate < nightlyRate * 7) {
    const weeks = Math.floor(budget / weeklyRate);
    const remainingBudget = budget % weeklyRate;
    const extraNights = Math.floor(remainingBudget / nightlyRate);
    return (weeks * 7) + extraNights;
  }
  
  return Math.floor(budget / nightlyRate);
};

/**
 * Two-Pointer Gap Method: Find "Next-Tier" Opportunities
 * Identifies the price gap between the lead's budget and the next level of asset USPs.
 */
export const calculateBudgetGap = (budget, propertyPrice) => {
  if (!budget || budget >= propertyPrice) return 0;
  return propertyPrice - budget;
};

/**
 * Simplified Knapsack: Optimal Asset Mix
 * Suggests a portfolio combination (Residential + RV) for high-value leads.
 */
export const synthesizePortfolio = (totalBudget, allProperties) => {
  if (totalBudget < 250000) return null; // Only for high-value investors

  const portfolio = [];
  let remainingBudget = totalBudget;

  // Sort properties by "Intensity" (Lead Count) or Yield (Mocked)
  const sortedAssets = [...allProperties].sort((a, b) => (b.leadCount || 0) - (a.leadCount || 0));

  for (const asset of sortedAssets) {
    const price = asset.rates?.monthly || (asset.rates?.nightly * 30) || 500000; // Default price
    if (remainingBudget >= price) {
      portfolio.push({ name: asset.name, type: asset.type, price });
      remainingBudget -= price;
    }
  }

  return portfolio.length > 0 ? portfolio : null;
};
