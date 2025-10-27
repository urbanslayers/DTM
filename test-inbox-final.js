const http = require('http');

async function testInboxAPI() {
  console.log('Testing inbox API with updated token logic...');

  const testAPI = (path) => {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            console.log(`✅ ${path}: Success (${res.statusCode})`);
            console.log(`   Messages: ${jsonData.messages?.length || 0}`);
            console.log(`   Has error: ${!!jsonData.error}`);
            console.log(`   Has note: ${!!jsonData.note}`);
          } catch (e) {
            console.log(`❓ ${path}: ${res.statusCode} - ${data.substring(0, 100)}...`);
          }
          resolve();
        });
      });

      req.on('error', (e) => {
        console.log(`❌ ${path}: Error - ${e.message}`);
        resolve();
      });

      req.setTimeout(5000, () => {
        console.log(`⏰ ${path}: Timeout`);
        req.destroy();
        resolve();
      });

      req.end();
    });
  };

  await testAPI('/api/messaging/inbox?limit=5&direction=incoming');
  await testAPI('/api/messaging/inbox?limit=10&direction=outgoing');
  await testAPI('/api/messaging/inbox?limit=50&offset=0&direction=incoming&reverse=true');

  console.log('\n🎯 Test complete - check if API returns success without throwing errors');
}

testInboxAPI();
