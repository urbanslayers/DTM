import { openDb } from './sqlite';

async function initDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      role TEXT,
      credits INTEGER,
      createdAt DATETIME,
      lastLogin DATETIME,
      isActive BOOLEAN
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      type TEXT,
      from_number TEXT,
      to_number TEXT,
      content TEXT,
      status TEXT,
      credits INTEGER,
      isTemplate BOOLEAN,
      createdAt DATETIME
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      name TEXT,
      phone TEXT,
      email TEXT,
      category TEXT,
      createdAt DATETIME
    );
    -- Add more tables as needed
  `);
  await db.close();
}

if (require.main === module) {
  initDb().then(() => {
    console.log('SQLite database initialized');
    process.exit(0);
  });
}