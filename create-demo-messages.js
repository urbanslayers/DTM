const { PrismaClient } = require('@prisma/client');

async function createDemoMessages() {
  const prisma = new PrismaClient();

  try {
    // First get the demo user
    const demoUser = await prisma.user.findFirst({
      where: { username: 'demo' }
    });

    if (!demoUser) {
      console.log('Demo user not found. Creating demo user first...');
      const newUser = await prisma.user.create({
        data: {
          username: 'demo',
          email: 'demo@example.com',
          password: 'password123',
          role: 'user',
          credits: 1000
        }
      });
      console.log('Demo user created:', newUser.username);
    }

    // Get the user (either existing or newly created)
    const user = await prisma.user.findFirst({
      where: { username: 'demo' }
    });

    console.log('Using user:', user.username, 'with ID:', user.id);

    // Create some demo inbox messages
    const demoMessages = [
      {
        userId: user.id,
        from: '+61412345678',
        to: '+61487654321',
        content: 'Hey! How are you doing today? Want to catch up later?',
        type: 'sms',
        read: false,
        folder: 'personal'
      },
      {
        userId: user.id,
        from: '+61423456789',
        to: '+61487654321',
        content: 'Your package has been delivered! Please check your doorstep.',
        type: 'sms',
        read: false,
        folder: 'personal'
      },
      {
        userId: user.id,
        from: '+61434567890',
        to: '+61487654321',
        content: 'Meeting reminder: Team standup at 10 AM tomorrow.',
        type: 'sms',
        read: true,
        folder: 'work'
      },
      {
        userId: user.id,
        from: '+61445678901',
        to: '+61487654321',
        content: 'Thanks for your payment! Receipt attached.',
        type: 'sms',
        read: true,
        folder: 'personal'
      },
      {
        userId: user.id,
        from: '+61456789012',
        to: '+61487654321',
        content: 'Welcome to our service! Your account has been activated.',
        type: 'sms',
        read: false,
        folder: 'personal'
      }
    ];

    for (const messageData of demoMessages) {
      const message = await prisma.inboxMessage.create({
        data: messageData
      });
      console.log('Created message:', message.id, 'from:', message.from);
    }

    console.log('✅ Demo messages created successfully!');

    // Verify messages were created
    const allMessages = await prisma.inboxMessage.findMany({
      where: { userId: user.id },
      orderBy: { receivedAt: 'desc' }
    });

    console.log('Total messages in inbox:', allMessages.length);

  } catch (error) {
    console.error('Error creating demo messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoMessages();
