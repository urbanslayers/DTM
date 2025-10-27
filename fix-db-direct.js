// Direct database schema fix
// This script modifies the SQLite database directly to remove the foreign key constraint

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'db', 'messaging_app.db')

async function fixDatabase() {
  console.log('🔧 Fixing database schema directly...')
  console.log('Database path:', dbPath)

  try {
    // Check if we can use sqlite3 command
    await execAsync(`sqlite3 --version`)
    console.log('✅ sqlite3 command available')

    // Run the schema fix
    const commands = `
CREATE TABLE api_usage_new (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    statusCode INTEGER NOT NULL,
    responseTime INTEGER NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO api_usage_new (id, userId, endpoint, method, statusCode, responseTime, timestamp)
SELECT id, userId, endpoint, method, statusCode, responseTime, timestamp
FROM api_usage;

DROP TABLE api_usage;

ALTER TABLE api_usage_new RENAME TO api_usage;

.schema api_usage;
`

    // Write commands to a temporary file and execute
    const fs = await import('fs')
    const tempFile = path.join(__dirname, 'temp-schema-fix.sql')
    fs.writeFileSync(tempFile, commands)

    console.log('Running schema fix...')
    const { stdout } = await execAsync(`sqlite3 "${dbPath}" < "${tempFile}"`)
    console.log('Schema fix output:', stdout)

    // Clean up temp file
    fs.unlinkSync(tempFile)

    console.log('✅ Database schema fixed successfully!')
    console.log('You can now restart your development server.')

  } catch (error) {
    console.error('❌ Error with sqlite3 command:', error.message)
    console.log('\n🔄 Trying alternative approach...')

    // If sqlite3 command fails, try to use Node.js with sqlite3 module
    try {
      const sqlite3 = await import('sqlite3')
      const db = new sqlite3.Database(dbPath)

      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run(`CREATE TABLE api_usage_new (
              id TEXT NOT NULL PRIMARY KEY,
              userId TEXT,
              endpoint TEXT NOT NULL,
              method TEXT NOT NULL,
              statusCode INTEGER NOT NULL,
              responseTime INTEGER NOT NULL,
              timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) return reject(err)

            db.run(`INSERT INTO api_usage_new (id, userId, endpoint, method, statusCode, responseTime, timestamp)
                    SELECT id, userId, endpoint, method, statusCode, responseTime, timestamp
                    FROM api_usage`, (err) => {
              if (err) return reject(err)

              db.run('DROP TABLE api_usage', (err) => {
                if (err) return reject(err)

                db.run('ALTER TABLE api_usage_new RENAME TO api_usage', (err) => {
                  if (err) return reject(err)

                  console.log('✅ Database schema fixed using Node.js!')
                  resolve()
                })
              })
            })
          })
        })
      })

      db.close()
      console.log('You can now restart your development server.')

    } catch (nodeError) {
      console.error('❌ Node.js approach also failed:', nodeError.message)
      console.log('\n📋 Manual steps required:')
      console.log('Please run these SQL commands manually:')
      console.log('\n1. Install sqlite3 if needed: npm install sqlite3')
      console.log('2. Or use any SQLite GUI tool')
      console.log('3. Run the SQL commands from the previous instructions')
    }
  }
}

fixDatabase()
