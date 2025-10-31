"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
            prisma.user.create({
                data: {
                    username: 'john.doe',
                    email: 'john.doe@company.com',
                    password: 'password123',
                    role: 'user',
                    credits: 450,
                    personalMobile: '0412345680',
                    isActive: true,
                }
            }),
            prisma.user.create({
                data: {
                    username: 'jane.smith',
                    email: 'jane.smith@company.com',
                    password: 'password123',
                    role: 'user',
                    credits: 120,
                    personalMobile: '0412345681',
                    isActive: false,
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
        // Create some system status messages
        console.log('📋 Creating system status messages...');
        await Promise.all([
            prisma.systemStatus.create({
                data: {
                    userId: users[0].id,
                    type: 'info',
                    message: 'User account created',
                }
            }),
            prisma.systemStatus.create({
                data: {
                    userId: users[1].id,
                    type: 'info',
                    message: 'Admin account created',
                }
            }),
        ]);
        console.log('✅ Created system status messages');
        // Create some API usage records
        console.log('📊 Creating API usage records...');
        await Promise.all([
            prisma.apiUsage.create({
                data: {
                    userId: users[0].id,
                    endpoint: '/api/auth/login',
                    method: 'POST',
                    statusCode: 200,
                    responseTime: 150,
                }
            }),
            prisma.apiUsage.create({
                data: {
                    userId: users[1].id,
                    endpoint: '/api/admin/users',
                    method: 'GET',
                    statusCode: 200,
                    responseTime: 200,
                }
            }),
        ]);
        console.log('✅ Created API usage records');
        const finalStats = await Promise.all([
            prisma.user.count(),
            prisma.message.count(),
            prisma.systemStatus.count(),
            prisma.apiUsage.count(),
        ]);
        console.log('🎉 Database seeded successfully!');
        console.log(`📊 Final database state:`);
        console.log(`   - Users: ${finalStats[0]}`);
        console.log(`   - Messages: ${finalStats[1]}`);
        console.log(`   - System Status: ${finalStats[2]}`);
        console.log(`   - API Usage: ${finalStats[3]}`);
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the seed function
if (require.main === module) {
    seedDatabase()
        .then(() => {
        console.log('✅ Seed completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    });
}
