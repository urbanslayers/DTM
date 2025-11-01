import { telstraAPI } from "./telstra-api"
import { db } from "./database"
import type { Rule } from "./types"

export async function processMessageWithRules(userId: string, message: { from: string; content: string; }) {
  try {
    const rules = await db.getRulesByUserId(userId)
    let ruleApplied = false

    for (const rule of rules) {
      if (!rule.enabled) continue

      // Check if message matches rule condition
      const cond = rule.condition
      let matches = false
      if (cond.type === 'contains') {
        matches = message.content.toLowerCase().includes(cond.value.toLowerCase())
      } else if (cond.type === 'from') {
        matches = message.from.includes(cond.value)
      }

      if (matches) {
        ruleApplied = true
        // Apply rule action
        const action = rule.action
        if (action.type === 'reply') {
          // Get user's personal mobile to use as sender
          const user = await db.getUserById(userId)
          const sender = user?.personalMobile
          
          // Send automatic reply if we have a sender number
          if (sender) {
            await telstraAPI.sendSMS(message.from, action.value, { from: sender })
          }
        }
        // TODO: Implement other action types (forward, delete, folder)
      }
    }

    return ruleApplied
  } catch (err) {
    console.error('[RulesProcessor] Error processing message with rules:', err)
    return false
  }
}