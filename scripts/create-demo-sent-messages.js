const { PrismaClient } = require('@prisma/client');

async function createDemoSentMessages() {
  const prisma = new PrismaClient();

  try {
    // Get the demo user
    const user = await prisma.user.findFirst({
      where: { username: 'demo' }
    });

    if (!user) {
      console.log('Demo user not found');
      return;
    }

    console.log('Using user:', user.username, 'with ID:', user.id);

    // Create some demo sent messages
    const demoSentMessages = [
      {
        userId: user.id,
        to: '+61412345678',
        from: '+61487654321',
        content: 'Thanks for your help with the project! Looking forward to working together.',
        type: 'sms',
        status: 'delivered',
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        sentAt: new Date(Date.now() - 1000 * 60 * 29), // 29 minutes ago
        deliveredAt: new Date(Date.now() - 1000 * 60 * 28) // 28 minutes ago
      },
      {
        userId: user.id,
        to: '+61423456789',
        from: '+61487654321',
        content: 'Meeting confirmed for tomorrow at 2 PM. See you then!',
        type: 'sms',
        status: 'sent',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 30), // 2 hours ago + 30 seconds
      },
      {
        userId: user.id,
        to: '+61434567890',
        from: '+61487654321',
        content: 'Your order #12345 has been processed and will be shipped today.',
        type: 'sms',
        status: 'delivered',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60), // 1 day ago + 1 minute
        deliveredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 60 * 2) // 1 day ago + 2 minutes
      },
      {
        userId: user.id,
        to: '+61445678901',
        from: '+61487654321',
        content: 'Reminder: Please submit your timesheet by end of day Friday.',
        type: 'sms',
        status: 'failed',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 6 + 1000 * 10) // 6 hours ago + 10 seconds
      },
      {
        userId: user.id,
        to: '+61456789012',
        from: '+61487654321',
        content: 'Welcome! Your account has been successfully created. You can now access all features.',
        type: 'sms',
        status: 'delivered',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 48 + 1000 * 45), // 2 days ago + 45 seconds
        deliveredAt: new Date(Date.now() - 1000 * 60 * 60 * 48 + 1000 * 60 * 2) // 2 days ago + 2 minutes
      }
    ];

    for (const messageData of demoSentMessages) {
      const message = await prisma.message.create({
        data: messageData
      });
      console.log('Created sent message:', message.id, 'to:', message.to, 'status:', message.status);
    }

    console.log('✅ Demo sent messages created successfully!');

    // Verify messages were created
    const allSentMessages = await prisma.message.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log('Total sent messages:', allSentMessages.length);

  } catch (error) {
    console.error('Error creating demo sent messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoSentMessages();
