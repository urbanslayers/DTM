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

  // Initialize Socket.IO with CORS and proper transport settings
  const io = new Server(server, {
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

  // Initialize WebSocket manager with the Socket.IO instance
  wsManager.setSocketIO(io)

  // Let the WebSocket manager handle all connection logic
  io.on('connection', (socket) => console.log('Client connected:', socket.id))

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server initialized on path: /socket.io`)
  })
})
