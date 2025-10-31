#!/usr/bin/env node
// Fetch sent/received messages test script
// Usage:
//  node scripts/fetch-messages.js --host localhost --port 3000 --userId cmh3go54b0022ultkalaiq535 --direction incoming --limit 50 --offset 0 --reverse true --token "Bearer <token>"
// All params optional. Defaults: host=localhost, port=3000, limit=10, offset=0, direction=both (will fetch incoming and outgoing), startTime = now - 30 days, endTime = now

const http = require('http')
const https = require('https')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = args[i+1]
      if (!next || next.startsWith('--')) {
        out[key] = true
      } else {
        out[key] = next
        i++
      }
    }
  }
  return out
}

async function run() {
  const params = parseArgs()
  const host = params.host || 'localhost'
  const port = params.port ? Number(params.port) : 3000
  const userId = params.userId || 'cmh3go54b0022ultkalaiq535'
  const token = params.token || 'Bearer test'
  const limit = params.limit ? Math.min(50, Math.max(1, Number(params.limit))) : 10
  const offset = params.offset ? Math.max(0, Number(params.offset)) : 0
  const direction = params.direction || 'both' // 'incoming', 'outgoing', or 'both'
  const reverse = params.reverse === 'true' || params.reverse === true || false
  const status = params.status // optional
  const filter = params.filter // optional
  const protocol = params.protocol === 'https' ? 'https' : 'http'

  const endTime = params.endTime ? new Date(params.endTime) : new Date()
  const startTime = params.startTime ? new Date(params.startTime) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)

  const directions = direction === 'both' ? ['incoming', 'outgoing'] : [direction]

  for (const dir of directions) {
    const q = new URLSearchParams()
    q.append('userId', userId)
    q.append('direction', dir)
    q.append('limit', String(limit))
    q.append('offset', String(offset))
    if (reverse) q.append('reverse', 'true')
    if (status) q.append('status', status)
    if (filter) q.append('filter', filter)
    if (startTime) q.append('startTime', startTime.toISOString())
    if (endTime) q.append('endTime', endTime.toISOString())

    const path = `/api/messaging/inbox?${q.toString()}`

    console.log('\nFetching messages for direction:', dir)
    console.log('Request:', protocol + '://' + host + ':' + port + path)

    const lib = protocol === 'https' ? https : http
    const opts = {
      hostname: host,
      port,
      path,
      method: 'GET',
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
      }
    }

    await new Promise((resolve) => {
      const req = lib.request(opts, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (!json) {
              console.error('No JSON response')
              return resolve()
            }
            console.log('Status:', res.statusCode)
            if (json.success === false) {
              console.error('API returned error:', json.error || json)
              return resolve()
            }

            const messages = json.messages || json.data || []
            console.log('Messages returned:', messages.length)
            if (messages.length > 0) {
              console.log('First 5 messages (summary):')
              messages.slice(0, 5).forEach((m, i) => {
                const id = m.id || m.messageId || m.message_id || '<no-id>'
                const from = m.from || m.fromAddress || m.fromNumber || m.sender || ''
                const to = m.to || m.toAddress || m.toNumber || m.destination || ''
                const content = m.content || m.messageContent || m.message || ''
                const receivedAt = m.receivedAt || m.receivedTimestamp || m.createTimestamp || m.createTimestamp || m.createdAt || ''
                console.log(`#${i+1} id=${id} from=${from} to=${to} receivedAt=${receivedAt}`)
                console.log('    preview:', (String(content)).substring(0, 120))
              })
            }
          } catch (e) {
            console.error('Failed to parse response:', e.message)
            console.error('Raw response:', data.substring(0, 400))
          }
          resolve()
        })
      })

      req.on('error', (e) => {
        console.error('Request error:', e.message)
        resolve()
      })

      req.end()
    })
  }

  console.log('\nDone.')
}

run().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
