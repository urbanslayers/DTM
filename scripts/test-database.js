import { db } from '../lib/database'

// Test database persistence
async function testDatabasePersistence() {
  console.log('Testing database persistence...')

  try {
    // Check current database state
    const initialState = db.getDatabaseState()
    console.log('Initial database state:', initialState)

    // Create a test user
    const testUser = db.createUser({
      username: 'test-user-persistence',
      email: 'test@example.com',
      password: 'testpass123',
      role: 'user',
      credits: 100
    })
    console.log('Created test user:', testUser.id)

    // Add a test message
    const testMessage = db.addMessage({
      userId: testUser.id,
      to: ['+61412345678'],
      from: 'TestSender',
      content: 'Test message for persistence',
      type: 'sms',
      status: 'sent',
      credits: 1,
      isTemplate: false
    })
    console.log('Created test message:', testMessage.id)

    // Check database state after insertions
    const afterInsertState = db.getDatabaseState()
    console.log('Database state after insertions:', afterInsertState)

    // Retrieve the user to verify persistence
    const retrievedUser = db.getUserById(testUser.id)
    console.log('Retrieved user:', retrievedUser?.username)

    // Retrieve the message to verify persistence
    const retrievedMessage = db.getMessageById(testMessage.id)
    console.log('Retrieved message content:', retrievedMessage?.content)

    console.log('✅ Database persistence test completed successfully!')

  } catch (error) {
    console.error('❌ Database persistence test failed:', error)
  }
}

// Run the test
testDatabasePersistence()
