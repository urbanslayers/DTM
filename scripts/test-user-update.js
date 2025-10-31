const http = require('http');

const testUserUpdate = async () => {
  const updateData = JSON.stringify({
    username: 'testuser_updated',
    email: 'test@example.com',
    role: 'user',
    credits: 500,
    isActive: true
  });

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
    console.log(`User update - Status: ${res.statusCode}`);

    res.setEncoding('utf8');
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      console.log('Response body:', body);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(updateData);
  req.end();
};

testUserUpdate();
