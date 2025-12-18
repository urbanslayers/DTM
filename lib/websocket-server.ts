import type { Server as HTTPServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import { db } from "./database"

export interface AdminAlert {
  id: string
  type: "info" | "warning" | "error" | "success"
  title: string
  message: string
  timestamp: Date
  userId?: string
  metadata?: Record<string, any>
}

export interface SystemMetrics {
  timestamp: Date
  activeUsers: number
  messagesPerMinute: number
  apiCallsPerMinute: number
  errorRate: number
  avgResponseTime: number
  systemLoad: number
}

class WebSocketManager {
  private io: SocketIOServer | null = null
  private alerts: AdminAlert[] = []
  private connectedAdmins: Set<string> = new Set()
  private metricsInterval: NodeJS.Timeout | null = null

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: "/socket.io",
      transports: ['websocket', 'polling'],
      pingTimeout: 10000,
      pingInterval: 5000,
    })

    this.setupEventHandlers()
    this.startMetricsCollection()
    console.log('WebSocket server initialized')
  }

  // Alternative method to set Socket.IO instance directly (for custom server)
  setSocketIO(io: SocketIOServer) {
    this.io = io
    this.setupEventHandlers()
    this.startMetricsCollection()
  }

  private setupEventHandlers() {
    if (!this.io) return

    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id)

      // Send initial state to admins
      this.collectAndBroadcastMetrics()

      // Handle admin authentication
      socket.on("admin:authenticate", async (token: string) => {
        try {
          console.log('Admin authentication attempt')
          
          // Extract user ID from token format: user_<id>
          const userId = token.startsWith('user_') ? token.substring(5) : null;
          
          if (!userId) {
            console.log("Admin authentication failed: Invalid token format")
            socket.emit('admin:auth:error', 'Invalid authentication token')
            return
          }

          // Verify the user exists and is an admin
          const user = await db.getUserById(userId)
          
          if (!user) {
            console.log("Admin authentication failed: User not found")
            socket.emit('admin:auth:error', 'User not found')
            return
          }

          if (user.role !== 'admin') {
            console.log("Admin authentication failed: Not an admin user")
            socket.emit('admin:auth:error', 'Admin privileges required')
            return
          }

          // Admin authenticated successfully
          socket.join("admins")
          this.connectedAdmins.add(socket.id)

          // Send recent alerts to newly connected admin
          const alerts = await this.getRecentAlerts()
          socket.emit("admin:alerts:history", alerts)

          // Send current system metrics
          const metrics = await this.getCurrentMetrics()
          socket.emit("admin:metrics:update", metrics)

          // Track admin activity
          await db.trackUserActivity(userId)

          console.log("Admin authenticated:", socket.id)
          socket.emit('admin:auth:success')
        } catch (error) {
          console.error("Error during admin authentication:", error)
          socket.emit('admin:auth:error', 'Authentication failed')
        }
      })

      // Handle user authentication for regular users
      socket.on("user:authenticate", (userId: string) => {
        socket.join(`user:${userId}`)
        console.log("User authenticated:", userId)
      })

      // Handle disconnection
      socket.on("disconnect", () => {
        this.connectedAdmins.delete(socket.id)
        console.log("Client disconnected:", socket.id)
      })

      // Handle admin actions
      socket.on("admin:user:created", (userData) => {
        this.broadcastAlert({
          type: "success",
          title: "User Created",
          message: `New user "${userData.username}" has been created`,
          metadata: { userId: userData.id, action: "user_created" },
        })
      })

      socket.on("admin:user:updated", (userData) => {
        this.broadcastAlert({
          type: "info",
          title: "User Updated",
          message: `User "${userData.username}" has been updated`,
          metadata: { userId: userData.id, action: "user_updated" },
        })
      })

      socket.on("admin:user:deleted", (userData) => {
        this.broadcastAlert({
          type: "warning",
          title: "User Deleted",
          message: `User "${userData.username}" has been deleted`,
          metadata: { userId: userData.id, action: "user_deleted" },
        })
      })
    })
  }

  private startMetricsCollection() {
    // Stop any existing collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }

    // Collect initial metrics immediately
    this.collectAndBroadcastMetrics()

    // Then start regular collection every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.collectAndBroadcastMetrics()
    }, 50000)
  }

  private async collectAndBroadcastMetrics() {
    if (this.connectedAdmins.size === 0) {
      return // Don't collect metrics if no admins are connected
    }

    try {
      console.log('Collecting metrics...')
      const metrics = await this.getCurrentMetrics()
      console.log('Broadcasting metrics to admins:', metrics)
      this.broadcastToAdmins("admin:metrics:update", metrics)
    } catch (error) {
      console.error("Error collecting metrics:", error)
      this.broadcastAlert({
        type: "error",
        title: "Metrics Collection Error",
        message: error instanceof Error ? error.message : "Failed to collect system metrics",
      })
    }
  }

  private async getCurrentMetrics(): Promise<SystemMetrics> {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)
    const fiveMinutesAgo = new Date(now.getTime() - 300000)

    try {
      // Get recent activity from database with error handling
      const [
        recentMessages,
        recentAPICalls,
        activeUsers,
        dbState
      ] = await Promise.all([
        db.getRecentMessages(oneMinuteAgo).catch(err => {
          console.error('Failed to get recent messages:', err);
          return [];
        }),
        db.getRecentAPICalls(oneMinuteAgo).catch(err => {
          console.error('Failed to get recent API calls:', err);
          return [];
        }),
        db.getActiveUsersCount().catch(err => {
          console.error('Failed to get active users count:', err);
          return 0;
        }),
        db.getDatabaseState().catch(err => {
          console.error('Failed to get database state:', err);
          return null;
        })
      ]);

      // Calculate real system load based on DB connections and query times
      // Calculate system load based on API usage and active sessions
      const systemLoad = dbState ? 
        ((dbState.active_sessions / 100) * 100) + ((recentAPICalls.length / 100) * 20) :
        ((recentAPICalls.length / 100) * 100); // Fallback based on API load

      // Calculate error rate from the last 5 minutes of API calls for better sample size
      const extendedAPICalls = await db.getRecentAPICalls(fiveMinutesAgo).catch(() => []);
      
      const metrics = {
        timestamp: now,
        activeUsers,
        messagesPerMinute: recentMessages.length,
        apiCallsPerMinute: recentAPICalls.length,
        errorRate: this.calculateErrorRate(extendedAPICalls),
        avgResponseTime: this.calculateAvgResponseTime(recentAPICalls),
        systemLoad: Math.min(systemLoad, 100) // Cap at 100%
      };

      // Log metrics for debugging
      console.debug('Current system metrics:', metrics);
      
      return metrics;
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      // Return zeroed metrics rather than throwing
      return {
        timestamp: now,
        activeUsers: 0,
        messagesPerMinute: 0,
        apiCallsPerMinute: 0,
        errorRate: 0,
        avgResponseTime: 0,
        systemLoad: 0
      };
    }
  }

  private calculateErrorRate(apiCalls: any[]): number {
    if (apiCalls.length === 0) return 0
    const errors = apiCalls.filter((call) => call.statusCode >= 400).length
    return (errors / apiCalls.length) * 100
  }

  private calculateAvgResponseTime(apiCalls: any[]): number {
    if (apiCalls.length === 0) return 0
    const totalTime = apiCalls.reduce((sum, call) => sum + call.responseTime, 0)
    return totalTime / apiCalls.length
  }

  broadcastAlert(alert: Omit<AdminAlert, "id" | "timestamp">) {
    const fullAlert: AdminAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }

    this.alerts.unshift(fullAlert)

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100)
    }

    this.broadcastToAdmins("admin:alert:new", fullAlert)
  }

  broadcastToAdmins(event: string, data: any) {
    if (this.io) {
      this.io.to("admins").emit(event, data)
    }
  }

  broadcastToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data)
    }
  }

  notifyMessageSent(userId: string, messageData: any) {
    this.broadcastToUser(userId, "message:sent", messageData)
    this.broadcastAlert({
      type: "info",
      title: "Message Sent",
      message: `Message sent to ${messageData.recipients.length} recipient(s)`,
      userId,
      metadata: { messageId: messageData.id, recipients: messageData.recipients.length },
    })
  }

  notifySystemError(error: string, details?: any) {
    this.broadcastAlert({
      type: "error",
      title: "System Error",
      message: error,
      metadata: details,
    })
  }

  notifyHighUsage(metric: string, value: number, threshold: number) {
    this.broadcastAlert({
      type: "warning",
      title: "High Usage Alert",
      message: `${metric} is at ${value}, exceeding threshold of ${threshold}`,
      metadata: { metric, value, threshold },
    })
  }

  getConnectedAdminsCount(): number {
    return this.connectedAdmins.size
  }

  // Public methods for server.js compatibility
  async getRecentAlerts(limit = 50): Promise<AdminAlert[]> {
    return this.alerts.slice(0, limit)
  }

  cleanup() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    if (this.io) {
      this.io.close()
    }
  }
}

export const wsManager = new WebSocketManager()
