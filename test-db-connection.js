import { PrismaClient } from '@prisma/client'

async function testDatabase() {
  const prisma = new PrismaClient()

  try {
    console.log('Testing database connection...')

    // Test basic query
    const userCount = await prisma.user.count()
    console.log(`✅ Database connection successful!`)
    console.log(`📊 User count: ${userCount}`)

    // Test a simple query
    const users = await prisma.user.findMany({ take: 1 })
    console.log(`✅ Query successful!`)
    console.log(`👤 First user: ${users[0]?.username || 'None'}`)

  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
