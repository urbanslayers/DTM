const http = require('http');

async function createDemoUsers() {
  const users = [
    {
      username: 'demo',
      email: 'demo@example.com',
      password: 'password123',
      role: 'user',
      credits: 1000
    },
    {
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      credits: 9999
    }
  ];

  for (const userData of users) {
    const postData = JSON.stringify(userData);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin_token',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`Creating user: ${userData.username}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ User ${userData.username} created successfully`);
        } else {
          console.log(`❌ Failed to create user ${userData.username}: ${res.statusCode}`);
          console.log(data);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Error creating user ${userData.username}:`, e);
    });

    req.write(postData);
    req.end();
  }
}

createDemoUsers();
