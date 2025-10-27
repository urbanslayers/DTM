// Quick verification test
const http = require('http');

console.log('Testing messaging system...');

// Test 1: Inbox messages
const inboxOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messaging/inbox?userId=cmh3go54b0022ultkalaiq535&direction=incoming&limit=5',
  method: 'GET',
  headers: { 'Authorization': 'Bearer test' }
};

const inboxReq = http.request(inboxOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Inbox API:', json.success ? 'SUCCESS' : 'FAILED');
      console.log('   Messages:', json.messages?.length || 0);
    } catch (e) {
      console.log('❌ Inbox API: FAILED -', data.substring(0, 100));
    }
  });
});

inboxReq.on('error', (e) => console.log('❌ Inbox API: ERROR -', e.message));
inboxReq.end();

// Test 2: Sent messages
const sentOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messaging/inbox?userId=cmh3go54b0022ultkalaiq535&direction=outgoing&limit=5',
  method: 'GET',
  headers: { 'Authorization': 'Bearer test' }
};

const sentReq = http.request(sentOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Sent API:', json.success ? 'SUCCESS' : 'FAILED');
      console.log('   Messages:', json.messages?.length || 0);
    } catch (e) {
      console.log('❌ Sent API: FAILED -', data.substring(0, 100));
    }
  });
});

sentReq.on('error', (e) => console.log('❌ Sent API: ERROR -', e.message));
sentReq.end();

console.log('Tests initiated...');
