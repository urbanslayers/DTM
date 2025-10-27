import "server-only"
import { db as prismaDb } from "./prisma-database"
import type { User, Contact, ContactGroup, Message, MessageTemplate, SystemStatus, Rule, InboxMessage, MediaFile, ApiUsage, Analytics } from "./types"

// Enhanced database with persistent storage using Prisma
class Database {
  private db = prismaDb

  constructor() {
    // Database will be initialized when initialize() is called
  }

  async initialize() {
    await this.db.initialize()
    return Promise.resolve()
  }

  getAllUsers(): Promise<User[]> {
    return this.db.getAllUsers()
  }

  getUserById(userId: string): Promise<User | null> {
    return this.db.getUserById(userId)
  }

  getUsersByRole(role: string): Promise<User[]> {
    return this.db.getUsersByRole(role)
  }

  createUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    return this.db.createUser(userData)
  }

  updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    return this.db.updateUser(userId, updates)
  }

  deleteUser(userId: string): Promise<boolean> {
    return this.db.deleteUser(userId)
  }

  getUserByCredentials(username: string, password: string): Promise<User | null> {
    return this.db.getUserByCredentials(username, password)
  }

  updateUserCredits(userId: string, credits: number): Promise<boolean> {
    return this.db.updateUserCredits(userId, credits)
  }

  trackUserActivity(userId: string): Promise<void> {
    return this.db.trackUserActivity(userId)
  }

  getActiveUsersCount(): Promise<number> {
    return this.db.getActiveUsersCount()
  }

  logAPICall(userId: string, endpoint: string, method: string, responseTime: number, statusCode: number) {
    return this.db.logAPICall(userId, endpoint, method, responseTime, statusCode)
  }

  getRecentMessages(since: Date): Promise<Message[]> {
    return this.db.getRecentMessages(since)
  }

  getRecentAPICalls(since: Date): Promise<ApiUsage[]> {
    return this.db.getRecentAPICalls(since)
  }

  addSystemMessage(userId: string, type: "success" | "error" | "info" | "warning", message: string): Promise<void> {
    return this.db.addSystemMessage(userId, type, message)
  }

  getSystemStatus(userId: string): Promise<SystemStatus | null> {
    return this.db.getSystemStatus(userId)
  }

  getSystemStatusMessages(userId: string): Promise<SystemStatus[]> {
    return this.db.getSystemStatusMessages(userId)
  }

  getMessagesByUserId(userId: string): Promise<Message[]> {
    return this.db.getMessagesByUserId(userId)
  }

  addMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
    return this.db.addMessage(message)
  }

  updateMessage(messageId: string, updates: Partial<Message>): Promise<Message | null> {
    return this.db.updateMessage(messageId, updates)
  }

  getMessageById(messageId: string): Promise<Message | null> {
    return this.db.getMessageById(messageId)
  }

  getContactsByUserId(userId: string): Promise<Contact[]> {
    return this.db.getContactsByUserId(userId)
  }

  getContactById(contactId: string): Promise<Contact | null> {
    return this.db.getContactById(contactId)
  }

  updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact | null> {
    return this.db.updateContact(contactId, updates)
  }

  deleteContact(contactId: string): Promise<boolean> {
    return this.db.deleteContact(contactId)
  }

  addContact(contact: Omit<Contact, "id" | "createdAt">): Promise<Contact> {
    return this.db.addContact(contact)
  }

  updateTemplate(templateId: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate | null> {
    return this.db.updateTemplate(templateId, updates)
  }

  getTemplateById(templateId: string): Promise<MessageTemplate | null> {
    return this.db.getTemplateById(templateId)
  }

  deleteTemplate(templateId: string): Promise<boolean> {
    return this.db.deleteTemplate(templateId)
  }

  getAllTemplates(): Promise<MessageTemplate[]> {
    return this.db.getAllTemplates()
  }

  getTemplatesByUserId(userId: string): Promise<MessageTemplate[]> {
    return this.db.getTemplatesByUserId(userId)
  }

  getAllRules(): Promise<Rule[]> {
    return this.db.getAllRules()
  }

  getAllMediaFiles(): Promise<MediaFile[]> {
    return this.db.getAllMediaFiles()
  }

  updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule | null> {
    return this.db.updateRule(ruleId, updates)
  }

  getRuleById(ruleId: string): Promise<Rule | null> {
    return this.db.getRuleById(ruleId)
  }

  deleteRule(ruleId: string): Promise<boolean> {
    return this.db.deleteRule(ruleId)
  }

  getRulesByUserId(userId: string): Promise<Rule[]> {
    return this.db.getRulesByUserId(userId)
  }

  addRule(ruleData: Omit<Rule, "id" | "createdAt">): Promise<Rule> {
    return this.db.addRule(ruleData)
  }

  getInboxMessagesByUserId(userId: string): Promise<InboxMessage[]> {
    return this.db.getInboxMessagesByUserId(userId)
  }

  markMessageAsRead(messageId: string): Promise<boolean> {
    return this.db.markMessageAsRead(messageId)
  }

  getInboxMessageById(messageId: string): Promise<InboxMessage | null> {
    return this.db.getInboxMessageById(messageId)
  }

  deleteInboxMessage(messageId: string): Promise<boolean> {
    return this.db.deleteInboxMessage(messageId)
  }

  getMediaFilesByUserId(userId: string): Promise<MediaFile[]> {
    return this.db.getMediaFilesByUserId(userId)
  }

  addMediaFile(mediaFile: Omit<MediaFile, "id" | "uploadedAt">): Promise<MediaFile> {
    return this.db.addMediaFile(mediaFile)
  }

  getMediaFileById(fileId: string): Promise<MediaFile | null> {
    return this.db.getMediaFileById(fileId)
  }

  deleteMediaFile(fileId: string): Promise<boolean> {
    return this.db.deleteMediaFile(fileId)
  }

  getAnalytics(period: string): Promise<Analytics> {
    return this.db.getAnalytics(period)
  }

  getUsageStats(options: { userId?: string; startDate?: Date; endDate?: Date }) {
    // For now, return a simple default structure to fix the TypeError
    // TODO: Implement proper database queries when needed
    return Promise.resolve({
      messages: { total: 0, sms: 0, mms: 0, delivered: 0, failed: 0 },
      apiCalls: { total: 0, successful: 0, errors: 0, avgResponseTime: 0 },
      credits: { used: 0, remaining: null },
    })
  }

  getDatabaseState() {
    return this.db.getDatabaseState()
  }
}

export const db = new Database()

// Note: Database will be initialized when initialize() method is called
// This prevents immediate connection attempts that could bundle Prisma for browser
