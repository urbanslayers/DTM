// Simple test for database messages
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messaging/inbox?userId=cmh3go54b0022ultkalaiq535',
  method: 'GET',
  headers: { 'Authorization': 'Bearer test' }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Success:', json.success);
      console.log('Message count:', json.messages ? json.messages.length : 0);
      if (json.messages && json.messages.length > 0) {
        console.log('First message:', json.messages[0]);
      }
      console.log('Full response:', data);
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
