import { Database as SqliteDatabase } from 'sqlite3';
import { open, Database } from 'sqlite';

export async function openDb(): Promise<Database> {
  return open({
    filename: './db/messaging_app.db',
    driver: SqliteDatabase
  });
} 