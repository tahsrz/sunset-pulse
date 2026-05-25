import { LeadSchema } from './lib/core/validation.js';
import { zodResolver } from '@hookform/resolvers/zod';

const testData = {
  property: "650c8e2b1f4e1a2b3c4d5e6f",
  idxViewed: true,
  probability: 50,
  status: "new",
  budget: "-5000",
  timeframe: "unknown",
  tourRequested: false,
  name: "Budget Test",
  email: "budget_1779727366969@example.com",
  phone: "",
  marketingConsent: false,
  crossPlatformConsent: false
};

// Simulate react-hook-form resolver execution
const resolver = zodResolver(LeadSchema);
resolver(testData, {}, {})
  .then(result => {
    console.log('Resolver Result:', JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('Resolver Crashed:', err);
  });
