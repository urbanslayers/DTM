// Test token endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': 0
  }
};

const req = http.request(options, (res) => {
  console.log('Token Status:', res.statusCode);
  res.setEncoding('utf8');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Token Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Problem with token request:', e.message);
});

req.end();
