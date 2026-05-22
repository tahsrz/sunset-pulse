import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function testApi() {
  const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || 'http://localhost:3000';
  console.log(`🔍 Testing API at ${apiDomain}/api/properties`);
  
  try {
    const res = await fetch(`${apiDomain}/api/properties`);
    if (!res.ok) {
      console.error(`❌ API returned status ${res.status}`);
      const text = await res.text();
      console.error(text);
      return;
    }
    
    const json = await res.json();
    console.log('✅ API Success');
    console.log('Payload structure:', Object.keys(json));
    if (json.data) {
      console.log('Data structure:', Object.keys(json.data));
      if (json.data.properties) {
        console.log(`Found ${json.data.properties.length} properties.`);
        if (json.data.properties.length > 0) {
          console.log('Sample property keys:', Object.keys(json.data.properties[0]));
          console.log('Sample property ID:', json.data.properties[0]._id || json.data.properties[0].id);
        }
      }
    }
  } catch (error) {
    console.error('❌ Fetch failed:', error.message);
  }
}

testApi();
