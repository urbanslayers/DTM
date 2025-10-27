const http = require('http');

const testUserUpdate = async () => {
  const updateData = JSON.stringify({
    username: 'testuser_final_test',
    email: 'test@example.com',
    role: 'user',
    credits: 888,
    isActive: true
  });

  console.log('Sending update request...');
  console.log('Data:', updateData);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/user-1',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin_token',
      'Content-Length': Buffer.byteLength(updateData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    res.setEncoding('utf8');
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      console.log('Response body:', body);

      // Now test getting the user back
      console.log('\nTesting user retrieval...');
      const getOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/users?page=1&limit=10&search=&role=all',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin_token'
        }
      };

      const getReq = http.request(getOptions, (getRes) => {
        console.log(`Get Status: ${getRes.statusCode}`);

        getRes.setEncoding('utf8');
        let getBody = '';
        getRes.on('data', (chunk) => {
          getBody += chunk;
        });

        getRes.on('end', () => {
          console.log('Get Response body:', getBody);
        });
      });

      getReq.on('error', (e) => {
        console.error(`Get request error: ${e.message}`);
      });

      getReq.end();
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(updateData);
  req.end();
};

testUserUpdate();
