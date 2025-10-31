import "server-only"
import { PrismaClient } from '@prisma/client'
import type { User, Contact, ContactGroup, Message, MessageTemplate, Rule, InboxMessage, MediaFile, ApiUsage, SystemStatus, Analytics } from "./types"

// Extend Prisma types to match our application types
export interface PrismaMessage {
  id: string
  userId: string
  to: string
  from?: string
  content: string
  type: string
  status: string
  credits: number
  isTemplate: boolean
  createdAt: Date
  sentAt?: Date
  deliveredAt?: Date
  scheduledAt?: Date
  templateName?: string
}

export interface PrismaSystemStatusMessage {
  id: string
  userId: string
  type: string
  message: string
  timestamp: Date
}

export interface PrismaApiUsageRecord {
  id: string
  userId: string
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: Date
}

export interface PrismaActiveSession {
  id: string
  userId: string
  lastActivity: Date
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'], //['query']
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export class PrismaDatabase {
  private prisma = prisma

  // Helper: safely parse stored recipient arrays/strings
  private parseRecipients(val: any): string[] {
    if (!val) return []
    if (Array.isArray(val)) return val.map(String)
    if (typeof val === 'string') {
      const s = val.trim()
      if (s === '') return []
      if (s.startsWith('[')) {
        try {
          const parsed = JSON.parse(s)
          return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
        } catch (e) {
          // legacy: stored as plain string that happens to start with [ or malformed JSON
          return [s]
        }
      }
      return [s]
    }
    try {
      return [String(val)]
    } catch (e) {
      return []
    }
  }

  // Helper: safely parse JSON strings into objects with fallback
  private parseJSONSafe<T = any>(val: any, fallback: T): T {
    if (val === null || val === undefined) return fallback
    if (typeof val !== 'string') return val as T
    try {
      return JSON.parse(val) as T
    } catch (e) {
      return fallback
    }
  }

  async initialize() {
    try {
      // Ensure the database connection is established
      await this.prisma.$connect()
      console.log('✅ Prisma database connected successfully')
    } catch (error) {
      console.error('❌ Failed to connect to Prisma database:', error)
      throw error
    }
    return Promise.resolve()
  }

  // User methods
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        messages: true,
        contacts: true,
        templates: true,
        rules: true,
        inboxMessages: true,
        mediaFiles: true,
        systemStatus: true,
        apiUsage: true,
      }
    })

    return users.map((user: any) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      credits: user.credits,
      personalMobile: user.personalMobile || undefined,
      displayName: user.displayName || undefined,
      timezone: user.timezone || undefined,
      language: user.language || undefined,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    })) as User[]
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        messages: true,
        contacts: true,
        templates: true,
        rules: true,
        inboxMessages: true,
        mediaFiles: true,
        systemStatus: true,
        apiUsage: true,
      }
    })

    if (!user) return null

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      credits: user.credits,
      personalMobile: user.personalMobile || undefined,
      displayName: user.displayName || undefined,
      timezone: user.timezone || undefined,
      language: user.language || undefined,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    } as User
  }

  async getUsersByRole(role: string) {
    const users = await this.prisma.user.findMany({
      where: { role },
      include: {
        messages: true,
        contacts: true,
        templates: true,
        rules: true,
        inboxMessages: true,
        mediaFiles: true,
        systemStatus: true,
        apiUsage: true,
      }
    })

    return users.map((user: any) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      credits: user.credits,
      personalMobile: user.personalMobile || undefined,
      displayName: user.displayName || undefined,
      timezone: user.timezone || undefined,
      language: user.language || undefined,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    })) as User[]
  }

  async createUser(userData: Omit<User, "id" | "createdAt">) {
    const user = await this.prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        credits: userData.credits,
        personalMobile: userData.personalMobile,
        displayName: userData.displayName,
        timezone: userData.timezone,
        language: userData.language,
        lastLogin: userData.lastLogin,
        isActive: userData.isActive ?? true,
      }
    })

    // Initialize system status for new user
    await this.addSystemMessage(user.id, 'info', 'User account created')

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      credits: user.credits,
      personalMobile: user.personalMobile || undefined,
      displayName: user.displayName || undefined,
      timezone: user.timezone || undefined,
      language: user.language || undefined,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    } as User
  }

  async updateUser(userId: string, updates: Partial<User>) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: updates.username,
        email: updates.email,
        password: updates.password,
        role: updates.role,
        credits: updates.credits,
        personalMobile: updates.personalMobile,
        displayName: updates.displayName,
        timezone: updates.timezone,
        language: updates.language,
        lastLogin: updates.lastLogin,
        isActive: updates.isActive,
      }
    })

    return this.getUserById(userId)
  }

  async updateUserCredits(userId: string, credits: number): Promise<boolean> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { credits }
    })
    return true
  }

  async deleteUser(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId }
    })
    return true
  }

  async getUserByCredentials(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        username,
        password,
        isActive: true
      }
    })

    if (user) {
      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      })

      // Track user activity
      await this.trackUserActivity(user.id)

      return this.getUserById(user.id)
    }

    return null
  }

  async trackUserActivity(userId: string): Promise<void> {
    await this.prisma.activeSession.upsert({
      where: { userId },
      update: {
        lastActivity: new Date()
      },
      create: {
        userId,
        lastActivity: new Date()
      }
    })
  }

  async getActiveUsersCount(): Promise<number> {
    return this.prisma.activeSession.count()
  }

  async logAPICall(userId: string, endpoint: string, method: string, responseTime: number, statusCode: number) {
    try {
      // First check if the user exists to avoid foreign key constraint errors
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      })

      if (!userExists) {
        // Log API call without user association for monitoring purposes
        console.log(`[API LOG] ${method} ${endpoint} - User ${userId} not found, logging without user association`)
        await this.prisma.apiUsage.create({
          data: {
            userId: null, // Explicitly set to null since user doesn't exist
            endpoint,
            method,
            statusCode,
            responseTime,
          }
        })
      } else {
        // User exists, log normally
        await this.prisma.apiUsage.create({
          data: {
            userId,
            endpoint,
            method,
            statusCode,
            responseTime,
          }
        })
      }
    } catch (error) {
      // Log the error but don't let API logging break the main API functionality
      console.error("[API LOG ERROR]", error)
    }
  }

  async getSystemStatusMessages(userId: string): Promise<SystemStatus[]> {
    const statusMessages = await this.prisma.systemStatus.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    })

    return statusMessages.map((status: any) => ({
      id: status.id,
      userId: status.userId,
      type: status.type as any,
      message: status.message,
      timestamp: status.timestamp,
    })) as SystemStatus[]
  }

  async getSystemStatus(userId: string): Promise<SystemStatus | null> {
    const statusMessage = await this.prisma.systemStatus.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    })

    if (!statusMessage) return null

    return {
      id: statusMessage.id,
      userId: statusMessage.userId,
      type: statusMessage.type as any,
      message: statusMessage.message,
      timestamp: statusMessage.timestamp,
    } as SystemStatus
  }
  async getRecentMessages(since: Date) {
    const messages = await this.prisma.message.findMany({
      where: {
        createdAt: {
          gte: since
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return messages.map((msg: any) => ({
      id: msg.id,
      userId: msg.userId,
      to: this.parseRecipients(msg.to),
      from: msg.from || undefined,
      content: msg.content,
      type: msg.type as "sms" | "mms",
      status: msg.status,
      credits: msg.credits,
      isTemplate: msg.isTemplate,
      createdAt: msg.createdAt,
      sentAt: msg.sentAt || undefined,
      deliveredAt: msg.deliveredAt || undefined,
      scheduledAt: msg.scheduledAt || undefined,
      templateName: msg.templateName || undefined,
    })) as Message[]
  }

  async getRecentAPICalls(since: Date): Promise<ApiUsage[]> {
    const apiCalls = await this.prisma.apiUsage.findMany({
      where: {
        timestamp: {
          gte: since
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    return apiCalls.map((call: any) => ({
      id: call.id,
      userId: call.userId,
      endpoint: call.endpoint,
      method: call.method,
      statusCode: call.statusCode,
      responseTime: call.responseTime,
      timestamp: call.timestamp,
    })) as ApiUsage[]
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId }
    })

    if (!message) return null

    return {
      id: message.id,
      userId: message.userId,
      to: this.parseRecipients(message.to),
      from: message.from || undefined,
      content: message.content,
      type: message.type as "sms" | "mms",
      status: message.status,
      credits: message.credits,
      isTemplate: message.isTemplate,
      createdAt: message.createdAt,
      sentAt: message.sentAt || undefined,
      deliveredAt: message.deliveredAt || undefined,
      scheduledAt: message.scheduledAt || undefined,
      templateName: message.templateName || undefined,
    } as Message
  }

  async addMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
    const newMessage = await this.prisma.message.create({
      data: {
        userId: message.userId,
        to: JSON.stringify(message.to),
        from: message.from,
        content: message.content,
        type: message.type,
        status: message.status,
        credits: message.credits,
        isTemplate: message.isTemplate,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        scheduledAt: message.scheduledAt,
        templateName: message.templateName,
      }
    })

    return this.getMessageById(newMessage.id) as Promise<Message>
  }

  async getContactsByUserId(userId: string): Promise<Contact[]> {
    const contacts = await this.prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return contacts.map((contact: any) => ({
      id: contact.id,
      userId: contact.userId,
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      email: contact.email || undefined,
      category: contact.category as "company" | "personal",
      createdAt: contact.createdAt,
    })) as Contact[]
  }

  // Return all contacts across all users (admin use)
  async getAllContacts(): Promise<Contact[]> {
    const contacts = await this.prisma.contact.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return contacts.map((contact: any) => ({
      id: contact.id,
      userId: contact.userId,
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      email: contact.email || undefined,
      category: contact.category as "company" | "personal",
      createdAt: contact.createdAt,
    })) as Contact[]
  }

  async getContactById(contactId: string): Promise<Contact | null> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId }
    })

    if (!contact) return null

    return {
      id: contact.id,
      userId: contact.userId,
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      email: contact.email || undefined,
      category: contact.category as "company" | "personal",
      createdAt: contact.createdAt,
    } as Contact
  }

  async deleteContact(contactId: string): Promise<boolean> {
    await this.prisma.contact.delete({
      where: { id: contactId }
    })
    return true
  }

  async addContact(contact: Omit<Contact, "id" | "createdAt">): Promise<Contact> {
    const newContact = await this.prisma.contact.create({
      data: {
        userId: contact.userId,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        email: contact.email,
        category: contact.category,
      }
    })

    return {
      id: newContact.id,
      userId: newContact.userId,
      name: newContact.name,
      phoneNumber: newContact.phoneNumber,
      email: newContact.email || undefined,
      category: newContact.category as "company" | "personal",
      createdAt: newContact.createdAt,
    } as Contact
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact | null> {
    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        name: updates.name,
        phoneNumber: updates.phoneNumber,
        email: updates.email,
        category: updates.category,
      }
    })

    return this.getContactById(contactId)
  }

  async updateTemplate(templateId: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate | null> {
    await this.prisma.messageTemplate.update({
      where: { id: templateId },
      data: {
        name: updates.name,
        content: updates.content,
        category: updates.category,
      }
    })

    return this.getTemplateById(templateId)
  }

  async getTemplateById(templateId: string): Promise<MessageTemplate | null> {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) return null

    return {
      id: template.id,
      userId: template.userId,
      name: template.name,
      content: template.content,
      category: template.category as "personal" | "company",
      createdAt: template.createdAt,
    } as MessageTemplate
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    await this.prisma.messageTemplate.delete({
      where: { id: templateId }
    })
    return true
  }

  async getAllTemplates(): Promise<MessageTemplate[]> {
    const templates = await this.prisma.messageTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return templates.map((template: any) => ({
      id: template.id,
      userId: template.userId,
      name: template.name,
      content: template.content,
      category: template.category as "personal" | "company",
      createdAt: template.createdAt,
    })) as MessageTemplate[]
  }

  async getMessagesByUserId(userId: string): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return messages.map((msg: any) => ({
      id: msg.id,
      userId: msg.userId,
      to: this.parseRecipients(msg.to),
      from: msg.from || undefined,
      content: msg.content,
      type: msg.type as "sms" | "mms",
      status: msg.status,
      credits: msg.credits,
      isTemplate: msg.isTemplate,
      createdAt: msg.createdAt,
      sentAt: msg.sentAt || undefined,
      deliveredAt: msg.deliveredAt || undefined,
      scheduledAt: msg.scheduledAt || undefined,
      templateName: msg.templateName || undefined,
    })) as Message[]
  }

  async getInboxMessagesByUserId(userId: string): Promise<InboxMessage[]> {
    const messages = await this.prisma.inboxMessage.findMany({
      where: { userId },
      orderBy: { receivedAt: 'desc' }
    })

    return messages.map((msg: any) => ({
      id: msg.id,
      userId: msg.userId,
      from: msg.from,
      to: msg.to,
      subject: msg.subject || undefined,
      content: msg.content,
      type: msg.type as "sms" | "mms",
      receivedAt: msg.receivedAt,
      read: msg.read,
      folder: msg.folder as "personal" | "company",
    })) as InboxMessage[]
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    await this.prisma.inboxMessage.update({
      where: { id: messageId },
      data: { read: true }
    })
    return true
  }

  async markAllInboxMessagesAsRead(userId: string): Promise<boolean> {
    await this.prisma.inboxMessage.updateMany({
      where: { userId },
      data: { read: true }
    })
    return true
  }

  async getInboxMessageById(messageId: string): Promise<InboxMessage | null> {
    const message = await this.prisma.inboxMessage.findUnique({
      where: { id: messageId }
    })

    if (!message) return null

    return {
      id: message.id,
      userId: message.userId,
      from: message.from,
      to: message.to,
      subject: message.subject || undefined,
      content: message.content,
      type: message.type as "sms" | "mms",
      receivedAt: message.receivedAt,
      read: message.read,
      folder: message.folder as "personal" | "company",
    } as InboxMessage
  }

  async deleteInboxMessage(messageId: string): Promise<boolean> {
    await this.prisma.inboxMessage.delete({
      where: { id: messageId }
    })
    return true
  }

  async getAllMediaFiles(): Promise<MediaFile[]> {
    const files = await this.prisma.mediaFile.findMany({
      orderBy: { uploadedAt: 'desc' }
    })

    return files.map((file: any) => ({
      id: file.id,
      userId: file.userId,
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      type: file.type,
      url: file.url,
      uploadedAt: file.uploadedAt,
    })) as MediaFile[]
  }

  async getMediaFilesByUserId(userId: string): Promise<MediaFile[]> {
    const files = await this.prisma.mediaFile.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' }
    })

    return files.map((file: any) => ({
      id: file.id,
      userId: file.userId,
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      type: file.type,
      url: file.url,
      uploadedAt: file.uploadedAt,
    })) as MediaFile[]
  }

  async addMediaFile(mediaFile: Omit<MediaFile, "id" | "uploadedAt">): Promise<MediaFile> {
    const newFile = await this.prisma.mediaFile.create({
      data: {
        userId: mediaFile.userId,
        filename: mediaFile.filename,
        originalName: mediaFile.originalName,
        size: mediaFile.size,
        type: mediaFile.type,
        url: mediaFile.url,
      }
    })

    return {
      id: newFile.id,
      userId: newFile.userId,
      filename: newFile.filename,
      originalName: newFile.originalName,
      size: newFile.size,
      type: newFile.type,
      url: newFile.url,
      uploadedAt: newFile.uploadedAt,
    } as MediaFile
  }

  async getMediaFileById(fileId: string): Promise<MediaFile | null> {
    const file = await this.prisma.mediaFile.findUnique({
      where: { id: fileId }
    })

    if (!file) return null

    return {
      id: file.id,
      userId: file.userId,
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      type: file.type,
      url: file.url,
      uploadedAt: file.uploadedAt,
    } as MediaFile
  }

  async deleteMediaFile(fileId: string): Promise<boolean> {
    await this.prisma.mediaFile.delete({
      where: { id: fileId }
    })
    return true
  }

  async getAllRules(): Promise<Rule[]> {
    const rules = await this.prisma.rule.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return rules.map((rule: any) => ({
      id: rule.id,
      userId: rule.userId,
      name: rule.name,
      condition: this.parseJSONSafe(rule.condition, {}),
      action: this.parseJSONSafe(rule.action, {}),
      enabled: rule.enabled,
      createdAt: rule.createdAt,
    })) as Rule[]
  }

  async updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule | null> {
    await this.prisma.rule.update({
      where: { id: ruleId },
      data: {
        name: updates.name,
        condition: updates.condition ? JSON.stringify(updates.condition) : undefined,
        action: updates.action ? JSON.stringify(updates.action) : undefined,
        enabled: updates.enabled,
      }
    })

    return this.getRuleById(ruleId)
  }

  async getRuleById(ruleId: string): Promise<Rule | null> {
    const rule = await this.prisma.rule.findUnique({
      where: { id: ruleId }
    })

    if (!rule) return null

    return {
      id: rule.id,
      userId: rule.userId,
      name: rule.name,
      condition: this.parseJSONSafe(rule.condition, {}),
      action: this.parseJSONSafe(rule.action, {}),
      enabled: rule.enabled,
      createdAt: rule.createdAt,
    } as Rule
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    await this.prisma.rule.delete({
      where: { id: ruleId }
    })
    return true
  }

  async getRulesByUserId(userId: string): Promise<Rule[]> {
    const rules = await this.prisma.rule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return rules.map((rule: any) => ({
      id: rule.id,
      userId: rule.userId,
      name: rule.name,
      condition: this.parseJSONSafe(rule.condition, {}),
      action: this.parseJSONSafe(rule.action, {}),
      enabled: rule.enabled,
      createdAt: rule.createdAt,
    })) as Rule[]
  }

  async addRule(ruleData: Omit<Rule, "id" | "createdAt">): Promise<Rule> {
    const newRule = await this.prisma.rule.create({
      data: {
        userId: ruleData.userId,
        name: ruleData.name,
        condition: JSON.stringify(ruleData.condition),
        action: JSON.stringify(ruleData.action),
        enabled: ruleData.enabled,
      }
    })

    return {
      id: newRule.id,
      userId: newRule.userId,
      name: newRule.name,
      condition: this.parseJSONSafe(newRule.condition, {}),
      action: this.parseJSONSafe(newRule.action, {}),
      enabled: newRule.enabled,
      createdAt: newRule.createdAt,
    } as Rule
  }

  async addSystemMessage(userId: string, type: "success" | "error" | "info" | "warning", message: string) {
    await this.prisma.systemStatus.create({
      data: {
        userId,
        type,
        message,
      }
    })
  }

  async getAnalytics(period: string): Promise<Analytics> {
    // For now, return a simple default structure
    // TODO: Implement proper analytics queries when needed
    return {
      overview: {
        totalMessages: 0,
        smsCount: 0,
        mmsCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        deliveryRate: 0,
        activeUsers: 0,
        newUsers: 0,
        totalAPICalls: 0,
        avgResponseTime: 0,
        errorRate: 0,
      },
      dailyStats: [],
      topEndpoints: [],
      topUsers: [],
    }
  }

  async getTemplatesByUserId(userId: string): Promise<MessageTemplate[]> {
    const templates = await this.prisma.messageTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return templates.map((template: any) => ({
      id: template.id,
      userId: template.userId,
      name: template.name,
      content: template.content,
      category: template.category as "personal" | "company",
      createdAt: template.createdAt,
    })) as MessageTemplate[]
  }

  async addTemplate(template: Omit<MessageTemplate, "id" | "createdAt">): Promise<MessageTemplate> {
    const newTpl = await this.prisma.messageTemplate.create({
      data: {
        userId: template.userId,
        name: template.name,
        content: template.content,
        category: template.category,
      }
    })

    return {
      id: newTpl.id,
      userId: newTpl.userId,
      name: newTpl.name,
      content: newTpl.content,
      category: newTpl.category as "personal" | "company",
      createdAt: newTpl.createdAt,
    } as MessageTemplate
  }

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<Message | null> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        to: updates.to ? JSON.stringify(updates.to) : undefined,
        from: updates.from,
        content: updates.content,
        type: updates.type,
        status: updates.status,
        credits: updates.credits,
        isTemplate: updates.isTemplate,
        sentAt: updates.sentAt,
        deliveredAt: updates.deliveredAt,
        scheduledAt: updates.scheduledAt,
        templateName: updates.templateName,
      }
    })

    return this.getMessageById(messageId)
  }
  async getDatabaseState() {
    const [
      userCount,
      messageCount,
      contactCount,
      templateCount,
      inboxMessageCount,
      mediaFileCount,
      ruleCount,
      apiUsageCount,
      systemStatusCount,
      activeSessionCount
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.message.count(),
      this.prisma.contact.count(),
      this.prisma.messageTemplate.count(),
      this.prisma.inboxMessage.count(),
      this.prisma.mediaFile.count(),
      this.prisma.rule.count(),
      this.prisma.apiUsage.count(),
      this.prisma.systemStatus.count(),
      this.prisma.activeSession.count(),
    ])

    return {
      users: userCount,
      messages: messageCount,
      contacts: contactCount,
      templates: templateCount,
      inbox_messages: inboxMessageCount,
      media_files: mediaFileCount,
      rules: ruleCount,
      api_usage: apiUsageCount,
      system_status: systemStatusCount,
      active_sessions: activeSessionCount,
    }
  }
}

export const db = new PrismaDatabase()
