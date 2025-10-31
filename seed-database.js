const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('🌱 Seeding database with initial data...');

  try {
    // Check if users already exist
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log(`📊 Database already has ${existingUsers} users, skipping seed`);
      return;
    }

    console.log('📝 Creating initial users...');

    // Create demo users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          username: 'demo',
          email: 'demo@telstra.com',
          password: 'password123',
          role: 'user',
          credits: 796,
          personalMobile: '0412345678',
          isActive: true,
        }
      }),
      prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@telstra.com',
          password: 'admin123',
          role: 'admin',
          credits: 10000,
          personalMobile: '0412345679',
          isActive: true,
        }
      }),
    ]);

    console.log(`✅ Created ${users.length} users`);

    // Create some sample messages
    console.log('📨 Creating sample messages...');
    await Promise.all([
      prisma.message.create({
        data: {
          userId: users[0].id, // demo user
          to: JSON.stringify(['0412345678']),
          content: 'Welcome to the messaging app!',
          type: 'sms',
          status: 'sent',
          credits: 1,
          isTemplate: false,
        }
      }),
      prisma.message.create({
        data: {
          userId: users[0].id, // demo user
          to: JSON.stringify(['0412345678']),
          content: 'Check out this image!',
          type: 'mms',
          status: 'delivered',
          credits: 3,
          isTemplate: false,
        }
      }),
    ]);

    console.log('✅ Created sample messages');

    const finalStats = await Promise.all([
      prisma.user.count(),
      prisma.message.count(),
    ]);

    console.log('🎉 Database seeded successfully!');
    console.log(`📊 Final database state:`);
    console.log(`   - Users: ${finalStats[0]}`);
    console.log(`   - Messages: ${finalStats[1]}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
