const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing database connection...');

    // Test getting messages
    const messages = await prisma.message.findMany({
      where: { userId: 'cmh3go54b0022ultkalaiq535' },
      orderBy: { createdAt: 'desc' }
    });

    console.log('Found messages:', messages.length);
    if (messages.length > 0) {
      console.log('First message:', JSON.stringify(messages[0], null, 2));
    }

    // Test getting inbox messages
    const inboxMessages = await prisma.inboxMessage.findMany({
      where: { userId: 'cmh3go54b0022ultkalaiq535' },
      orderBy: { receivedAt: 'desc' }
    });

    console.log('Found inbox messages:', inboxMessages.length);
    if (inboxMessages.length > 0) {
      console.log('First inbox message:', JSON.stringify(inboxMessages[0], null, 2));
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
