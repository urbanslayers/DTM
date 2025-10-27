"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.PrismaDatabase = void 0;
require("server-only");
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new client_1.PrismaClient({
    log: ['query', 'error', 'warn'],
});
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
class PrismaDatabase {
    constructor() {
        this.prisma = prisma;
    }
    async initialize() {
        try {
            // Ensure the database connection is established
            await this.prisma.$connect();
            console.log('✅ Prisma database connected successfully');
        }
        catch (error) {
            console.error('❌ Failed to connect to Prisma database:', error);
            throw error;
        }
        return Promise.resolve();
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
        });
        return users.map((user) => ({
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
        }));
    }
    async getUserById(userId) {
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
        });
        if (!user)
            return null;
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
        };
    }
    async getUsersByRole(role) {
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
        });
        return users.map((user) => ({
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
        }));
    }
    async createUser(userData) {
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
        });
        // Initialize system status for new user
        await this.addSystemMessage(user.id, 'info', 'User account created');
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
        };
    }
    async updateUser(userId, updates) {
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
        });
        return this.getUserById(userId);
    }
    async deleteUser(userId) {
        await this.prisma.user.delete({
            where: { id: userId }
        });
        return true;
    }
    async getUserByCredentials(username, password) {
        const user = await this.prisma.user.findFirst({
            where: {
                username,
                password,
                isActive: true
            }
        });
        if (user) {
            // Update last login
            await this.prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });
            // Track user activity
            await this.trackUserActivity(user.id);
            return this.getUserById(user.id);
        }
        return null;
    }
    async updateUserCredits(userId, credits) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { credits }
        });
        return true;
    }
    async trackUserActivity(userId) {
        await this.prisma.activeSession.upsert({
            where: { userId },
            update: {
                lastActivity: new Date()
            },
            create: {
                userId,
                lastActivity: new Date()
            }
        });
    }
    async getActiveUsersCount() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
        const activeSessions = await this.prisma.activeSession.findMany({
            where: {
                lastActivity: {
                    gte: fiveMinutesAgo
                }
            }
        });
        return activeSessions.length;
    }
    // Message methods
    async getRecentMessages(since) {
        const messages = await this.prisma.message.findMany({
            where: {
                createdAt: {
                    gte: since
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return messages.map((msg) => ({
            id: msg.id,
            userId: msg.userId,
            to: Array.isArray(msg.to) ? msg.to : JSON.parse(msg.to || '[]'),
            from: msg.from || undefined,
            content: msg.content,
            type: msg.type,
            status: msg.status,
            credits: msg.credits,
            isTemplate: msg.isTemplate,
            createdAt: msg.createdAt,
            sentAt: msg.sentAt || undefined,
            deliveredAt: msg.deliveredAt || undefined,
            scheduledAt: msg.scheduledAt || undefined,
            templateName: msg.templateName || undefined,
        }));
    }
    async getRecentAPICalls(since) {
        const apiCalls = await this.prisma.apiUsage.findMany({
            where: {
                timestamp: {
                    gte: since
                }
            },
            orderBy: { timestamp: 'desc' }
        });
        return apiCalls.map((call) => ({
            id: call.id,
            userId: call.userId,
            endpoint: call.endpoint,
            method: call.method,
            statusCode: call.statusCode,
            responseTime: call.responseTime,
            timestamp: call.timestamp,
        }));
    }
    async getMessagesByUserId(userId) {
        const messages = await this.prisma.message.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return messages.map((msg) => ({
            id: msg.id,
            userId: msg.userId,
            to: Array.isArray(msg.to) ? msg.to : JSON.parse(msg.to || '[]'),
            from: msg.from || undefined,
            content: msg.content,
            type: msg.type,
            status: msg.status,
            credits: msg.credits,
            isTemplate: msg.isTemplate,
            createdAt: msg.createdAt,
            sentAt: msg.sentAt || undefined,
            deliveredAt: msg.deliveredAt || undefined,
            scheduledAt: msg.scheduledAt || undefined,
            templateName: msg.templateName || undefined,
        }));
    }
    async addMessage(message) {
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
        });
        return {
            id: newMessage.id,
            userId: newMessage.userId,
            to: Array.isArray(newMessage.to) ? newMessage.to : JSON.parse(newMessage.to || '[]'),
            from: newMessage.from || undefined,
            content: newMessage.content,
            type: newMessage.type,
            status: newMessage.status,
            credits: newMessage.credits,
            isTemplate: newMessage.isTemplate,
            createdAt: newMessage.createdAt,
            sentAt: newMessage.sentAt || undefined,
            deliveredAt: newMessage.deliveredAt || undefined,
            scheduledAt: newMessage.scheduledAt || undefined,
            templateName: newMessage.templateName || undefined,
        };
    }
    async updateMessage(messageId, updates) {
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
        });
        return this.getMessageById(messageId);
    }
    async getMessageById(messageId) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId }
        });
        if (!message)
            return null;
        return {
            id: message.id,
            userId: message.userId,
            to: Array.isArray(message.to) ? message.to : JSON.parse(message.to || '[]'),
            from: message.from || undefined,
            content: message.content,
            type: message.type,
            status: message.status,
            credits: message.credits,
            isTemplate: message.isTemplate,
            createdAt: message.createdAt,
            sentAt: message.sentAt || undefined,
            deliveredAt: message.deliveredAt || undefined,
            scheduledAt: message.scheduledAt || undefined,
            templateName: message.templateName || undefined,
        };
    }
    // Contact methods
    async getContactsByUserId(userId) {
        const contacts = await this.prisma.contact.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        });
        return contacts.map((contact) => ({
            id: contact.id,
            userId: contact.userId,
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            email: contact.email || undefined,
            category: contact.category,
            createdAt: contact.createdAt,
        }));
    }
    async addContact(contact) {
        const newContact = await this.prisma.contact.create({
            data: {
                userId: contact.userId,
                name: contact.name,
                phoneNumber: contact.phoneNumber,
                email: contact.email,
                category: contact.category,
            }
        });
        return {
            id: newContact.id,
            userId: newContact.userId,
            name: newContact.name,
            phoneNumber: newContact.phoneNumber,
            email: newContact.email || undefined,
            category: newContact.category,
            createdAt: newContact.createdAt,
        };
    }
    async deleteContact(contactId) {
        await this.prisma.contact.delete({
            where: { id: contactId }
        });
        return true;
    }
    async updateContact(contactId, updates) {
        await this.prisma.contact.update({
            where: { id: contactId },
            data: {
                name: updates.name,
                phoneNumber: updates.phoneNumber,
                email: updates.email,
                category: updates.category,
            }
        });
        return this.getContactById(contactId);
    }
    async getContactById(contactId) {
        const contact = await this.prisma.contact.findUnique({
            where: { id: contactId }
        });
        if (!contact)
            return null;
        return {
            id: contact.id,
            userId: contact.userId,
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            email: contact.email || undefined,
            category: contact.category,
            createdAt: contact.createdAt,
        };
    }
    async getAllContacts() {
        const contacts = await this.prisma.contact.findMany({
            orderBy: { name: 'asc' }
        });
        return contacts.map((contact) => ({
            id: contact.id,
            userId: contact.userId,
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            email: contact.email || undefined,
            category: contact.category,
            createdAt: contact.createdAt,
        }));
    }
    async updateTemplate(templateId, updates) {
        await this.prisma.messageTemplate.update({
            where: { id: templateId },
            data: {
                name: updates.name,
                content: updates.content,
                category: updates.category,
            }
        });
        return this.getTemplateById(templateId);
    }
    async getTemplateById(templateId) {
        const template = await this.prisma.messageTemplate.findUnique({
            where: { id: templateId }
        });
        if (!template)
            return null;
        return {
            id: template.id,
            userId: template.userId,
            name: template.name,
            content: template.content,
            category: template.category,
            createdAt: template.createdAt,
        };
    }
    async deleteTemplate(templateId) {
        await this.prisma.messageTemplate.delete({
            where: { id: templateId }
        });
        return true;
    }
    async getAllTemplates() {
        const templates = await this.prisma.messageTemplate.findMany({
            orderBy: { name: 'asc' }
        });
        return templates.map((template) => ({
            id: template.id,
            userId: template.userId,
            name: template.name,
            content: template.content,
            category: template.category,
            createdAt: template.createdAt,
        }));
    }
    async getAllRules() {
        const rules = await this.prisma.rule.findMany({
            orderBy: { name: 'asc' }
        });
        return rules.map((rule) => ({
            id: rule.id,
            userId: rule.userId,
            name: rule.name,
            condition: JSON.parse(rule.condition),
            action: JSON.parse(rule.action),
            enabled: rule.enabled,
            createdAt: rule.createdAt,
        }));
    }
    async getAllMediaFiles() {
        const files = await this.prisma.mediaFile.findMany({
            orderBy: { uploadedAt: 'desc' }
        });
        return files.map((file) => ({
            id: file.id,
            userId: file.userId,
            filename: file.filename,
            originalName: file.originalName,
            size: file.size,
            type: file.type,
            url: file.url,
            uploadedAt: file.uploadedAt,
        }));
    }
    async getTemplatesByUserId(userId) {
        const templates = await this.prisma.messageTemplate.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        });
        return templates.map((template) => ({
            id: template.id,
            userId: template.userId,
            name: template.name,
            content: template.content,
            category: template.category,
            createdAt: template.createdAt,
        }));
    }
    async addTemplate(template) {
        const newTemplate = await this.prisma.messageTemplate.create({
            data: {
                userId: template.userId,
                name: template.name,
                content: template.content,
                category: template.category,
            }
        });
        return {
            id: newTemplate.id,
            userId: newTemplate.userId,
            name: newTemplate.name,
            content: newTemplate.content,
            category: newTemplate.category,
            createdAt: newTemplate.createdAt,
        };
    }
    // Rule methods
    async getRulesByUserId(userId) {
        const rules = await this.prisma.rule.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        });
        return rules.map((rule) => ({
            id: rule.id,
            userId: rule.userId,
            name: rule.name,
            condition: JSON.parse(rule.condition),
            action: JSON.parse(rule.action),
            enabled: rule.enabled,
            createdAt: rule.createdAt,
        }));
    }
    async addRule(rule) {
        const newRule = await this.prisma.rule.create({
            data: {
                userId: rule.userId,
                name: rule.name,
                condition: JSON.stringify(rule.condition),
                action: JSON.stringify(rule.action),
                enabled: rule.enabled,
            }
        });
        return {
            id: newRule.id,
            userId: newRule.userId,
            name: newRule.name,
            condition: JSON.parse(newRule.condition),
            action: JSON.parse(newRule.action),
            enabled: newRule.enabled,
            createdAt: newRule.createdAt,
        };
    }
    async updateRule(ruleId, updates) {
        await this.prisma.rule.update({
            where: { id: ruleId },
            data: {
                name: updates.name,
                condition: updates.condition ? JSON.stringify(updates.condition) : undefined,
                action: updates.action ? JSON.stringify(updates.action) : undefined,
                enabled: updates.enabled,
            }
        });
        return this.getRuleById(ruleId);
    }
    async getRuleById(ruleId) {
        const rule = await this.prisma.rule.findUnique({
            where: { id: ruleId }
        });
        if (!rule)
            return null;
        return {
            id: rule.id,
            userId: rule.userId,
            name: rule.name,
            condition: JSON.parse(rule.condition),
            action: JSON.parse(rule.action),
            enabled: rule.enabled,
            createdAt: rule.createdAt,
        };
    }
    async deleteRule(ruleId) {
        await this.prisma.rule.delete({
            where: { id: ruleId }
        });
        return true;
    }
    // Inbox message methods
    async getInboxMessagesByUserId(userId) {
        const messages = await this.prisma.inboxMessage.findMany({
            where: { userId },
            orderBy: { receivedAt: 'desc' }
        });
        return messages.map((msg) => ({
            id: msg.id,
            userId: msg.userId,
            from: msg.from,
            to: msg.to,
            subject: msg.subject || undefined,
            content: msg.content,
            type: msg.type,
            receivedAt: msg.receivedAt,
            read: msg.read,
            folder: msg.folder,
        }));
    }
    async markMessageAsRead(messageId) {
        await this.prisma.inboxMessage.update({
            where: { id: messageId },
            data: { read: true }
        });
        return true;
    }
    async getInboxMessageById(messageId) {
        const message = await this.prisma.inboxMessage.findUnique({
            where: { id: messageId }
        });
        if (!message)
            return null;
        return {
            id: message.id,
            userId: message.userId,
            from: message.from,
            to: message.to,
            subject: message.subject || undefined,
            content: message.content,
            type: message.type,
            receivedAt: message.receivedAt,
            read: message.read,
            folder: message.folder,
        };
    }
    async deleteInboxMessage(messageId) {
        await this.prisma.inboxMessage.delete({
            where: { id: messageId }
        });
        return true;
    }
    // Media file methods
    async getMediaFilesByUserId(userId) {
        const files = await this.prisma.mediaFile.findMany({
            where: { userId },
            orderBy: { uploadedAt: 'desc' }
        });
        return files.map((file) => ({
            id: file.id,
            userId: file.userId,
            filename: file.filename,
            originalName: file.originalName,
            size: file.size,
            type: file.type,
            url: file.url,
            uploadedAt: file.uploadedAt,
        }));
    }
    async addMediaFile(mediaFile) {
        const newFile = await this.prisma.mediaFile.create({
            data: {
                userId: mediaFile.userId,
                filename: mediaFile.filename,
                originalName: mediaFile.originalName,
                size: mediaFile.size,
                type: mediaFile.type,
                url: mediaFile.url,
            }
        });
        return {
            id: newFile.id,
            userId: newFile.userId,
            filename: newFile.filename,
            originalName: newFile.originalName,
            size: newFile.size,
            type: newFile.type,
            url: newFile.url,
            uploadedAt: newFile.uploadedAt,
        };
    }
    async getMediaFileById(fileId) {
        const file = await this.prisma.mediaFile.findUnique({
            where: { id: fileId }
        });
        if (!file)
            return null;
        return {
            id: file.id,
            userId: file.userId,
            filename: file.filename,
            originalName: file.originalName,
            size: file.size,
            type: file.type,
            url: file.url,
            uploadedAt: file.uploadedAt,
        };
    }
    async deleteMediaFile(fileId) {
        await this.prisma.mediaFile.delete({
            where: { id: fileId }
        });
        return true;
    }
    // System status methods
    async addSystemMessage(userId, type, message) {
        await this.prisma.systemStatus.create({
            data: {
                userId,
                type,
                message,
            }
        });
    }
    async getSystemStatus(userId) {
        const messages = await this.prisma.systemStatus.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 50
        });
        if (messages.length === 0)
            return null;
        return {
            userId,
            messages: messages.map((msg) => ({
                id: msg.id,
                type: msg.type,
                message: msg.message,
                timestamp: msg.timestamp,
            })),
        };
    }
    // API usage methods
    async logAPICall(userId, endpoint, method, responseTime, statusCode) {
        await this.prisma.apiUsage.create({
            data: {
                userId: userId || null, // Allow null for system/admin calls
                endpoint,
                method,
                statusCode,
                responseTime,
            }
        });
        return {
            id: `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            endpoint,
            method,
            timestamp: new Date(),
            responseTime,
            statusCode,
        };
    }
    // Analytics methods
    async getAnalytics(period) {
        const now = new Date();
        const periodDays = period === "1d" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const startDate = new Date(now.getTime() - periodDays * 86400000);
        // Get messages for the period
        const messages = await this.prisma.message.findMany({
            where: {
                createdAt: {
                    gte: startDate
                }
            }
        });
        // Get API calls for the period
        const apiCalls = await this.prisma.apiUsage.findMany({
            where: {
                timestamp: {
                    gte: startDate
                }
            }
        });
        // Get users
        const users = await this.prisma.user.findMany({
            where: {
                isActive: true
            }
        });
        const totalMessages = messages.length;
        const smsCount = messages.filter((msg) => msg.type === "sms").length;
        const mmsCount = messages.filter((msg) => msg.type === "mms").length;
        const deliveredCount = messages.filter((msg) => msg.status === "delivered").length;
        const failedCount = messages.filter((msg) => msg.status === "failed").length;
        const activeUsers = users.length;
        const newUsers = users.filter((user) => user.createdAt >= startDate).length;
        const totalAPICalls = apiCalls.length;
        const avgResponseTime = apiCalls.length > 0
            ? apiCalls.reduce((sum, call) => sum + call.responseTime, 0) / apiCalls.length
            : 0;
        const errorRate = apiCalls.length > 0
            ? (apiCalls.filter((call) => call.statusCode >= 400).length / apiCalls.length) * 100
            : 0;
        // Calculate daily stats
        const dailyStats = [];
        for (let i = periodDays - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 86400000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(date.getTime() + 86400000);
            const dayMessages = messages.filter((msg) => msg.createdAt >= dayStart && msg.createdAt < dayEnd);
            const dayAPICalls = apiCalls.filter((call) => call.timestamp >= dayStart && call.timestamp < dayEnd);
            dailyStats.push({
                date: dayStart.toISOString().split('T')[0],
                messages: dayMessages.length,
                apiCalls: dayAPICalls.length,
                errors: dayAPICalls.filter((call) => call.statusCode >= 400).length,
            });
        }
        return {
            overview: {
                totalMessages,
                smsCount,
                mmsCount,
                deliveredCount,
                failedCount,
                deliveryRate: totalMessages > 0 ? (deliveredCount / totalMessages) * 100 : 0,
                activeUsers,
                newUsers,
                totalAPICalls,
                avgResponseTime: Math.round(avgResponseTime),
                errorRate: Math.round(errorRate * 100) / 100,
            },
            dailyStats,
            topEndpoints: [], // TODO: Implement
            topUsers: [], // TODO: Implement
        };
    }
    // Database state method
    async getDatabaseState() {
        const [userCount, messageCount, contactCount, templateCount, inboxMessageCount, mediaFileCount, ruleCount, apiUsageCount, systemStatusCount, activeSessionCount] = await Promise.all([
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
        ]);
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
        };
    }
}
exports.PrismaDatabase = PrismaDatabase;
exports.db = new PrismaDatabase();
