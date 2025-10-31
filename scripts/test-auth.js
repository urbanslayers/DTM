const https = require('https');

async function testAuth() {
  console.log('Testing authentication flow...');

  // Test auth token endpoint
  const authData = JSON.stringify({});

  const authOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': authData.length
    }
  };

  const authReq = https.request(authOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Auth response:', res.statusCode);
      console.log('Auth data:', data);
    });
  });

  authReq.on('error', (e) => {
    console.error('Auth request error:', e);
  });

  authReq.write(authData);
  authReq.end();

  // Wait a bit then test inbox
  setTimeout(() => {
    const inboxOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/messaging/inbox?limit=5',
      method: 'GET'
    };

    const inboxReq = https.request(inboxOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Inbox response:', res.statusCode);
        console.log('Inbox data:', data);
      });
    });

    inboxReq.on('error', (e) => {
      console.error('Inbox request error:', e);
    });

    inboxReq.end();
  }, 2000);
}

testAuth();
