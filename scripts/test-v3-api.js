// Test v3 API directly
const https = require('https');

async function testV3API() {
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

  // Test the v3 Telstra API directly
  const url = 'https://products.api.telstra.com/messaging/v3/messages?limit=5&direction=incoming';

  console.log('Testing URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Telstra-api-version': '3.1.0',
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

testV3API().catch(console.error);
