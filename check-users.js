const { autoDb } = require("./lib/database-init.js");

async function checkAndCreateDemoUsers() {
  try {
    console.log("Checking database state...");

    // Check current users
    const users = await autoDb.getAllUsers();
    console.log(`Found ${users.length} users in database:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.id}) - Role: ${user.role}, Active: ${user.isActive}`);
    });

    // Check if demo user exists
    const demoUser = users.find(u => u.username === 'demo');
    if (!demoUser) {
      console.log("Creating demo user...");
      const newDemoUser = await autoDb.createUser({
        username: 'demo',
        email: 'demo@example.com',
        password: 'password123',
        role: 'user',
        credits: 1000,
        isActive: true
      });
      console.log(`Demo user created: ${newDemoUser.username} (${newDemoUser.id})`);
    } else {
      console.log("Demo user already exists");
    }

    // Check if admin user exists
    const adminUser = users.find(u => u.username === 'admin');
    if (!adminUser) {
      console.log("Creating admin user...");
      const newAdminUser = await autoDb.createUser({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        credits: 9999,
        isActive: true
      });
      console.log(`Admin user created: ${newAdminUser.username} (${newAdminUser.id})`);
    } else {
      console.log("Admin user already exists");
    }

    // Check contacts for existing users
    for (const user of users) {
      const contacts = await autoDb.getContactsByUserId(user.id);
      console.log(`User ${user.username} has ${contacts.length} contacts`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkAndCreateDemoUsers();
