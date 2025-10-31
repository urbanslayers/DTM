const { PrismaClient } = require('@prisma/client');

async function checkInboxMessages() {
  const prisma = new PrismaClient();

  try {
    const inboxMessages = await prisma.inboxMessage.findMany({
      select: {
        id: true,
        userId: true,
        from: true,
        to: true,
        content: true,
        receivedAt: true,
        read: true,
        folder: true
      }
    });

    console.log('Inbox messages in database:', inboxMessages.length);
    console.log('Messages:', inboxMessages);

    // Also check users
    const users = await prisma.user.findMany({
      select: { id: true, username: true }
    });

    console.log('Users in database:', users);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInboxMessages();
