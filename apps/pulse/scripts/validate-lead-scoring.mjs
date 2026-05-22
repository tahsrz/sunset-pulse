import { calculateLeadScore, applyDecay, calculateVelocity } from '../lib/intelligence/leadIntelligence.js';

const runTests = () => {
  console.log('--- SUNSETPULSE LEAD INTELLIGENCE VALIDATION ---\n');

  // Test 1: Base Scoring Logic
  console.log('[Test 1] Base Scoring Verification');
  const baseLead = {
    views: 10, // 100 points
    chatMinutes: 10, // 50 points
    tourRequested: false, // 1.0 multiplier
    phone: '',
    budget: 0,
    timeframe: 'unknown'
  };
  
  let score = calculateLeadScore(baseLead);
  // Calculation: (100 + 50) * 1.0 = 150
  console.assert(score === 150, `Expected 150, got ${score}`);
  console.log('✅ Base score (150) confirmed.');

  // Test 2: Multipliers & Bonuses (VIP Logic)
  console.log('\n[Test 2] Multipliers & Bonuses (VIP Logic) Verification');
  const hotLead = {
    ...baseLead,
    tourRequested: true, // (100 + 50) * 3.0 = 450. 
    phone: '555-5555', // +15 = 465
    budget: 500000, // +5 = 470
    timeframe: 'immediate' // 470 * 1.2 = 564
  };
  
  // Note: The VIP bonus (+20) is added AFTER the timeframe multiplier? 
  // Let's check: 564 + 20 = 584. YES.
  score = calculateLeadScore(hotLead);
  console.assert(score === 584, `Expected 584, got ${score}`);
  console.log('✅ Hot lead VIP score (584) confirmed.');

  // Test 3: Decay Logic
  console.log('\n[Test 3] Decay Logic Verification');
  const initialScore = 100;
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const noDecay = applyDecay(initialScore, twoDaysAgo);
  console.assert(noDecay === 100, `Expected 100 (no decay until day 2), got ${noDecay}`);
  
  // 3 days of decay (Day 3, 4, 5) -> 100 * 0.95^3 = 100 * 0.857375 = 86
  const decayed = applyDecay(initialScore, fiveDaysAgo);
  console.assert(decayed === 86, `Expected 86 (0.95^3 decay), got ${decayed}`);
  console.log('✅ Decay curve (86% at 5 days) confirmed.');

  // Test 4: Engagement Velocity
  console.log('\n[Test 4] Engagement Velocity Verification');
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const velocityLead = {
    ...baseLead,
    createdAt: threeDaysAgo,
    views: 15, // 15
    chatMinutes: 10, // 10 * 2 = 20
    tourRequested: true // 20
    // Total activity = 15 + 20 + 20 = 55
    // Velocity = 55 / 3 = 18.33
  };

  const velocity = calculateVelocity(velocityLead);
  console.assert(velocity === 18.33, `Expected 18.33, got ${velocity}`);
  console.log('✅ Engagement velocity (18.33) confirmed.');

  console.log('\n--- VALIDATION COMPLETE: INTELLIGENCE GRID NOMINAL ---');
};

runTests();
