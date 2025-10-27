const http = require('http');

// Test the database persistence fix by creating a user and then logging in
async function testDatabasePersistence() {
  console.log('Testing database persistence fix...\n');

  // Step 1: Create a new user
  console.log('Step 1: Creating a new user...');
  const createUserData = JSON.stringify({
    username: 'testuser_persistence',
    email: 'test.persistence@example.com',
    password: 'testpass123',
    role: 'user',
    credits: 100
  });

  const createOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin_token',
      'Content-Length': Buffer.byteLength(createUserData)
    }
  };

  await new Promise((resolve, reject) => {
    const req = http.request(createOptions, (res) => {
      console.log(`Create User - Status: ${res.statusCode}`);

      res.setEncoding('utf8');
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('Create User Response:', body);
        resolve(body);
      });
    });

    req.on('error', (e) => {
      console.error(`Create user error: ${e.message}`);
      reject(e);
    });

    req.write(createUserData);
    req.end();
  });

  // Wait a moment for the database to be updated
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Try to login with the created user
  console.log('\nStep 2: Logging in with the created user...');
  const loginData = JSON.stringify({
    username: 'testuser_persistence',
    password: 'testpass123'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      console.log(`Login - Status: ${res.statusCode}`);

      res.setEncoding('utf8');
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('Login Response:', body);

        if (res.statusCode === 200) {
          console.log('\n✅ SUCCESS: Database persistence is working! User created and login successful.');
        } else {
          console.log('\n❌ FAILURE: Database persistence issue still exists.');
        }

        resolve(body);
      });
    });

    req.on('error', (e) => {
      console.error(`Login error: ${e.message}`);
      reject(e);
    });

    req.write(loginData);
    req.end();
  });
}

testDatabasePersistence().catch(console.error);
