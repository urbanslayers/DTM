const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { wsManager } = require('./lib/websocket-server')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT, 10) || 3000

// Initialize Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  })

  // Initialize WebSocket manager with the Socket.IO instance
  wsManager.setSocketIO(io)

  // Handle Socket.IO connections
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Handle admin authentication
    socket.on('admin:authenticate', (token) => {
      console.log('Admin authentication attempt:', token)
      if (token === 'admin_token') {
        socket.join('admins')
        console.log('Admin authenticated:', socket.id)
        // Send current metrics and alerts
        socket.emit('admin:alerts:history', wsManager.getRecentAlerts ? wsManager.getRecentAlerts() : [])
        socket.emit('admin:metrics:update', wsManager.getCurrentMetrics ? wsManager.getCurrentMetrics() : {})
      }
    })

    // Handle user authentication
    socket.on('user:authenticate', (userId) => {
      socket.join(`user:${userId}`)
      console.log('User authenticated:', userId)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server initialized on path: /socket.io`)
  })
})
