// Test Telstra API directly
const https = require('https');

async function testTelstraAPI() {
  // First get a token
  const tokenResponse = await fetch('http://localhost:3000/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const tokenData = await tokenResponse.json();
  console.log('Token obtained:', tokenData.access_token ? 'YES' : 'NO');

  if (!tokenData.access_token) {
    console.log('No token received');
    return;
  }

  // Test the Telstra API directly
  const url = 'https://products.api.telstra.com/v2/messaging/messages?limit=5&direction=incoming';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Telstra-api-version': '2.0.0',
      'Content-Language': 'en-au',
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8'
    }
  });

  const data = await response.json();
  console.log('Telstra API Status:', response.status);
  console.log('Telstra API Response:', JSON.stringify(data, null, 2));
}

testTelstraAPI().catch(console.error);
