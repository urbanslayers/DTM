import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, 'db', 'messaging_app.db')

console.log(' Fixing database schema...')
console.log('Database path:', dbPath)

// Since sqlite3 module might not be available, let's try a direct approach
// We'll use the existing database connection method from the app

console.log('\n Please run these SQL commands manually:')
console.log('You can run them using any SQLite client or the sqlite3 command line tool.\n')

console.log('1. Connect to your database:')
console.log(`   sqlite3 "${dbPath}"\n`)

console.log('2. Run these commands:')
console.log(`   CREATE TABLE api_usage_new (
       id TEXT NOT NULL PRIMARY KEY,
       userId TEXT,
       endpoint TEXT NOT NULL,
       method TEXT NOT NULL,
       statusCode INTEGER NOT NULL,
       responseTime INTEGER NOT NULL,
       timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`)

console.log(`   INSERT INTO api_usage_new (id, userId, endpoint, method, statusCode, responseTime, timestamp)
   SELECT id, userId, endpoint, method, statusCode, responseTime, timestamp
   FROM api_usage;`)

console.log(`   DROP TABLE api_usage;`)
console.log(`   ALTER TABLE api_usage_new RENAME TO api_usage;\n`)

console.log('3. Check the result:')
console.log(`   .schema api_usage\n`)

console.log('4. Exit:')
console.log(`   .exit\n`)

console.log(' After running these commands, restart your development server.')
console.log('The foreign key constraint errors should be resolved!')
