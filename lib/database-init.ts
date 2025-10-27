import "server-only"
import { db } from "./database"

// Initialize database if not already initialized
let isInitialized = false
let initializationPromise: Promise<void> | null = null

export async function ensureDatabaseInitialized() {
  if (!isInitialized) {
    if (!initializationPromise) {
      initializationPromise = db.initialize().then(() => {
        isInitialized = true
        initializationPromise = null
        console.log('Database initialized for API routes')
      }).catch((error) => {
        initializationPromise = null
        console.error('Failed to initialize database:', error)
        throw error
      })
    }
    await initializationPromise
  }
}

// Create a simple wrapper that ensures initialization
export const autoDb = new Proxy(db, {
  get(target: any, prop: string | symbol) {
    const value = target[prop]
    if (typeof value === 'function' && prop !== 'initialize') {
      // Ensure database is initialized before calling methods
      return async (...args: any[]) => {
        await ensureDatabaseInitialized()
        return value.apply(target, args)
      }
    }
    return value
  }
})
