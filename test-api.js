const http = require('http');

// Test authentication first
const authReq = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/test-auth',
  method: 'GET'
}, (res) => {
  console.log('Auth Status:', res.statusCode);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('Auth Response:', chunk);
  });
});

authReq.on('error', (e) => {
  console.error('Problem with auth request:', e.message);
});

authReq.end();

const postData = JSON.stringify({
  to: '0412345678',
  body: 'test message'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messaging/sms',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log('SMS API Status:', res.statusCode);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('SMS API Response body:', chunk);
  });
});

req.on('error', (e) => {
  console.error('Problem with SMS request:', e.message);
});

req.write(postData);
req.end();
