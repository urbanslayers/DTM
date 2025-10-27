const { PrismaClient } = require('@prisma/client');

async function checkMessages() {
  const prisma = new PrismaClient();

  try {
    // Check inbox messages
    const inboxMessages = await prisma.inboxMessage.findMany({
      select: {
        id: true,
        userId: true,
        from: true,
        to: true,
        content: true,
        type: true,
        receivedAt: true,
        read: true,
        folder: true
      }
    });

    console.log('Inbox Messages:', inboxMessages);

    // Check sent messages
    const sentMessages = await prisma.message.findMany({
      select: {
        id: true,
        userId: true,
        to: true,
        from: true,
        content: true,
        type: true,
        status: true,
        createdAt: true
      }
    });

    console.log('Sent Messages:', sentMessages);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();
