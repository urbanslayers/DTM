#!/usr/bin/env node
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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
const USER_ID = params.userId || process.env.TEST_USER_ID || '1'
// Normalize DRY flag: allow --dry (true), --dry=false, --dry false
let DRY = false
if (Object.prototype.hasOwnProperty.call(params, 'dry')) {
  const v = params.dry
  if (v === true) DRY = true
  else if (typeof v === 'string') DRY = !(v.toLowerCase() === 'false' || v === '0')
  else DRY = Boolean(v)
}

function normalizeNumber(n) {
  if (!n) return ''
  const digits = String(n).replace(/\D/g, '')
  // Normalize to leading 0 for Australian numbers if starts with 61
  if (digits.startsWith('61')) return '0' + digits.slice(2)
  return digits
}

async function parseRecipientsField(val) {
  if (!val) return []
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return []
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s)
        return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
      } catch (e) {
        // fallthrough
      }
    }
    // split on common separators
    return s.split(/[;,\n]/).map((x) => x.trim()).filter(Boolean)
  }
  try { return [String(val)] } catch (e) { return [] }
}

async function main() {
  console.log('[cleanup] Starting cleanup of messages where to === from for userId=', USER_ID)
  try {
    const msgs = await prisma.message.findMany({ where: { userId: String(USER_ID) } })
    console.log('[cleanup] Found', msgs.length, 'messages for user', USER_ID)

    let toDelete = []
    for (const m of msgs) {
      const fromRaw = m.from || ''
      const fromNorm = normalizeNumber(fromRaw)
      const recipients = await parseRecipientsField(m.to)
      const recipNorm = recipients.map(normalizeNumber).filter(Boolean)
      // If any recipient equals the from, consider it an artifact and delete
      if (fromNorm && recipNorm.some(r => r === fromNorm)) {
        toDelete.push({ id: m.id, from: fromRaw, to: recipients })
      }
    }

    console.log('[cleanup] Candidates for deletion (outbound messages):', toDelete.length)

    // Process inbox messages as well
    const inboxMsgs = await prisma.inboxMessage.findMany({ where: { userId: String(USER_ID) } })
    console.log('[cleanup] Found', inboxMsgs.length, 'inbox messages for user', USER_ID)

    let toDeleteInbox = []
    for (const m of inboxMsgs) {
      const fromRaw = m.from || ''
      const fromNorm = normalizeNumber(fromRaw)
      const recipients = await parseRecipientsField(m.to)
      const recipNorm = recipients.map(normalizeNumber).filter(Boolean)
      if (fromNorm && recipNorm.some(r => r === fromNorm)) {
        toDeleteInbox.push({ id: m.id, from: fromRaw, to: recipients })
      }
    }

    console.log('[cleanup] Candidates for deletion (inbox messages):', toDeleteInbox.length)

    const totalCandidates = toDelete.length + toDeleteInbox.length
    if (totalCandidates === 0) {
      console.log('[cleanup] Nothing to delete. Exiting.')
      await prisma.$disconnect()
      process.exit(0)
    }

    if (DRY) {
      console.log('[cleanup] Dry run enabled; not deleting. Use --dry=false or omit --dry to actually delete')
      console.log('Outbound candidates sample:', JSON.stringify(toDelete.slice(0, 20), null, 2))
      console.log('Inbox candidates sample:', JSON.stringify(toDeleteInbox.slice(0, 20), null, 2))
      await prisma.$disconnect()
      process.exit(0)
    }

    let removed = 0
    for (const item of toDelete) {
      try {
        await prisma.message.delete({ where: { id: item.id } })
        removed++
      } catch (e) {
        console.warn('[cleanup] Failed to delete outbound message', item.id, e.message || e)
      }
    }

    for (const item of toDeleteInbox) {
      try {
        await prisma.inboxMessage.delete({ where: { id: item.id } })
        removed++
      } catch (e) {
        console.warn('[cleanup] Failed to delete inbox message', item.id, e.message || e)
      }
    }

    console.log('[cleanup] Deleted', removed, 'messages (of', totalCandidates, 'candidates)')
    await prisma.$disconnect()
    process.exit(0)
  } catch (e) {
    console.error('[cleanup] Error during cleanup', e)
    try { await prisma.$disconnect() } catch (_) {}
    process.exit(1)
  }
}

main()
