#!/usr/bin/env node
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
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
const APPLY = params.apply === 'true' || params.apply === true || params.apply === '1'
const USER_ID = params.userId || null
const BACKUP_FILE = params.backupFile || null
const LIMIT = params.limit ? Number(params.limit) : 0

function normalizeNumber(n) {
  if (!n) return ''
  const digits = String(n).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('61')) return '0' + digits.slice(2)
  return digits
}

function parseRecipientsField(val) {
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
    return s.split(/[;,\n]/).map(x => x.trim()).filter(Boolean)
  }
  try { return [String(val)] } catch (e) { return [] }
}

function sentTimestampKey(m) {
  // Prefer sentAt, otherwise createdAt
  const t = m.sentAt || m.createdAt || m.createdAt
  if (!t) return ''
  try { return new Date(t).toISOString() } catch (e) { return String(t) }
}

async function main() {
  console.log('[dedupe] Starting deduplication' + (APPLY ? ' (apply mode)' : ' (dry-run)'))
  try {
    const where = USER_ID ? { where: { userId: String(USER_ID) } } : {}
    // Fetch all messages; if LIMIT set and >0 fetch that many
    const all = LIMIT > 0 ? await prisma.message.findMany({ where: USER_ID ? { userId: String(USER_ID) } : undefined, take: LIMIT }) : await prisma.message.findMany(where)
    console.log('[dedupe] Loaded', all.length, 'messages')

    const map = new Map()
    for (const m of all) {
      const userId = m.userId || ''
      const fromNorm = normalizeNumber(m.from || '')
      const recipients = parseRecipientsField(m.to || '')
      const recipNorms = recipients.map(normalizeNumber).filter(Boolean).sort()
      const recipKey = recipNorms.join(';')
      const contentKey = (m.content || '').trim()
      const timeKey = sentTimestampKey(m)

      const key = `${userId}|${fromNorm}|${recipKey}|${timeKey}|${contentKey}`

      if (!map.has(key)) {
        map.set(key, { keep: m.id, rows: [m] })
      } else {
        map.get(key).rows.push(m)
      }
    }

    // Collect duplicate groups
    const duplicates = []
    for (const [key, val] of map.entries()) {
      if (val.rows.length > 1) {
        duplicates.push({ key, keep: val.keep, rows: val.rows })
      }
    }

    console.log('[dedupe] Found', duplicates.length, 'duplicate groups')

    let totalDuplicates = 0
    for (const g of duplicates) totalDuplicates += (g.rows.length - 1)
    console.log('[dedupe] Total duplicate rows (would be removed):', totalDuplicates)

    if (duplicates.length === 0) {
      await prisma.$disconnect()
      return process.exit(0)
    }

    if (BACKUP_FILE) {
      try {
        const backup = duplicates.map(g => ({ keep: g.keep, rows: g.rows.map(r => ({ id: r.id, userId: r.userId, from: r.from, to: r.to, content: r.content, sentAt: r.sentAt, createdAt: r.createdAt })) }))
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), 'utf8')
        console.log('[dedupe] Backup written to', BACKUP_FILE)
      } catch (e) {
        console.warn('[dedupe] Failed to write backup file', e.message || e)
      }
    }

    if (!APPLY) {
      // Print a small sample table
      const sample = duplicates.slice(0, 10).map(g => ({ keep: g.keep, count: g.rows.length, example: { id: g.rows[0].id, from: g.rows[0].from, to: g.rows[0].to, content: (g.rows[0].content||'').slice(0,80), sentAt: sentTimestampKey(g.rows[0]) } }))
      console.log('[dedupe] Sample duplicate groups:', JSON.stringify(sample, null, 2))
      await prisma.$disconnect()
      return process.exit(0)
    }

    // APPLY mode: delete duplicates, keeping the first 'keep' id
    let removed = 0
    for (const g of duplicates) {
      // Sort rows so we keep the earliest created (or existing keep) and delete the rest
      const rowsSorted = g.rows.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
      const toKeep = rowsSorted[0].id
      const toDelete = rowsSorted.slice(1).map(r => r.id)
      for (const id of toDelete) {
        try {
          await prisma.message.delete({ where: { id } })
          removed++
        } catch (e) {
          console.warn('[dedupe] Failed to delete', id, e.message || e)
        }
      }
    }

    console.log('[dedupe] Removed', removed, 'duplicate rows')
    await prisma.$disconnect()
    return process.exit(0)
  } catch (e) {
    console.error('[dedupe] Error', e)
    try { await prisma.$disconnect() } catch (_) {}
    return process.exit(1)
  }
}

main()
