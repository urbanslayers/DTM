const { db } = require('../lib/database.js');

console.log('Testing database update directly...');

// Get current user
const user = db.getUserById('user-1');
console.log('Current user:', user);

// Update user
const updated = db.updateUser('user-1', {
  username: 'testuser_direct',
  credits: 999,
  isActive: true
});

console.log('Update result:', updated);

// Get user again to verify
const userAfter = db.getUserById('user-1');
console.log('User after update:', userAfter);
