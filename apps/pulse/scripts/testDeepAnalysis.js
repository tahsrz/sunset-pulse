require('dotenv').config({ path: '.env.local' });
const { getJamieResponse } = require('./lib/ai/jamie.ts');

// Mock property data
const mockProperty = {
  name: "123 Tactical Ridge",
  address: "123 Tactical Ridge, Keller, TX 76248",
  price: 550000,
  square_feet: 2800,
  stories: 2,
  year_built: 2018,
  amenities: ["Pool", "Garage", "Solar Panels"],
  location: { city: "Keller", state: "TX" }
};

const mockMessages = [
  { role: "user", content: "Jamie, pull up the numbers on 123 Tactical Ridge. I want a deep analysis." }
];

async function runTest() {
  console.log("🚀 [TEST_INIT] Starting Deep Analysis Simulation...");
  
  try {
    // Note: getJamieResponse returns a stream (if using Groq stream: true) or a response object.
    // In our implementation, it returns the completion stream from Groq.
    // We'll wrap it to capture the output if possible, or just log the flow.
    
    const result = await getJamieResponse(mockMessages, mockProperty, { isReturning: true, userName: "Tahsin" }, true);
    
    if (typeof result === 'string') {
      console.log("Result:", result);
    } else {
      console.log("✅ [TEST_SUCCESS] Jamie has initiated the analysis stream.");
      console.log("Note: To see the full content, the stream would need to be consumed.");
      // For the sake of verification, I'll log that the workers were triggered in the jamie.ts console logs (which I can't see directly unless I redirect them).
    }
  } catch (err) {
    console.error("❌ [TEST_FAILED] Deep Analysis failed:", err);
  }
}

// Since getJamieResponse relies on Next.js server context (like createClient for Supabase),
// this direct node script might fail on imports. 
// I'll check jamie.ts again for environmental dependencies.
