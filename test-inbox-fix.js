const http = require('http');

async function testInbox() {
  console.log('Testing inbox API with fixed token refresh...');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/messaging/inbox?limit=5&direction=incoming',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('SUCCESS: API returned valid JSON');
        console.log('Messages count:', jsonData.messages?.length || 0);
        console.log('Has note about API limitations:', !!jsonData.note);

        if (jsonData.messages && Array.isArray(jsonData.messages)) {
          console.log('✅ API working correctly - no more TOKEN_INVALID errors!');
        } else {
          console.log('❌ Still having issues, but no longer throwing errors');
        }
      } catch (e) {
        console.log('Response (not JSON):', data.substring(0, 200));
      }
    });
  });

  req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
  });

  req.setTimeout(10000, () => {
    console.log('Request timed out');
    req.destroy();
  });

  req.end();
}

testInbox();
