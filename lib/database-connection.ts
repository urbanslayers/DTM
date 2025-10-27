// Simple database connection that works with Next.js
import path from 'path'

// Global variable to persist database state across module reloads (HMR)
declare global {
  var __DATABASE_STATE__: any
}

class DatabaseConnection {
  private db: any = null
  private usingMemoryFallback = false

  constructor() {
    this.initializeDatabase()
  }

  private initializeDatabase() {
    try {
      // Check if we have existing database state from global variable
      if (global.__DATABASE_STATE__) {
        console.log('Restoring database state from global variable')
        this.db = global.__DATABASE_STATE__
        this.usingMemoryFallback = true
      } else {
        // For now, use in-memory storage to avoid Next.js bundling issues
        // TODO: Implement proper persistent storage when server-side rendering is available
        console.warn('Using in-memory database storage')
        this.usingMemoryFallback = true
        this.initializeMemoryStorage()
      }
    } catch (error) {
      console.error('Failed to initialize database:', error)
      this.usingMemoryFallback = true
      this.initializeMemoryStorage()
    }
  }

  private initializeMemoryStorage() {
    // Initialize in-memory storage as fallback
    this.db = {
      users: new Map(),
      messages: new Map(),
      contacts: new Map(),
      templates: new Map(),
      inboxMessages: new Map(),
      mediaFiles: new Map(),
      rules: new Map(),
      systemStatus: new Map(),
      apiUsage: [],
      activeSessions: new Map(),
    }

    // Save initial state to global variable
    global.__DATABASE_STATE__ = this.db
  }

  private createTables() {
    // This would create tables in a real database
    // For now, we're using in-memory storage
    if (!this.db) return

    // Tables are "created" as Maps in memory
    console.log('Tables initialized in memory')
  }

  getDatabase(): any {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  // Seed initial data if database is empty
  seedInitialData() {
    if (!this.db) return

    // Check if users exist - if they do, don't overwrite
    if (this.db.users.size > 0) {
      console.log(`Database already has ${this.db.users.size} users, skipping seed`)
      return
    }

    console.log('Seeding initial database data...')

    // Insert demo users
    const users = [
      {
        id: 'user-1',
        username: 'demo',
        email: 'demo@telstra.com',
        password: 'password123',
        role: 'user',
        credits: 796,
        personalMobile: '0412345678',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isActive: true,
      },
      {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@telstra.com',
        password: 'admin123',
        role: 'admin',
        credits: 10000,
        personalMobile: '0412345679',
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        lastLogin: new Date().toISOString(),
        isActive: true,
      },
      {
        id: 'user-2',
        username: 'john.doe',
        email: 'john.doe@company.com',
        password: 'password123',
        role: 'user',
        credits: 450,
        personalMobile: '0412345680',
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        lastLogin: new Date(Date.now() - 86400000 * 2).toISOString(),
        isActive: true,
      },
      {
        id: 'user-3',
        username: 'jane.smith',
        email: 'jane.smith@company.com',
        password: 'password123',
        role: 'user',
        credits: 120,
        personalMobile: '0412345681',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        lastLogin: new Date(Date.now() - 86400000).toISOString(),
        isActive: false,
      },
    ]

    users.forEach(user => {
      // Ensure dates are properly converted to Date objects
      const userWithDates = {
        ...user,
        createdAt: new Date(user.createdAt),
        lastLogin: new Date(user.lastLogin),
      }
      this.db.users.set(user.id, userWithDates)
    })

    // Insert some sample messages
    const messages = [
      {
        id: 'msg-1',
        userId: 'user-1',
        type: 'sms',
        fromNumber: 'PersonalMobile',
        toNumbers: '["0412345678"]',
        content: 'Welcome to the messaging app!',
        status: 'sent',
        credits: 1,
        isTemplate: false,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'msg-2',
        userId: 'user-1',
        type: 'mms',
        fromNumber: 'PersonalMobile',
        toNumbers: '["0412345678"]',
        content: 'Check out this image!',
        status: 'delivered',
        credits: 3,
        isTemplate: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]

    messages.forEach(message => {
      this.db.messages.set(message.id, message)
    })

    console.log('Initial data seeded successfully')

    // Save state to global variable after seeding
    global.__DATABASE_STATE__ = this.db
  }

  close() {
    if (this.db && typeof this.db.close === 'function') {
      this.db.close()
      this.db = null
    }
    // Clear global state when closing
    global.__DATABASE_STATE__ = null
  }
}

// Singleton instance
export const databaseConnection = new DatabaseConnection()
