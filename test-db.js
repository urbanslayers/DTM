const { db } = require('./lib/database.js');

console.log('Testing database connection...');
const users = db.getAllUsers();
console.log('Users in database:', users.map(u => ({
  username: u.username,
  email: u.email,
  role: u.role,
  id: u.id
})));
