import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'db', 'messaging_app.db');

try {
  const db = Database(dbPath);

  console.log('🔧 Fixing database schema...');
  console.log('Database path:', dbPath);

  // Check current table structure
  console.log('\n📋 Current api_usage table structure:');
  const tableInfo = db.prepare("PRAGMA table_info(api_usage)").all();
  console.table(tableInfo);

  // Check if userId column allows NULL
  const userIdColumn = tableInfo.find(col => col.name === 'userId');
  if (userIdColumn && userIdColumn.notnull === 0) {
    console.log('✅ userId column already allows NULL values');
    db.close();
    process.exit(0);
  }

  console.log('❌ userId column does not allow NULL values, fixing...');

  // Start a transaction
  db.exec('BEGIN TRANSACTION');

  try {
    // Create new table with correct schema
    db.exec(`
      CREATE TABLE api_usage_new (
        id TEXT NOT NULL PRIMARY KEY,
        userId TEXT,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        statusCode INTEGER NOT NULL,
        responseTime INTEGER NOT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Copy existing data
    db.exec(`
      INSERT INTO api_usage_new (id, userId, endpoint, method, statusCode, responseTime, timestamp)
      SELECT id, userId, endpoint, method, statusCode, responseTime, timestamp
      FROM api_usage
    `);

    // Drop old table and rename new one
    db.exec('DROP TABLE api_usage');
    db.exec('ALTER TABLE api_usage_new RENAME TO api_usage');

    // Commit transaction
    db.exec('COMMIT');

    console.log('✅ Database schema fixed successfully!');

    // Verify the change
    console.log('\n📋 Updated api_usage table structure:');
    const updatedTableInfo = db.prepare("PRAGMA table_info(api_usage)").all();
    console.table(updatedTableInfo);

    const updatedUserIdColumn = updatedTableInfo.find(col => col.name === 'userId');
    if (updatedUserIdColumn && updatedUserIdColumn.notnull === 0) {
      console.log('✅ userId column now allows NULL values');
    } else {
      console.log('❌ userId column still does not allow NULL values');
    }

  } catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Error fixing database schema:', error);
  }

  db.close();

} catch (error) {
  console.error('❌ Error connecting to database:', error);
  console.log('\n📋 Please run these SQL commands manually in a SQLite tool:');
  console.log(`
-- Fix the api_usage table to make userId nullable
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
  `);
}
