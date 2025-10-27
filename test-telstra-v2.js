// Test Telstra API v2 message reading
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messaging/inbox?direction=incoming&limit=5',
  method: 'GET',
  headers: { 'Authorization': 'Bearer test' }
};

const req = http.request(options, (res) => {
  console.log('Telstra v2 Messages Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Success:', json.success);
      console.log('Message count:', json.messages ? json.messages.length : 0);
      console.log('Note:', json.note);
      if (json.messages && json.messages.length > 0) {
        console.log('First message:', json.messages[0]);
      }
    } catch (e) {
      console.log('Raw response:', data.substring(0, 200) + '...');
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
