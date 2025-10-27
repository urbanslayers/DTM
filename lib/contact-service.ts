import type { Contact } from "./types"
import { authService } from "./auth"

class ContactService {
  async getContacts(category?: "company" | "personal"): Promise<Contact[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      const response = await fetch(`/api/contacts?userId=${user.id}${category ? `&category=${category}` : ''}`, {
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

  searchContacts(query: string): Contact[] {
    // This method now needs to be async since it fetches from API
    // For now, return empty array - search should be handled in the API
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
