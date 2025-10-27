import { autoDb as db } from './lib/database-init'

async function testAPI() {
  try {
    console.log('Testing database initialization...')
    await db.initialize()
    console.log('✅ Database initialized successfully')

    console.log('Testing basic database operations...')
    const users = await db.getAllUsers()
    console.log(`✅ Found ${users.length} users`)

    console.log('Testing rules API...')
    const rules = await db.getAllRules()
    console.log(`✅ Found ${rules.length} rules`)

    console.log('Testing system message...')
    await db.addSystemMessage(users[0]?.id || 'test', 'info', 'Test message')
    console.log('✅ System message added successfully')

    console.log('✅ All basic operations working!')

  } catch (error) {
    console.error('❌ Error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : String(error))
  }
}

testAPI()
