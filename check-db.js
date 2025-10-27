const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true }
    });

    console.log('Users in database:', users);

    // Also check contacts table
    const contacts = await prisma.contact.findMany({
      select: { id: true, userId: true, name: true }
    });

    console.log('Contacts in database:', contacts);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
