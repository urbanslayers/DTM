const { authService } = require('../lib/auth');

async function checkCurrentUser() {
  console.log('Checking current user from auth service...');
  const user = authService.getCurrentUser();
  console.log('Current user:', user);
}

checkCurrentUser();
