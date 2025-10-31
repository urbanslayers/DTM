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
    // Always return a function wrapper for callable methods (except initialize)
    if (prop === 'initialize') {
      return target.initialize.bind(target)
    }

    return async (...args: any[]) => {
      // Ensure DB is initialized first
      await ensureDatabaseInitialized()

      const value = target[prop]
      if (typeof value === 'function') {
        return value.apply(target, args)
      }

      // If the property is not a function, return it directly (for getters)
      if (args.length === 0) {
        return value
      }

      // If callers tried to call a non-existent method, surface a clearer error
      throw new TypeError(`Database method '${String(prop)}' is not available`)
    }
  }
})
