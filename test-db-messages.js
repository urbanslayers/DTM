// Test database messages
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messaging/inbox?userId=1&limit=5&offset=0',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test'
  }
};

const req = http.request(options, (res) => {
  console.log('DB Messages Status:', res.statusCode);
  res.setEncoding('utf8');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('DB Messages Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Problem with DB request:', e.message);
});

req.end();
