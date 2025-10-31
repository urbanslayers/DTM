import type { Contact } from "./types"
import { authService } from "./auth"

class ContactService {
  async getContacts(category?: "company" | "personal"): Promise<Contact[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      const searchParams = new URLSearchParams()
      searchParams.append('userId', user.id)
      if (category) searchParams.append('category', category)

      const response = await fetch(`/api/contacts?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.contacts || [];
      }
    } catch (error) {
      console.error("[ContactService] Error getting contacts:", error);
    }

    return []
  }

  async addContact(name: string, phoneNumber: string, category: "company" | "personal", email?: string): Promise<Contact | null> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify({
          name,
          phoneNumber,
          email,
          category,
          userId: user.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.contact;
      }
    } catch (error) {
      console.error("[ContactService] Error adding contact:", error);
    }

    return null
  }

  // Compatibility helper: some UI code expects `createContact(contact)` instead of `addContact(...)`.
  // Provide a wrapper that accepts an object shaped like Omit<Contact,'id'> and forwards to the API.
  async createContact(contact: Omit<Contact, "id" | "createdAt">): Promise<Contact | null> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null

      const body = {
        userId: contact.userId || user.id,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        email: contact.email,
        category: contact.category,
      }

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        return data.contact
      }
    } catch (error) {
      console.error('[ContactService] Error creating contact (createContact wrapper):', error)
    }

    return null
  }

  async searchContacts(query: string, category?: "company" | "personal"): Promise<Contact[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      const params = new URLSearchParams({ userId: user.id })
      if (category) params.set('category', category)
      if (query) params.set('search', query)

      const response = await fetch(`/api/contacts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.contacts || []
      }
    } catch (error) {
      console.error('[ContactService] Error searching contacts:', error)
    }

    return []
  }

  async getSelectedContacts(selectedIds: string[]): Promise<Contact[]> {
    try {
      const contacts = await this.getContacts()
      return contacts.filter((contact) => selectedIds.includes(contact.id))
    } catch (error) {
      console.error("[ContactService] Error getting selected contacts:", error);
      return []
    }
  }

  async deleteContact(contactId: string): Promise<boolean> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return false

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("[ContactService] Error deleting contact:", error);
      return false
    }
  }

  // Basic client-side group support using sessionStorage/localStorage.
  // Groups are small structures stored per-user as an array under key `contactGroups_<userId>`.
  async getGroups(): Promise<{ id: string; name: string; type: "company" | "personal"; memberIds: string[] }[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []
      const key = `contactGroups_${user.id}`
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
      if (!raw) return []
      return JSON.parse(raw)
    } catch (error) {
      console.error("[ContactService] Error getting groups:", error)
      return []
    }
  }

  async addGroup(name: string, type: "company" | "personal", memberIds: string[] = []) {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null
      const key = `contactGroups_${user.id}`
      const groups = await this.getGroups()
      const id = Date.now().toString()
      const group = { id, name, type, memberIds }
      groups.push(group)
      localStorage.setItem(key, JSON.stringify(groups))
      return group
    } catch (error) {
      console.error("[ContactService] Error adding group:", error)
      return null
    }
  }

  async updateGroup(id: string, updates: { name?: string; type?: "company" | "personal"; memberIds?: string[] }) {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null
      const key = `contactGroups_${user.id}`
      const groups = await this.getGroups()
      const idx = groups.findIndex(g => g.id === id)
      if (idx === -1) return null
      groups[idx] = { ...groups[idx], ...updates }
      localStorage.setItem(key, JSON.stringify(groups))
      return groups[idx]
    } catch (error) {
      console.error("[ContactService] Error updating group:", error)
      return null
    }
  }

  async deleteGroup(id: string) {
    try {
      const user = authService.getCurrentUser()
      if (!user) return false
      const key = `contactGroups_${user.id}`
      const groups = await this.getGroups()
      const newGroups = groups.filter(g => g.id !== id)
      localStorage.setItem(key, JSON.stringify(newGroups))
      return true
    } catch (error) {
      console.error("[ContactService] Error deleting group:", error)
      return false
    }
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact | null> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer user_${user.id}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        return data.contact;
      }
    } catch (error) {
      console.error("[ContactService] Error updating contact:", error);
    }

    return null
  }
}

export const contactService = new ContactService()
