#!/usr/bin/env node
// Load environment variables. Prefer .env.local (used by Next.js) if present, then fallback to .env
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })
dotenv.config()
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

  const replyCallbackUrl = params.replyCallbackUrl || process.env.VIRTUAL_REPLY_CALLBACK_URL || params.callback || process.env.REPLY_CALLBACK_URL
  const rawToken = params.token || process.env.TELSTRA_TOKEN

  if (!replyCallbackUrl) {
    console.error('Error: replyCallbackUrl is required. Provide --replyCallbackUrl or set VIRTUAL_REPLY_CALLBACK_URL in .env')
    process.exit(1)
  }

  async function acquireToken() {
    if (rawToken) return rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`

    // Try client credentials first (prefer non-local flows so script works without running dev server)
    const clientId = process.env.TELSTRA_CLIENT_ID
    const clientSecret = process.env.TELSTRA_CLIENT_SECRET
    const tokenEndpoint = process.env.TELSTRA_TOKEN_URL || 'https://products.api.telstra.com/v2/oauth/token'
    if (clientId && clientSecret) {
      try {
        console.log('[Auth] Requesting token from Telstra token endpoint using client credentials')
        const authBody = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          // Request the scopes needed for virtual numbers and messaging
          scope: 'free-trial-numbers:read free-trial-numbers:write messages:read messages:write virtual-numbers:read virtual-numbers:write reports:read reports:write'
        })
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
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }))
          })
          req.on('error', (e) => reject(e))
          req.write(authBody.toString())
          req.end()
        })

        console.log('[Auth] Telstra token endpoint response status:', tokenResp2.status)
        // Print a short preview of body for debugging (avoid leaking secrets to logs in production)
        console.log('[Auth] Telstra token endpoint response body (preview):', (tokenResp2.body || '').substring(0, 500))

        const parsed2 = JSON.parse(tokenResp2.body || '{}')
        if (parsed2.access_token) {
          const bearer = parsed2.access_token.startsWith('Bearer ') ? parsed2.access_token : `Bearer ${parsed2.access_token}`
          // Log a masked preview of the token for debugging (don't print full token)
          try {
            const t = parsed2.access_token
            const preview = `${t.slice(0,6)}...${t.slice(-6)}`
            console.log('[Auth] Obtained access_token preview:', preview)
          } catch (e) {
            // ignore
          }
          return bearer
        }
        if (tokenResp2.status && tokenResp2.status >= 400) {
          console.warn('[Auth] Telstra token endpoint did not return access_token; response indicates error')
        }
      } catch (e) {
        console.warn('[Auth] Telstra token endpoint request failed:', e.message || e)
      }
    }

    // Try internal auth route as a fallback (useful when running local dev server that proxies credentials)
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
      console.warn('[Auth] Internal auth route did not return access_token')
    } catch (e) {
      console.warn('[Auth] Internal auth route failed:', e.message || e)
    }

    throw new Error('Unable to acquire access token. Provide --token or set INTERNAL_AUTH_URL or TELSTRA_CLIENT_ID/TELSTRA_CLIENT_SECRET in .env')
  }

  const token = await acquireToken()

  // Quick validation: call a lightweight Telstra endpoint to verify token is accepted
  try {
    console.log('[Auth] Validating token against Telstra account/balance endpoint')
    const valOpts = {
      hostname: baseURL,
      port: 443,
      path: '/messaging/v3/account/balance',
      method: 'GET',
      headers: {
        'Authorization': token,
        'Telstra-api-version': '3.1.0',
        'Content-Language': 'en-au',
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
      }
    }

    const valResp = await new Promise((resolve) => {
      const req = https.request(valOpts, (res) => {
        let data = ''
        res.on('data', (c) => data += c)
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
      })
      req.on('error', (e) => resolve({ status: 0, body: String(e) }))
      req.end()
    })

    console.log('[Auth] Validation response status:', valResp.status)
    // show a short preview of the body for diagnostics
    const vbody = String(valResp.body || '')
    console.log('[Auth] Validation response body (preview):', vbody.substring(0, 1000))

    if (valResp.status !== 200) {
      console.error('[Auth] Token validation failed - Telstra rejected the token. Aborting assign attempt.')
      process.exit(1)
    }
  } catch (e) {
    console.warn('[Auth] Token validation attempt failed:', e && e.message ? e.message : e)
  }

  const baseURL = 'products.api.telstra.com'
  const path = '/messaging/v3/virtualNumbers'

  const bodyObj = {
    replyCallbackUrl,
  }
  if (params.tags) {
    try {
      const t = JSON.parse(params.tags)
      if (Array.isArray(t)) bodyObj.tags = t
    } catch (e) {
      // fallback: comma-separated
      bodyObj.tags = params.tags.split(',').map(s => s.trim()).filter(Boolean)
    }
  }

  const bodyStr = JSON.stringify(bodyObj)

  const opts = {
    hostname: baseURL,
    port: 443,
    path,
    method: 'POST',
    headers: {
      'Authorization': token,
      'Telstra-api-version': '3.1.0',
      'Content-Language': 'en-au',
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr)
    }
  }

  const resp = await new Promise((resolve) => {
    const req = https.request(opts, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', (e) => {
      console.error('Request error:', e.message)
      resolve({ status: 0, body: '' })
    })
    req.write(bodyStr)
    req.end()
  })

  const { status, body } = resp
  let json = null
  try { json = JSON.parse(body || '{}') } catch (e) { json = null }

  console.log('HTTP status:', status)
  if (status === 201) {
    console.log('Virtual number assigned successfully:')
    console.log(JSON.stringify(json, null, 2))
    process.exit(0)
  } else {
    console.error('Failed to assign virtual number')
    console.error('Response:', body ? body.substring ? body.substring(0, 2000) : body : '<no body>')
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('Unexpected error:', e && e.stack ? e.stack : e)
  process.exit(1)
})

/*
Usage:
  node scripts/assign-virtual-number.js --replyCallbackUrl "https://yourdomain.com/api/messaging/inbound" --tags '["tag1","tag2"]'
  node scripts/assign-virtual-number.js --replyCallbackUrl "https://yourdomain.com/api/messaging/inbound" --token "Bearer <ACCESS_TOKEN>"

Environment variables supported:
  TELSTRA_TOKEN                - raw bearer token or "Bearer ..."
  TELSTRA_CLIENT_ID            - client id for client_credentials
  TELSTRA_CLIENT_SECRET        - client secret for client_credentials
  INTERNAL_AUTH_URL            - internal auth token endpoint
  VIRTUAL_REPLY_CALLBACK_URL   - reply callback URL fallback

Notes:
  - Free Trial users can assign 1 virtual number; paid plans up to 20.
  - The response body contains the assigned 10-digit virtual number.
*/
