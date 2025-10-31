#!/usr/bin/env node
/**
 * Fetch Telstra outgoing messages and persist them to local /api/messaging/messages
 * Usage:
 *  node scripts/fetch-telstra-sent-and-persist.js --userId=1 --from=<virtualNumber> --persistLimit=10
 * Supports --token or TELSTRA_CLIENT_ID/TELSTRA_CLIENT_SECRET for auth.
 */

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

const params = parseArgs()
// Early --help handling
if (params.help || params.h) {
  console.log('\nFetch Telstra outgoing messages and persist them to local /api/messaging/messages')
  console.log('\nUsage:')
  console.log('  node scripts/fetch-telstra-sent-and-persist.js --userId=1 --localToken="Bearer user_1" --persistLimit=10')
  console.log('\nOptions:')
  console.log('  --userId          demo user id to attribute persisted messages (default: 1)')
  console.log('  --localHost       local host to POST to (default: localhost)')
  console.log('  --localPort       local port to POST to (default: 3000)')
  console.log('  --localToken      Authorization token to send to local API (e.g. "Bearer user_1" or "user_1")')
  console.log('  --persistLimit    max number of messages to persist (0 = no limit)')
  console.log('  --token           Telstra bearer token (or set TELSTRA_TOKEN or TELSTRA_CLIENT_ID/SECRET env vars)')
  console.log('  --help, -h        show this help')
  console.log('')
  process.exit(0)
}

const rawToken = params.token || process.env.TELSTRA_TOKEN
const USER_ID = params.userId || process.env.TEST_USER_ID || '1'
const LOCAL_HOST = params.localHost || process.env.LOCAL_HOST || 'localhost'
const LOCAL_PORT = params.localPort ? Number(params.localPort) : (process.env.LOCAL_PORT ? Number(process.env.LOCAL_PORT) : 3000)
const PERSIST_LIMIT = params.persistLimit ? Number(params.persistLimit) : 0
const WAIT_MS = params.waitMs ? Number(params.waitMs) : 300
const limit = params.limit ? Math.min(50, Math.max(1, Number(params.limit))) : 10
let LOCAL_AUTH_TOKEN = params.localToken || process.env.LOCAL_AUTH_TOKEN || ''

async function acquireToken() {
  if (rawToken) return rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`

  // Try client credentials
  const clientId = process.env.TELSTRA_CLIENT_ID
  const clientSecret = process.env.TELSTRA_CLIENT_SECRET
  const tokenEndpoint = process.env.TELSTRA_TOKEN_URL || 'https://products.api.telstra.com/v2/oauth/token'
  if (clientId && clientSecret) {
    try {
      const authBody = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
      const u = new URL(tokenEndpoint)
      const lib = u.protocol === 'https:' ? https : http
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }

      const tokenResp = await new Promise((resolve, reject) => {
        const req = lib.request(opts, (res) => {
          let data = ''
          res.on('data', (c) => data += c)
          res.on('end', () => resolve({ status: res.statusCode, body: data }))
        })
        req.on('error', (e) => reject(e))
        req.write(authBody.toString())
        req.end()
      })
      const parsed = JSON.parse(tokenResp.body || '{}')
      if (parsed.access_token) return parsed.access_token.startsWith('Bearer ') ? parsed.access_token : `Bearer ${parsed.access_token}`
    } catch (e) {
      console.warn('[Auth] Telstra token fetch failed', e.message || e)
    }
  }

  throw new Error('No Telstra token available; provide --token or TELSTRA_CLIENT_ID/TELSTRA_CLIENT_SECRET')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchMessages(token) {
  const baseURL = 'products.api.telstra.com'
  const pathBase = '/messaging/v3/messages'
  let all = []
  let offset = 0
  while (true) {
    const q = new URLSearchParams()
    q.append('direction', 'outgoing')
    q.append('limit', String(limit))
    q.append('offset', String(offset))
    const path = `${pathBase}?${q.toString()}`
    const opts = { hostname: baseURL, port: 443, path, method: 'GET', headers: { Authorization: token, 'Telstra-api-version': '3.1.0' } }

    const page = await new Promise((resolve) => {
      const req = https.request(opts, (res) => {
        let data = ''
        res.on('data', (c) => data += c)
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error('[Telstra] Non-200', res.statusCode, data.substring ? data.substring(0, 500) : data)
            return resolve([])
          }
          try { const json = JSON.parse(data); return resolve(json.messages || json.data || []) } catch (e) { console.error('Parse error', e); return resolve([]) }
        })
      })
      req.on('error', (e) => { console.error('Request error', e); resolve([]) })
      req.end()
    })

    if (!Array.isArray(page) || page.length === 0) break
    all = all.concat(page)
    if (page.length < limit) break
    offset += limit
    await sleep(WAIT_MS)
  }
  return all
}

async function persistMessageToLocal(m) {
  // Build payload expected by /api/messaging/messages
  const toVal = Array.isArray(m.to) ? m.to : (m.to ? [m.to] : [])
  const body = JSON.stringify({
    userId: String(USER_ID),
    to: toVal,
    from: m.from || m.fromAddress || m.fromNumber || '',
    content: m.messageContent || m.content || m.message || '',
    type: m.type || 'sms',
    status: m.status || 'sent',
    credits: 1,
  })

  const opts = {
    hostname: LOCAL_HOST,
    port: LOCAL_PORT,
    path: '/api/messaging/messages',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }

  // If a local auth token is provided, include it (e.g. 'Bearer user_1')
  if (LOCAL_AUTH_TOKEN) {
    opts.headers.Authorization = LOCAL_AUTH_TOKEN.startsWith('Bearer ') ? LOCAL_AUTH_TOKEN : `Bearer ${LOCAL_AUTH_TOKEN}`
  }

  return new Promise((resolve) => {
    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', (e) => resolve({ error: e }))
    req.write(body)
    req.end()
  })
}

async function main() {
  const token = await acquireToken()
  console.log('[info] Acquired token, fetching outgoing messages...')
  const msgs = await fetchMessages(token)
  console.log('[info] Fetched', msgs.length, 'outgoing messages from Telstra')
  // If no explicit local auth token was provided, default to demo token
  if (!LOCAL_AUTH_TOKEN) {
    LOCAL_AUTH_TOKEN = `Bearer user_${USER_ID}`
    console.warn('[warn] No --localToken or LOCAL_AUTH_TOKEN provided. Defaulting to demo token:', `Bearer user_${USER_ID}`)
  }

  const maskToken = (t) => {
    if (!t) return '<none>'
    if (t.length <= 16) return t
    return t.slice(0, 8) + '...' + t.slice(-4)
  }

  console.log('[info] Using local POST target:', `${LOCAL_HOST}:${LOCAL_PORT}`, 'Authorization:', maskToken(LOCAL_AUTH_TOKEN))

  let count = 0
  let successCount = 0
  let failCount = 0
  for (const m of msgs) {
    if (PERSIST_LIMIT > 0 && count >= PERSIST_LIMIT) break
    const res = await persistMessageToLocal(m)
    if (res && res.status && res.status >= 200 && res.status < 300) {
      console.log('[persist] OK for message', m.messageId || '<no-id>')
      successCount++
    } else {
      console.warn('[persist] Failed for', m.messageId || '<no-id>', res && res.status, res && res.error)
      failCount++
    }
    count++
    await sleep(WAIT_MS)
  }

  console.log('[done] Attempted', count, 'persists — success:', successCount, 'failed:', failCount)
}

main().catch((e) => { console.error('[fatal]', e); process.exit(1) })
