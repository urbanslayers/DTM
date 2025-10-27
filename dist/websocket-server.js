"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsManager = void 0;
const socket_io_1 = require("socket.io");
const prisma_database_1 = require("./prisma-database");
class WebSocketManager {
    constructor() {
        this.io = null;
        this.alerts = [];
        this.connectedAdmins = new Set();
        this.metricsInterval = null;
    }
    initialize(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
            path: "/socket.io",
        });
        this.setupEventHandlers();
        this.startMetricsCollection();
    }
    // Alternative method to set Socket.IO instance directly (for custom server)
    setSocketIO(io) {
        this.io = io;
        this.setupEventHandlers();
        this.startMetricsCollection();
    }
    setupEventHandlers() {
        if (!this.io)
            return;
        this.io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);
            // Handle admin authentication
            socket.on("admin:authenticate", (token) => {
                console.log('Admin authentication attempt:', token);
                // In a real app, verify the JWT token
                if (token === "admin_token") {
                    socket.join("admins");
                    this.connectedAdmins.add(socket.id);
                    // Send recent alerts to newly connected admin
                    socket.emit("admin:alerts:history", this.getRecentAlerts());
                    // Send current system metrics
                    socket.emit("admin:metrics:update", this.getCurrentMetrics());
                    console.log("Admin authenticated:", socket.id);
                }
                else {
                    console.log("Admin authentication failed for token:", token);
                }
            });
            // Handle user authentication for regular users
            socket.on("user:authenticate", (userId) => {
                socket.join(`user:${userId}`);
                console.log("User authenticated:", userId);
            });
            // Handle disconnection
            socket.on("disconnect", () => {
                this.connectedAdmins.delete(socket.id);
                console.log("Client disconnected:", socket.id);
            });
            // Handle admin actions
            socket.on("admin:user:created", (userData) => {
                this.broadcastAlert({
                    type: "success",
                    title: "User Created",
                    message: `New user "${userData.username}" has been created`,
                    metadata: { userId: userData.id, action: "user_created" },
                });
            });
            socket.on("admin:user:updated", (userData) => {
                this.broadcastAlert({
                    type: "info",
                    title: "User Updated",
                    message: `User "${userData.username}" has been updated`,
                    metadata: { userId: userData.id, action: "user_updated" },
                });
            });
            socket.on("admin:user:deleted", (userData) => {
                this.broadcastAlert({
                    type: "warning",
                    title: "User Deleted",
                    message: `User "${userData.username}" has been deleted`,
                    metadata: { userId: userData.id, action: "user_deleted" },
                });
            });
        });
    }
    startMetricsCollection() {
        // Collect and broadcast metrics every 30 seconds
        this.metricsInterval = setInterval(async () => {
            try {
                const metrics = await this.getCurrentMetrics();
                this.broadcastToAdmins("admin:metrics:update", metrics);
            }
            catch (error) {
                console.error("Error collecting metrics:", error);
            }
        }, 30000);
    }
    async getCurrentMetrics() {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);
        // Get recent activity from database
        const recentMessages = await prisma_database_1.db.getRecentMessages(oneMinuteAgo);
        const recentAPICalls = await prisma_database_1.db.getRecentAPICalls(oneMinuteAgo);
        const activeUsers = await prisma_database_1.db.getActiveUsersCount();
        return {
            timestamp: now,
            activeUsers,
            messagesPerMinute: recentMessages.length,
            apiCallsPerMinute: recentAPICalls.length,
            errorRate: this.calculateErrorRate(recentAPICalls),
            avgResponseTime: this.calculateAvgResponseTime(recentAPICalls),
            systemLoad: Math.random() * 100, // Mock system load
        };
    }
    calculateErrorRate(apiCalls) {
        if (apiCalls.length === 0)
            return 0;
        const errors = apiCalls.filter((call) => call.statusCode >= 400).length;
        return (errors / apiCalls.length) * 100;
    }
    calculateAvgResponseTime(apiCalls) {
        if (apiCalls.length === 0)
            return 0;
        const totalTime = apiCalls.reduce((sum, call) => sum + call.responseTime, 0);
        return totalTime / apiCalls.length;
    }
    broadcastAlert(alert) {
        const fullAlert = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
        };
        this.alerts.unshift(fullAlert);
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(0, 100);
        }
        this.broadcastToAdmins("admin:alert:new", fullAlert);
    }
    broadcastToAdmins(event, data) {
        if (this.io) {
            this.io.to("admins").emit(event, data);
        }
    }
    broadcastToUser(userId, event, data) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }
    notifyMessageSent(userId, messageData) {
        this.broadcastToUser(userId, "message:sent", messageData);
        this.broadcastAlert({
            type: "info",
            title: "Message Sent",
            message: `Message sent to ${messageData.recipients.length} recipient(s)`,
            userId,
            metadata: { messageId: messageData.id, recipients: messageData.recipients.length },
        });
    }
    notifySystemError(error, details) {
        this.broadcastAlert({
            type: "error",
            title: "System Error",
            message: error,
            metadata: details,
        });
    }
    notifyHighUsage(metric, value, threshold) {
        this.broadcastAlert({
            type: "warning",
            title: "High Usage Alert",
            message: `${metric} is at ${value}, exceeding threshold of ${threshold}`,
            metadata: { metric, value, threshold },
        });
    }
    getConnectedAdminsCount() {
        return this.connectedAdmins.size;
    }
    // Public methods for server.js compatibility
    async getRecentAlerts(limit = 50) {
        return this.alerts.slice(0, limit);
    }
    cleanup() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        if (this.io) {
            this.io.close();
        }
    }
}
exports.wsManager = new WebSocketManager();
