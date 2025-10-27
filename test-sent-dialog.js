// Test sent messages dialog API call
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messaging/inbox?userId=cmh3go54b0022ultkalaiq535&direction=outgoing&limit=50',
  method: 'GET',
  headers: { 'Authorization': 'Bearer test' }
};

const req = http.request(options, (res) => {
  console.log('Sent Messages Dialog API Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Success:', json.success);
      console.log('Message count:', json.messages ? json.messages.length : 0);
      if (json.messages && json.messages.length > 0) {
        console.log('First message preview:', json.messages[0].messageContent?.substring(0, 50) + '...');
      }
      console.log('Full response length:', data.length);
    } catch (e) {
      console.log('Raw response:', data.substring(0, 200) + '...');
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
