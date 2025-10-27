const http = require('http');

async function testContactsAPI() {
  console.log('Testing contacts API...');

  // First, try to get current contacts for the demo user
  const getOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/contacts?userId=unknown-user-id',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer user_unknown-user-id',
    }
  };

  console.log('1. Testing GET contacts...');
  const getReq = http.request(getOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`GET Status: ${res.statusCode}`);
      console.log(`GET Response: ${data}`);

      // Now test creating a contact
      console.log('\n2. Testing POST contact...');
      const postData = JSON.stringify({
        name: 'Test Contact',
        phoneNumber: '0412345678',
        email: 'test@example.com',
        category: 'personal',
        userId: 'unknown-user-id'
      });

      const postOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/contacts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user_unknown-user-id',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const postReq = http.request(postOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          console.log(`POST Status: ${res.statusCode}`);
          console.log(`POST Response: ${data}`);
        });
      });

      postReq.on('error', (e) => {
        console.error('POST Error:', e);
      });

      postReq.write(postData);
      postReq.end();
    });
  });

  getReq.on('error', (e) => {
    console.error('GET Error:', e);
  });

  getReq.end();
}

testContactsAPI();
