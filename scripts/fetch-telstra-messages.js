#!/usr/bin/env node
// Fetch Telstra messages directly (calls Telstra Messaging API v3)
// Usage example:
// node scripts/fetch-telstra-messages.js --token "Bearer <ACCESS_TOKEN>" --limit 25 --direction incoming --startTime "2025-09-29T00:00:00Z" --endTime "2025-10-29T23:59:59Z"

require('dotenv').config()
const https = require('https')
const http = require('http')

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
  const rawToken = params.token || process.env.TELSTRA_TOKEN

  async function acquireToken() {
    // If token supplied via CLI or env, use it
    if (rawToken) return rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`

    // Try internal auth route (Next.js API) if available
    const authUrl = params.authUrl || process.env.INTERNAL_AUTH_URL || process.env.INTERNAL_AUTH_ROUTE || 'http://localhost:3000/api/auth/token'
    try {
      console.log('[Auth] Requesting token from internal auth route:', authUrl)
      const u = new URL(authUrl)
      const lib = u.protocol === 'https:' ? https : http
      const body = ''
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      const tokenResp = await new Promise((resolve, reject) => {
        const req = lib.request(opts, (res) => {
          let data = ''
          res.on('data', (c) => data += c)
          res.on('end', () => resolve({ status: res.statusCode, body: data }))
        })
        req.on('error', (e) => reject(e))
        req.write(body)
        req.end()
      })

      const parsed = JSON.parse(tokenResp.body || '{}')
      if (parsed.access_token) {
        return parsed.access_token.startsWith('Bearer ') ? parsed.access_token : `Bearer ${parsed.access_token}`
      }
      console.warn('[Auth] Internal auth route did not return access_token, falling back to TELSTRA_CLIENT creds if provided')
    } catch (e) {
      console.warn('[Auth] Internal auth route failed:', e.message || e)
    }

    // Try client credentials directly if env variables provided
    const clientId = process.env.TELSTRA_CLIENT_ID
    const clientSecret = process.env.TELSTRA_CLIENT_SECRET
    const tokenEndpoint = process.env.TELSTRA_TOKEN_URL || 'https://products.api.telstra.com/v2/oauth/token'
    if (clientId && clientSecret) {
      try {
        console.log('[Auth] Requesting token from Telstra token endpoint')
        const authBody = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
        const u = new URL(tokenEndpoint)
        const lib2 = u.protocol === 'https:' ? https : http
        const opts2 = {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + (u.search || ''),
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }

        const tokenResp2 = await new Promise((resolve, reject) => {
          const req = lib2.request(opts2, (res) => {
            let data = ''
            res.on('data', (c) => data += c)
            res.on('end', () => resolve({ status: res.statusCode, body: data }))
          })
          req.on('error', (e) => reject(e))
          req.write(authBody.toString())
          req.end()
        })

        const parsed2 = JSON.parse(tokenResp2.body || '{}')
        if (parsed2.access_token) {
          return parsed2.access_token.startsWith('Bearer ') ? parsed2.access_token : `Bearer ${parsed2.access_token}`
        }
      } catch (e) {
        console.warn('[Auth] Telstra token endpoint request failed:', e.message || e)
      }
    }

    throw new Error('Unable to acquire access token. Provide --token or set INTERNAL_AUTH_URL or TELSTRA_CLIENT_ID/TELSTRA_CLIENT_SECRET in .env')
  }

  const token = await acquireToken()
  const baseURL = 'products.api.telstra.com'
  const pathBase = '/messaging/v3/messages'

  const limit = params.limit ? Math.min(50, Math.max(1, Number(params.limit))) : 10
  const offset = params.offset ? Math.max(0, Number(params.offset)) : 0
  const direction = params.direction // incoming|outgoing
  const status = params.status
  const filter = params.filter
  const reverse = params.reverse === 'true' || params.reverse === true
  const startTime = params.startTime
  const endTime = params.endTime

  const waitMs = params.waitMs ? Math.max(0, Number(params.waitMs)) : 500
  const maxRequests = params.maxRequests ? Math.max(1, Number(params.maxRequests)) : 200 // safety cap

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

  let allMessages = []
  let currentOffset = offset
  let requestCount = 0

  console.log('Calling Telstra API (paginated):')

  while (true) {
    if (requestCount >= maxRequests) {
      console.warn('Reached maxRequests cap, stopping pagination')
      break
    }

    const q = new URLSearchParams()
    if (direction) q.append('direction', direction)
    if (limit) q.append('limit', String(limit))
    q.append('offset', String(currentOffset))
    if (status) q.append('status', status)
    if (filter) q.append('filter', filter)
    if (reverse) q.append('reverse', 'true')
    if (startTime) q.append('startTime', startTime)
    if (endTime) q.append('endTime', endTime)

    const path = q.toString() ? `${pathBase}?${q.toString()}` : pathBase
    console.log(`  https://${baseURL}${path}`)

    const opts = {
      hostname: baseURL,
      port: 443,
      path,
      method: 'GET',
      headers: {
        'Authorization': token,
        'Telstra-api-version': '3.1.0',
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
      }
    }

    const pageMessages = await new Promise((resolve) => {
      const req = https.request(opts, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', async () => {
          console.log('HTTP status:', res.statusCode)
          let json = null
          try {
            json = JSON.parse(data)
          } catch (e) {
            console.error('Failed to parse JSON response:', e.message)
            console.error('Raw response:', data.substring(0, 1000))
            return resolve([])
          }

          if (res.statusCode === 429) {
            const retryAfter = parseInt(res.headers['retry-after'] || '0', 10)
            const wait = retryAfter > 0 ? retryAfter * 1000 : Math.max(1000, waitMs)
            console.warn(`Received 429 Too Many Requests. Waiting ${wait}ms before retrying...`)
            await sleep(wait)
            return resolve(null) // signal to retry this page
          }

          if (res.statusCode !== 200) {
            console.error('API error:', JSON.stringify(json, null, 2))
            return resolve([])
          }

          const messages = json.messages || json.data || []
          console.log('Messages returned on this page:', messages.length)
          resolve(messages)
        })
      })

      req.on('error', (e) => {
        console.error('Request error:', e.message)
        resolve([])
      })

      req.end()
    })

    // If the page returned `null`, it signalled a 429 and we should retry same offset
    if (pageMessages === null) {
      // do not increment requestCount, retry current page
      continue
    }

    requestCount++

    if (!Array.isArray(pageMessages)) break

    allMessages = allMessages.concat(pageMessages)

    // If fewer than limit returned, we're done
    if (pageMessages.length < limit) {
      console.log('Last page reached (fewer than limit returned)')
      break
    }

    currentOffset += limit
    // small delay between requests to avoid rate limits
    await sleep(waitMs)
  }

  console.log(`\nTotal messages fetched: ${allMessages.length}`)

  if (allMessages.length > 0) {
    console.log('\nSample messages (first 25):')
    allMessages.slice(0, 25).forEach((m, i) => {
      const id = m.messageId || m.id || '<no-id>'
      const from = m.from || m.fromAddress || m.fromNumber || m.sender || ''
      const to = m.to || m.toAddress || m.toNumber || m.destination || ''
      const content = m.messageContent || m.content || m.message || ''
      const ts = m.receivedTimestamp || m.receivedAt || m.createTimestamp || m.createdAt || ''
      console.log(`#${i+1} id=${id} from=${from} to=${to} ts=${ts}`)
      console.log('    preview:', (String(content)).substring(0, 200))
    })
  }

  console.log('\nDone.')

  // Optionally persist to local inbound webhook
  const persist = params.persist || process.env.PERSIST || false
  if (persist === 'local' || persist === true) {
    const localHost = params.localHost || process.env.LOCAL_HOST || 'localhost'
    const localPort = params.localPort ? Number(params.localPort) : (process.env.LOCAL_PORT ? Number(process.env.LOCAL_PORT) : 3000)
    const localPath = params.localPath || process.env.LOCAL_INBOUND_PATH || '/api/messaging/inbound'
    const persistLimit = params.persistLimit ? Math.max(0, Number(params.persistLimit)) : (process.env.PERSIST_LIMIT ? Number(process.env.PERSIST_LIMIT) : 0)
    const persistWait = params.persistWait ? Math.max(0, Number(params.persistWait)) : 200

    console.log(`[Persist] Posting ${allMessages.length} messages to http://${localHost}:${localPort}${localPath}`)
    let count = 0
    for (const m of allMessages) {
      if (persistLimit > 0 && count >= persistLimit) break
      const body = JSON.stringify({
        from: m.from || m.fromAddress || m.fromNumber || m.sender || '',
        to: m.to || m.toAddress || m.toNumber || m.destination || '',
        content: m.messageContent || m.content || m.message || '',
        receivedAt: m.receivedTimestamp || m.receivedAt || m.createTimestamp || m.createdAt || new Date().toISOString()
      })

      await new Promise((resolve) => {
        const opts = {
          hostname: localHost,
          port: localPort,
          path: localPath,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        }
        const req = http.request(opts, (res) => {
          let data = ''
          res.on('data', (c) => data += c)
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[Persist] Posted message ${count + 1} ok (status ${res.statusCode})`)
            } else {
              console.warn(`[Persist] Failed to post message ${count + 1}, status ${res.statusCode}`, data.substring ? data.substring(0, 200) : data)
            }
            resolve()
          })
        })
        req.on('error', (e) => {
          console.error('[Persist] Request error:', e.message)
          resolve()
        })
        req.write(body)
        req.end()
      })

      count++
      await new Promise((r) => setTimeout(r, persistWait))
    }

    console.log(`[Persist] Completed posts - ${count} messages attempted`)
  }
}

run().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
