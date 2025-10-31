"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  User,
  Send,
  Clock,
  Mail,
  BookOpen,
  MessageSquare,
  Inbox,
  Settings,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Search,
  X,
  Moon,
  Sun,
} from "lucide-react"
import { LoginDialog } from "@/components/login-dialog"
import { StatusDialog } from "@/components/status-dialog"
import { SendLaterDialog } from "@/components/send-later-dialog"
import { HelpDialog } from "@/components/help-dialog"
import { authService } from "@/lib/auth"
import { messagingService } from "@/lib/messaging-service"
import { contactService } from "@/lib/contact-service"
import { templateService } from "@/lib/template-service"
import { rulesService } from "@/lib/rules-service"
// inboxService is already imported above
import { mediaService } from "@/lib/media-service"
import type { Contact, MessageTemplate, Message, Rule, InboxMessage, MediaFile } from "@/lib/types"
import { inboxService } from "@/lib/inbox-service"
import { SendMMSDialog } from "@/components/send-mms-dialog"
import { InboxDialog } from "@/components/inbox-dialog"
import { ContactsDialog } from "@/components/contacts-dialog"
import { LibraryDialog } from "@/components/library-dialog"
import { SentMessagesDialog } from "@/components/sent-messages-dialog"
import { ScheduledMessagesDialog } from "@/components/scheduled-messages-dialog"
import { RulesWizardDialog } from "@/components/rules-wizard-dialog"
import { UserSettingsDialog } from "@/components/user-settings-dialog"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"

// Define interfaces for missing types
interface ContactService {
  getContacts: (searchTerm?: string) => Promise<{ data: Contact[] }>;
  createContact: (contact: Omit<Contact, 'id'>) => Promise<Contact>;
  // Add other contact service methods as needed
}

function DesktopMessaging() {
  const { toast } = useToast();
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser())

  // Handle logout
  const handleLogout = async () => {
    try {
      // Inform server and clear auth data
      await authService.logout()
    } catch (e) {
      console.warn('Logout request failed', e)
    }

    // Clear browser-stored user info (defensive)
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('currentUser')
        localStorage.removeItem('user')
      } catch (e) {
        console.warn('Failed to clear storage on logout', e)
      }
    }

    // Stop background polling (messagingService will also stop itself if no user exists)
    try {
      messagingService.stopPollingMessages()
    } catch (e) {
      console.warn('Failed to stop polling messages on logout', e)
    }

    // Dispatch a global event so component-level state (which is declared later) can react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:logout'))
    }

    // Local auth/UI state
    setIsAuthenticated(false)
    setCurrentUser(null)
    setShowLogin(true)
  }

  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { token } = useAuth();
  const { socket, connected, authenticateAsUser, disconnect } = useWebSocket()


  // Contact state
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactType, setNewContactType] = useState<"personal" | "company">("personal");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContacts, setShowContacts] = useState(false);

  // Message editor state
  const [showSendLater, setShowSendLater] = useState(false);
  const [showSendMMS, setShowSendMMS] = useState(false);

  // UI state - consolidated in one place
  const [showLibrary, setShowLibrary] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showSentMessages, setShowSentMessages] = useState(false);
  const [showScheduledMessages, setShowScheduledMessages] = useState(false);
  const [showRulesWizard, setShowRulesWizard] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  
  const [scheduledMessages, setScheduledMessages] = useState<Message[]>([]);
  
  // Template state
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  // Paging state for lists (inbox, sent, etc.)
  const [paging, setPaging] = useState<any>({ pageSize: 10, offset: 0, nextPage: false, previousPage: false, totalCount: 0 });
  
  // Alias pageSize and offset for backward compatibility
  const pageSize = paging.pageSize;
  const offset = paging.offset;
  const setOffset = (newOffset: number) => {
    setPaging((prev: any) => ({
      ...prev,
      offset: newOffset
    }));
  };

  // File upload handler
  const handleFileUpload = async (files: FileList) => {
    try {
      // Implement file upload logic here
      toast({
        title: "Uploading files...",
        description: `Uploading ${files.length} file(s)`,
      });
      
      // Example implementation - replace with actual file upload logic
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Upload file using your media service
        // await mediaService.uploadFile(file);
      }
      
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    }
  };

  // Template handlers
  const handleUseTemplate = (template: MessageTemplate) => {
    // Ensure we set the canonical editor state variable
    setMessageText(template.content);
    setShowLibrary(false);
    toast({
      title: "Template applied",
      description: "The template has been loaded into the message editor",
    });
  };

  const handleEditTemplate = async (templateId: string, updates: Partial<MessageTemplate>) => {
    try {
      // Attempt to update via templateService if available
      if (templateService && typeof templateService.updateTemplate === "function") {
        const res = await templateService.updateTemplate(templateId, updates)
        if (res) {
          await loadData()
          toast({ title: "Template updated", description: "Template updated successfully" })
          return
        }
      }
      // Fallback: log and refresh UI
      console.log("Editing template (no service):", templateId, updates)
      await loadData()
      toast({ title: "Template updated", description: "Template update applied" })
    } catch (error) {
      console.error("Error editing template:", error)
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" })
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      if (!window.confirm('Are you sure you want to delete this template?')) return
      if (templateService && typeof templateService.deleteTemplate === "function") {
        const success = await templateService.deleteTemplate(templateId)
        if (!success) throw new Error("deleteTemplate returned falsy")
      }
      // Refresh templates / UI
      await loadData()
      toast({ title: "Template deleted", description: "The template has been deleted" })
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" })
    }
  };

  const handleAddTemplate = () => {
    // Add or update a template using templateService
    ;(async () => {
      try {
        if (!newTemplateName.trim() || !newTemplateContent.trim()) {
          toast({ title: "Error", description: "Please enter both template name and content", variant: "destructive" })
          return
        }

        if (editingTemplateId) {
          // update existing
          const updates: Partial<MessageTemplate> = {
            name: newTemplateName,
            content: newTemplateContent,
            category: newTemplateCategory,
          }
          const res = await templateService.updateTemplate(editingTemplateId, updates)
          if (res) {
            toast({ title: "Template updated", description: `Template \"${res.name}\" updated` })
            setEditingTemplateId(null)
            setNewTemplateName("")
            setNewTemplateContent("")
            setNewTemplateCategory("personal")
            await loadData()
            return
          }
          throw new Error('Update failed')
        } else {
          // create new
          const created = await templateService.addTemplate(newTemplateName, newTemplateContent, newTemplateCategory)
          if (created) {
            toast({ title: "Template saved", description: `Template \"${created.name}\" created` })
            setNewTemplateName("")
            setNewTemplateContent("")
            setNewTemplateCategory("personal")
            await loadData()
            return
          }
          throw new Error('Create failed')
        }
      } catch (err) {
        console.error('handleAddTemplate error', err)
        toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' })
      }
    })()
  };

  // Message scheduling handler
  const handleScheduleMessage = async () => {
    try {
      // Implement message scheduling logic
      setShowSendLater(true);
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast({
        title: "Error",
        description: "Failed to schedule message",
        variant: "destructive",
      });
    }
  };

  // Send later handler
  const handleSendLater = async (scheduledTime: Date) => {
    try {
      // Implement send later logic
      toast({
        title: "Message scheduled",
        description: `Message will be sent at ${scheduledTime.toLocaleString()}`,
      });
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast({
        title: "Error",
        description: "Failed to schedule message",
        variant: "destructive",
      });
    }
  };

  // MMS handler
  const handleSendMMS = async (data: { 
    to: string[]; 
    subject: string; 
    body: string; 
    media: { 
      type: string; 
      filename: string; 
      data: string; 
    }[]; 
  }) => {
    try {
      // Implement MMS sending logic
      console.log("Sending MMS with data:", data);
      toast({
        title: "MMS sent",
        description: "Your MMS message has been sent",
      });
    } catch (error) {
      console.error("Error sending MMS:", error);
      toast({
        title: "Error",
        description: "Failed to send MMS",
        variant: "destructive",
      });
    }
  };

  // Sync authentication state with AuthProvider on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('[AUTH] Checking authentication status');
      
      // First, try to get user from auth service
      const userFromAuth = authService.getCurrentUser();
      
      // Then try to get from session storage (faster, more up-to-date)
      const sessionUserStr = typeof window !== 'undefined' ? sessionStorage.getItem('currentUser') : null;
      const sessionUser = sessionUserStr ? JSON.parse(sessionUserStr) : null;
      
      // Finally, fall back to localStorage
      const localUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const localUser = localUserStr ? JSON.parse(localUserStr) : null;
      
      const user = userFromAuth || sessionUser || localUser;
      
      console.log('[AUTH] User data from sources:', {
        authService: userFromAuth,
        sessionStorage: sessionUser,
        localStorage: localUser,
        selectedUser: user
      });

      if (user) {
        console.log('[AUTH] User authenticated:', {
          id: user.id,
          username: user.username,
          role: user.role,
          isAdmin: user.role === 'admin'
        });
        
        setIsAuthenticated(true);
        setShowLogin(false);
        
        // Ensure we have the most complete user data
        const completeUser = {
          ...user,
          role: user.role || 'user' // Ensure role is always set
        };
        
        setCurrentUser(completeUser);
        
        // If we're in the browser, ensure the user is in session storage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('currentUser', JSON.stringify(completeUser));
        }
        // Authenticate WebSocket connection for real-time updates
        try {
          if (authenticateAsUser && completeUser?.id) {
            authenticateAsUser(completeUser.id)
          }
        } catch (e) {
          console.warn('WebSocket user authentication failed', e)
        }
        
        loadData().catch(console.error);
      } else {
        console.log('[AUTH] No user found, showing login');
        setIsAuthenticated(false);
        setShowLogin(true);
        setCurrentUser(null);
      }
    };

    checkAuthStatus()
  }, [token])

  // Add debug log for currentUser changes
  useEffect(() => {
    console.log('Current user state updated:', currentUser)
  }, [currentUser])



  // Form state
  const [toRecipients, setToRecipients] = useState("")
  const [messageText, setMessageText] = useState("")
  const [saveTitle, setSaveTitle] = useState("")
  const [searchQuery, setSearchQuery] = useState("") // Global search bar
  const [sidebarContactSearchQuery, setSidebarContactSearchQuery] = useState("") // Sidebar contact search
  const [contactsSearchQuery, setContactsSearchQuery] = useState("") // Contacts page search
  const [inboxSearchQuery, setInboxSearchQuery] = useState("") // Inbox page search
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [bulkNumberSend, setBulkNumberSend] = useState(false)
  const [mailMerge, setMailMerge] = useState(false)

  // Search state
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    contacts: Contact[]
    templates: MessageTemplate[]
    messages: Message[]
    users: any[]
    groups: { id: string; name: string; type: string; memberIds: string[] }[]
  }>({
    contacts: [],
    templates: [],
    messages: [],
    users: [],
    groups: [],
  })

  // Data state
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [contactGroups, setContactGroups] = useState<{ id: string; name: string; type: string; memberIds: string[] }[]>([])
  // templates state declared earlier — do not redeclare here

  // Helper: normalize a phone number to digits-only string
  const normalizeNumber = (num?: string | null) => {
    if (!num) return ""
    return String(num).replace(/\D/g, "")
  }

  // Simple CSV parser that handles quoted fields
  const parseCsv = (text: string) => {
    if (!text) return []
    const lines = text.split(/\r\n|\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)
    if (lines.length === 0) return []

    const parseRow = (line: string) => {
      const result: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              cur += '"'
              i++
            } else {
              inQuotes = false
            }
          } else {
            cur += ch
          }
        } else {
          if (ch === ',') {
            result.push(cur)
            cur = ''
          } else if (ch === '"') {
            inQuotes = true
          } else {
            cur += ch
          }
        }
      }
      result.push(cur)
      return result
    }

    const headers = parseRow(lines[0]).map(h => h.trim())
    const rows: Array<Record<string,string>> = []
    for (let i = 1; i < lines.length; i++) {
      const fields = parseRow(lines[i])
      if (fields.length === 0) continue
      const row: Record<string,string> = {}
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = (fields[j] || '').trim()
      }
      rows.push(row)
    }
    return rows
  }

  // Helper: annotate inbox messages with contact display names using contacts list
  const annotateMessagesWithContacts = (messages: any[], contactsList: Contact[] = []) => {
    try {
      // Build a map of last-9-digits -> contact name for quick lookup
      const map = new Map<string, string>()
      contactsList.forEach((c) => {
        if (!c?.phoneNumber) return
        const norm = normalizeNumber(c.phoneNumber)
        const key = norm.slice(-9)
        if (key) map.set(key, c.name)
      })

      return messages.map((m: any) => {
        const rawFrom = m.from || m.fromNumber || m.fromAddress || m.fromTelephone || m.from_phone || ""
        const norm = normalizeNumber(rawFrom)
        const key = norm.slice(-9)
        const matchedName = map.get(key)
        return {
          ...m,
          originalFrom: rawFrom,
          displayFrom: matchedName || undefined,
        }
      })
    } catch (e) {
      console.warn('Failed to annotate messages with contacts', e)
      return messages
    }
  }

  // Dialog state
  const [showStatus, setShowStatus] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)
  // Persist the active menu/tab across page refreshes using sessionStorage.
  // Initialize from sessionStorage (if present) to avoid always jumping back to "Send SMS".
  const [activeMenuItem, setActiveMenuItem] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = sessionStorage.getItem('activeMenuItem')
        if (v) {
          const n = parseInt(v, 10)
          if (!isNaN(n)) return n
        }
      }
    } catch (e) {
      // ignore and fall back to default
    }
    return 1
  })
  const [editingRuleId, setEditingRuleId] = useState<string | undefined>(undefined)

  // Ensure sent messages are loaded for the Sent Messages view.
  // Fetch on mount and whenever the Sent Messages tab is opened.
  useEffect(() => {
    // On component mount, load the first page of sent messages
    fetchSentMessages(0).catch((err) => console.warn('Initial fetchSentMessages failed', err))

    return () => {
      // No cleanup required for fetch
    }
  }, [])

  useEffect(() => {
    if (activeMenuItem === 7) {
      // When user navigates to Sent Messages, refresh the list
      fetchSentMessages(0).catch((err) => console.warn('fetchSentMessages failed on tab open', err))
    }
  }, [activeMenuItem])

  // Persist activeMenuItem whenever it changes so a browser refresh restores the tab.
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('activeMenuItem', String(activeMenuItem))
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [activeMenuItem])

  // Toggle a rule enabled/disabled
  const handleToggleRule = (ruleId: string) => {
    setRules((prevRules) =>
      prevRules.map((rule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule)),
    )
  }

  // Handle deleting a rule
  const handleDeleteRule = (ruleId: string) => {
    setRules(prevRules => prevRules.filter(rule => rule.id !== ruleId));
  };

  // Handle adding a new contact
  const handleAddContact = async () => {
    if (!newContactName || !newContactPhone) {
      toast({
        title: "Error",
        description: "Name and phone number are required",
        variant: "destructive",
      })
      return
    }

    try {
      let newContact: Contact
      // Try to persist via contactService if available
      if (contactService && typeof contactService.createContact === 'function') {
        const created = await contactService.createContact({
          name: newContactName,
          phoneNumber: newContactPhone,
          email: newContactEmail || undefined,
          category: newContactType,
          createdAt: new Date(),
        } as Omit<Contact, "id">)
        if (created) {
          newContact = created
        } else {
          newContact = {
            id: Date.now().toString(),
            userId: currentUser?.id || "",
            name: newContactName,
            phoneNumber: newContactPhone,
            email: newContactEmail || undefined,
            category: newContactType,
            createdAt: new Date(),
          }
        }
      } else {
        // Fallback to local state if contactService.createContact is not available
        newContact = {
          id: Date.now().toString(),
          userId: currentUser?.id || "",
          name: newContactName,
          phoneNumber: newContactPhone,
          email: newContactEmail || undefined,
          category: newContactType,
          createdAt: new Date(),
        }
      }

      setContacts((prev) => [...prev, newContact])
      setNewContactName("")
      setNewContactPhone("")
      setNewContactEmail("")
      setNewContactType("personal")

      toast({ title: "Success", description: "Contact added successfully" })
      setShowContacts(false)
    } catch (err) {
      console.error("Error adding contact:", err)
      toast({ title: "Error", description: "Failed to add contact. Please try again.", variant: "destructive" })
    }
  }

  // Handle editing a contact
  const handleEditContact = async (contactId: string, updates: Partial<Contact>) => {
    try {
      const updatedContact = await contactService.updateContact(contactId, updates);
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === contactId ? { ...contact, ...updatedContact } : contact
        )
      );
      showAlert('success', 'Contact updated successfully');
      return updatedContact;
    } catch (error) {
      console.error('Error updating contact:', error);
      showAlert('error', 'Failed to update contact');
      throw error;
    }
  };

  // Handle deleting a contact
  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }
    
    try {
      await contactService.deleteContact(contactId);
      setContacts(prevContacts => prevContacts.filter(contact => contact.id !== contactId));
      showAlert('success', 'Contact deleted successfully');
    } catch (error) {
      console.error('Error deleting contact:', error);
      showAlert('error', 'Failed to delete contact');
    }
  }

  // Contact categories
  const [contactFilters, setContactFilters] = useState({
    companyContacts: true,
    companyGroups: false,
    personalContacts: false,
    personalGroups: false,
  })

  // Add new state variables after existing state
  const [rules, setRules] = useState<Rule[]>([])
  const [inboxMessages, setInboxMessages] = useState<any[]>([])
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [newTemplateCategory, setNewTemplateCategory] = useState<"personal" | "company">("personal")

  const [newRuleName, setNewRuleName] = useState("")
  const [newRuleConditionType, setNewRuleConditionType] = useState<"contains" | "from" | "time" | "keyword">("contains")
  const [newRuleConditionValue, setNewRuleConditionValue] = useState("")
  const [newRuleActionType, setNewRuleActionType] = useState<"forward" | "reply" | "delete" | "folder">("forward")
  const [newRuleActionValue, setNewRuleActionValue] = useState("")

  const [scheduleRecipients, setScheduleRecipients] = useState("")
  const [scheduleMessage, setScheduleMessage] = useState("")
  const [scheduleDateTime, setScheduleDateTime] = useState("")

  const maxCharacters = 160
  const charactersRemaining = maxCharacters - messageText.length

  // Add debounced search state
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Add to your component state
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  // Listen for global logout events and perform thorough cleanup of UI and services.
  useEffect(() => {
    const onLogout = () => {
      try {
        messagingService.stopPollingMessages()
      } catch (e) {
        console.warn('messagingService.stopPollingMessages failed during logout cleanup', e)
      }

      try {
        if (disconnect) disconnect()
      } catch (e) {
        console.warn('WebSocket disconnect failed during logout cleanup', e)
      }

      // Clear component-level data so next login doesn't see stale data
      try {
        setInboxMessages([])
        setSentApiMessages([])
        setSentMessages([])
        setContacts([])
        setTemplates([])
        setRules([])
        setMediaFiles([])
        setScheduledMessages([])
        setSearchResults({ contacts: [], templates: [], messages: [], users: [], groups: [] })
        setFilteredContacts([])
        setSelectedContacts([])
        setToRecipients('')
        setMessageText('')
        setSelectedMessage(null)
        setActiveMenuItem(1)
        setShowInbox(false)
        setShowSentMessages(false)
      } catch (e) {
        console.warn('Failed to reset component state during logout cleanup', e)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('app:logout', onLogout as EventListener)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app:logout', onLogout as EventListener)
      }
    }
  }, [disconnect])

  // Sent messages pagination and filter state
  const [sentApiMessages, setSentApiMessages] = useState<any[]>([]);
  const [sentPaging, setSentPaging] = useState<any>({});
  const [sentOffset, setSentOffset] = useState(0);
  const sentPageSize = 10;
  const [sentSearchQuery, setSentSearchQuery] = useState("");
  const [sentStatusFilter, setSentStatusFilter] = useState("all");

  // Filtered messages for display
  const filteredSentMessages = sentApiMessages.filter((msg) => {
    const matchesSearch =
      sentSearchQuery === "" ||
      (msg.to && msg.to.toLowerCase().includes(sentSearchQuery.toLowerCase())) ||
      (msg.messageContent && msg.messageContent.toLowerCase().includes(sentSearchQuery.toLowerCase()));
    const matchesStatus =
      sentStatusFilter === "all" ||
      (sentStatusFilter === "pending"
        ? ["queued", "pending", "scheduled"].includes(msg.status)
        : msg.status === sentStatusFilter);
    return matchesSearch && matchesStatus;
  });

  // Place this above the JSX for the summary cards in the Sent Messages section:
  // Prefer the API-provided totalCount when available so the summary shows the full dataset size
  const totalSent = (sentPaging?.totalCount ?? sentApiMessages?.length) || 0;
  const deliveredCount = sentApiMessages?.filter(m => m.status === "delivered").length || 0;
  const pendingCount = sentApiMessages?.filter(m => ["queued", "pending", "scheduled"].includes(m.status)).length || 0;
  const failedCount = sentApiMessages?.filter(m => ["failed", "cancelled", "expired"].includes(m.status)).length || 0;

  // Helper function to show alerts
  // Auto-dismissable alert helper. Pass autoDismissMs = 0 to disable auto-dismiss.
  const alertTimeoutRef = useRef<number | null>(null)

  const showAlert = (type: "success" | "error" | "info", message: string, autoDismissMs: number = 5000) => {
    setAlert({ type, message })

    // Clear any previous timeout
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current)
      alertTimeoutRef.current = null
    }

    // Schedule auto-dismiss if requested
    if (autoDismissMs && autoDismissMs > 0) {
      alertTimeoutRef.current = window.setTimeout(() => {
        setAlert(null)
        alertTimeoutRef.current = null
      }, autoDismissMs) as unknown as number
    }
  }

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current)
        alertTimeoutRef.current = null
      }
    }
  }, [])


  // Fetch sent messages
  const fetchSentMessages = async (newOffset: number = 0) => {
    try {
      const sentResp = await messagingService.getSentMessages(newOffset, sentPageSize)
      const messages = sentResp?.messages || []
      const total = sentResp?.totalCount || messages.length || 0
  setSentApiMessages(messages)
  setSentPaging((prev: any) => ({ ...prev, totalCount: total }))
      setSentOffset(newOffset)
      setCurrentPage(Math.floor(newOffset / sentPageSize) + 1)
    } catch (error) {
      console.error("Error fetching sent messages:", error)
      showAlert("error", "Failed to fetch sent messages")
    }
  }

  // Idle detection and polling: when the app is idle, poll messages API (respect rate limits)
  useEffect(() => {
    let idleTimer: number | null = null
    let activityEvents: Array<[string, EventListener]> = []
    let isIdle = false

    const idleMs = 60 * 1000 // 1 minute of inactivity before considered idle

    const resetIdle = () => {
      if (idleTimer) {
        clearTimeout(idleTimer)
      }
      // If we were idle, stop polling when activity resumes
      if (isIdle) {
        messagingService.stopPollingMessages()
        isIdle = false
      }
      idleTimer = window.setTimeout(() => {
        isIdle = true
        // Start polling with reasonable defaults; polling service will handle 429/Retry-After
        messagingService.startPollingMessages({
          intervalMs: 30 * 1000,
          fetchSent: true,
          fetchInbox: true,
          onUpdate: (payload) => {
            if (payload.sent) {
              setSentApiMessages(payload.sent)
            }
            if (payload.inbox) {
              // annotate inbox messages with contacts if available
              const annotated = annotateMessagesWithContacts(payload.inbox, contacts || [])
              setInboxMessages(annotated)
            }
          },
        })
      }, idleMs)
    }

    const activityHandler = () => resetIdle()

    // Hook up activity listeners
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((ev) => {
      const handler = activityHandler
      window.addEventListener(ev, handler)
      activityEvents.push([ev, handler])
    })

    // Pause polling when page hidden, resume idle timer when visible
    const visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        messagingService.stopPollingMessages()
      } else {
        resetIdle()
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    // Start idle countdown
    resetIdle()

    return () => {
      // cleanup
      if (idleTimer) clearTimeout(idleTimer)
      activityEvents.forEach(([ev, h]) => window.removeEventListener(ev, h))
      document.removeEventListener('visibilitychange', visibilityHandler)
      messagingService.stopPollingMessages()
    }
  }, [contacts])

  // Handle login
  const handleLogin = async () => {
    setIsAuthenticated(true)
    setShowLogin(false)
    const user = authService.getCurrentUser();
    setCurrentUser(user)
    await loadData()
    // No redirect; admin button will be visible if user is admin
  }

  // Load data function
  const loadData = async () => {
    try {
      const [contactsData, templatesData, rulesData, inboxData, mediaData] = await Promise.all([
        contactService.getContacts(),
        templateService.getTemplates(),
        rulesService.getRules(),
        // inboxService.getMessages now returns { messages, totalCount }
        inboxService.getMessages().then((r) => r.messages),
        mediaService.getMediaFiles(),
      ])

      // Fetch sent messages separately so we can receive pagination metadata
      const sentResp = await messagingService.getSentMessages(0, 50)
      const sentData = sentResp?.messages || []
      const scheduledData = await messagingService.getScheduledMessages()

  // Annotate inbox messages with contact display names where possible
  const annotatedInbox = annotateMessagesWithContacts(inboxData || [], contactsData || [])

  setContacts(contactsData)
  setTemplates(templatesData)
  setRules(rulesData)
  setInboxMessages(annotatedInbox)
  setMediaFiles(mediaData)
    setSentMessages(sentData)
  // Keep the API-backed sent list in sync so the Sent Messages view updates
  setSentApiMessages(sentData || [])
  // Ensure paging metadata is set for the initial load so UI shows the full total count
  setSentPaging((prev: any) => ({ ...prev, totalCount: sentResp?.totalCount ?? sentData.length ?? 0 }))
  setScheduledMessages(scheduledData)

      setCurrentUser(authService.getCurrentUser())
      // Also load contact groups for UI
      loadGroups()
    } catch (error) {
      console.error("[loadData] Error loading data:", error)
    }
  }

  const loadGroups = async () => {
    try {
      const groups = await contactService.getGroups()
      setContactGroups(groups || [])
    } catch (e) {
      console.warn('Failed to load contact groups', e)
      setContactGroups([])
    }
  }

  // Listen for group changes from the Contacts dialog and reload groups
  useEffect(() => {
    const handler = () => {
      loadGroups().catch((err) => console.warn('Error reloading groups on update', err))
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('contactGroupsUpdated', handler)
    }
    // WebSocket: listen for real-time inbox messages if socket is available
    const inboxHandler = (msg: any) => {
      try {
        const annotated = annotateMessagesWithContacts([msg], contacts || [])
        setInboxMessages((prev) => [annotated[0], ...prev])
        showAlert('info', 'New message received')
      } catch (e) {
        console.warn('Failed to handle real-time inbox message', e)
      }
    }

    const sentHandler = (data: any) => {
      try {
        if (data) setSentApiMessages((prev) => [data, ...prev])
      } catch (e) {
        console.warn('Failed to handle real-time sent message', e)
      }
    }

    if (socket) {
      // Attach handlers to the live socket
      socket.on('inbox:new', inboxHandler)
      socket.on('message:sent', sentHandler)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('contactGroupsUpdated', handler)
      }
      // If socket exists, remove handlers to avoid duplicates
      if (socket) {
        try {
          socket.off('inbox:new', inboxHandler)
          socket.off('message:sent', sentHandler)
        } catch (e) {
          // ignore
        }
      }
    }
  }, [socket, contacts])

  // Search function
  const performSearch = async (query: string) => {
    try {
      // Parallelize searches: server-side contact search (includes admin users merged by API), templates, sent messages, users, and groups
      const [contactsData, templatesData, sentData, usersData, groupsData] = await Promise.all([
        contactService.searchContacts(query),
        templateService.getTemplates(),
        messagingService.getSentMessages(),
        // lazy import userService to avoid circular dependencies in some builds
        (await import("@/lib/user-service")).userService.searchUsers(query, 8),
        contactService.getGroups(),
      ])

      const lowercaseQuery = query.toLowerCase()

      // Contacts come pre-filtered by the server search; apply a lightweight client filter just in case
      const contactResults = (contactsData || []).filter(
        (contact) =>
          contact.name.toLowerCase().includes(lowercaseQuery) ||
          (contact.phoneNumber && contact.phoneNumber.includes(query)) ||
          (contact.email && contact.email.toLowerCase().includes(lowercaseQuery)),
      )

      // Templates
      const templateResults = (templatesData || []).filter(
        (template) =>
          template.name.toLowerCase().includes(lowercaseQuery) || template.content.toLowerCase().includes(lowercaseQuery),
      )

      // Sent messages: `messagingService.getSentMessages()` returns { messages, totalCount }
      const sentArray = Array.isArray(sentData) ? sentData : sentData?.messages || []
      const messageResults = (sentArray || []).filter((message: any) => {
        const toMatches = (message.to || []).some((recipient: string) => recipient.includes(query))
        const content = (message.content || "").toString().toLowerCase()
        return toMatches || content.includes(lowercaseQuery)
      })

      // Users returned from admin API are already filtered server-side, but trim and limit
      const userResults = (usersData || []).slice(0, 8)

      // Groups - do a lightweight filter on name
      const groupResults = (groupsData || []).filter((g) => g.name.toLowerCase().includes(lowercaseQuery)).slice(0, 8)

      setSearchResults({
        contacts: contactResults.slice(0, 6),
        templates: templateResults.slice(0, 4),
        messages: messageResults.slice(0, 6),
        users: userResults,
        groups: groupResults,
      })
    } catch (error) {
      console.error("[Search] Error performing search:", error)
      setSearchResults({
        contacts: [] as Contact[],
        templates: [] as MessageTemplate[],
        messages: [] as Message[],
        users: [],
        groups: []
      })
    }
  }

  // Search change handler
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(async () => {
      if (value.trim()) {
        await performSearch(value)
        setShowSearchResults(true)
      } else {
        setShowSearchResults(false)
        setSearchResults({ contacts: [], templates: [], messages: [], users: [], groups: [] })
      }
    }, 300) // 300ms delay

    setSearchTimeout(timeout)
  }

  // Search result click handler
  const handleSearchResultClick = (type: "contact" | "template" | "message", item: any) => {
    switch (type) {
      case "contact":
        const currentRecipients = toRecipients.trim()
        const newRecipients = currentRecipients ? `${currentRecipients}; ${item.phoneNumber}` : item.phoneNumber
        setToRecipients(newRecipients)
        showAlert("success", `Added ${item.name} to recipients`)
        break
      case "template":
        setMessageText(item.content)
        setSelectedTemplate(item.id)
        showAlert("success", `Template "${item.name}" loaded`)
        break
      case "message":
        setToRecipients(item.to.join("; "))
        setMessageText(item.content)
        showAlert("success", "Previous message loaded")
        break
    }
    setSearchQuery("")
    setShowSearchResults(false)
  }

  // Clear form function
  const clearForm = () => {
    setToRecipients("")
    setMessageText("")
    setSaveTitle("")
    setSelectedTemplate("")
    setSelectedContacts([])
    showAlert("success", "Form cleared successfully")
  }

  // Send now handler
  const handleSendNow = async () => {
    if (!messageText.trim()) {
      showAlert("error", "Please enter a message")
      return
    }

    let recipients: string[] = []

    if (toRecipients.trim()) {
      recipients = messagingService.parseRecipients(toRecipients)
    }

    if (selectedContacts.length > 0) {
      const selectedContactObjects = await contactService.getSelectedContacts(selectedContacts)
      recipients = [...recipients, ...selectedContactObjects.map((c) => c.phoneNumber)]
    }

    if (recipients.length === 0) {
      showAlert("error", "Please add recipients")
      return
    }

    // Determine message type based on active menu item
    const messageType = activeMenuItem === 2 ? "mms" : "sms"

    const result = await messagingService.sendMessage(
      recipients,
      messageText,
      messageType,
      undefined,
      selectedTemplate ? templates.find((t) => t.id === selectedTemplate)?.name : undefined,
    )

    if (result.success) {
      const messageLabel = messageType === "mms" ? "MMS" : "SMS"
      showAlert("success", `${messageLabel} sent successfully to ${recipients.length} recipient(s)`)
      clearForm()
      // Refresh lists so Sent and Inbox views reflect the newly-sent message
      try {
        await fetchSentMessages(0)
      } catch (err) {
        console.warn("fetchSentMessages failed after send:", err)
      }
      try {
        await fetchInboxMessages(0)
      } catch (err) {
        console.warn("fetchInboxMessages failed after send:", err)
      }

      // Also refresh small bits of data like credits/user info
      loadData() // Refresh user credits and other summary data
    } else {
      showAlert("error", result.error || "Failed to send message")
    }
  }

  // Template select handler
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setMessageText(template.content)
      showAlert("success", `Template "${template.name}" loaded`)
    }
  }

  // Save template handler
  const handleSaveTemplate = async () => {
    if (!saveTitle.trim() || !messageText.trim()) {
      showAlert("error", "Please enter both title and message content")
      return
    }

    try {
      const template = await templateService.addTemplate(
        saveTitle,
        messageText,
        "personal" // Default to personal category
      )

      if (template) {
        showAlert("success", `Template "${template.name}" saved successfully`)
        setSaveTitle("")
        loadData() // Refresh templates
      } else {
        showAlert("error", "Failed to save template")
      }
    } catch (error) {
      console.error("Error saving template:", error)
      showAlert("error", "Failed to save template")
    }
  }

  // Add selected contacts to recipients
  const addSelectedContactsToRecipients = async () => {
    if (selectedContacts.length === 0) {
      showAlert("error", "Please select contacts first")
      return
    }

    const selectedContactObjects = await contactService.getSelectedContacts(selectedContacts)
    const phoneNumbers = selectedContactObjects.map((c) => c.phoneNumber)

    const currentRecipients = toRecipients.trim()
    const newRecipients = currentRecipients
      ? `${currentRecipients}; ${phoneNumbers.join("; ")}`
      : phoneNumbers.join("; ")

    setToRecipients(newRecipients)
    setSelectedContacts([])
    showAlert("success", `Added ${phoneNumbers.length} contact(s) to recipients`)
  }

  // Fetch inbox messages
  const fetchInboxMessages = async (newOffset: number = 0) => {
    try {
  const inboxResp = await inboxService.getMessages(newOffset, pageSize)
  const inboxData = inboxResp?.messages || []
      // Try to resolve contact names for incoming numbers
      let contactsList = contacts
      try {
        // If we don't have contacts in state, fetch them
        if (!contactsList || contactsList.length === 0) {
          contactsList = await contactService.getContacts()
        }
      } catch (e) {
        console.warn('Failed to load contacts for inbox annotation', e)
      }

      const annotated = annotateMessagesWithContacts(inboxData || [], contactsList || [])
      setInboxMessages(annotated)
      setPaging((prev: any) => ({
        ...prev,
        totalCount: inboxResp?.totalCount ?? inboxData.length,
        previousPage: newOffset > 0,
        nextPage: (inboxData?.length || 0) === pageSize,
      }))
      setOffset(newOffset)
    } catch (error) {
      console.error("Error fetching inbox messages:", error)
      showAlert("error", "Failed to fetch inbox messages")
    }
  }

  // Replace the contact filtering useEffect
  useEffect(() => {
    const updateFilteredContacts = async () => {
      try {
        let filtered = await contactService.getContacts()

        // Apply category filters
        if (!contactFilters.companyContacts && !contactFilters.personalContacts) {
          filtered = []
        } else {
          filtered = filtered.filter((contact) => {
            if (contactFilters.companyContacts && contact.category === "company") return true
            if (contactFilters.personalContacts && contact.category === "personal") return true
            return false
          })
        }

        // Apply sidebar search filter
        if (sidebarContactSearchQuery.trim()) {
          const lowercaseQuery = sidebarContactSearchQuery.toLowerCase()
          filtered = filtered.filter(
            (contact) =>
              contact.name.toLowerCase().includes(lowercaseQuery) ||
              contact.phoneNumber.includes(sidebarContactSearchQuery) ||
              (contact.email && contact.email.toLowerCase().includes(lowercaseQuery)),
          )
        }

        setFilteredContacts(filtered)
      } catch (error) {
        console.error("[ContactFilter] Error filtering contacts:", error)
        setFilteredContacts([])
      }
    }

    updateFilteredContacts()
  }, [sidebarContactSearchQuery, contactFilters])

  // Menu items configuration
  const menuItems = [
    { id: 1, label: "SEND SMS", description: "Compose and send SMS messages" },
    { id: 2, label: "SEND MMS", description: "Compose and send MMS messages with media" },
    { id: 3, label: "INBOX", description: "View received messages" },
    { id: 4, label: "RULES WIZARD", description: "Create and manage message rules" },
    { id: 5, label: "CONTACTS", description: "Manage your contacts" },
    { id: 6, label: "LIBRARY", description: "Access message templates" },
    { id: 7, label: "SENT MESSAGES", description: "View sent messages history" },
    { id: 8, label: "SCHEDULED MESSAGES", description: "Manage scheduled messages" },
  ]

  // Contact categories configuration
  const contactCategories = [
    { key: "companyContacts", label: "Company Contacts", icon: Users, checked: true },
    { key: "companyGroups", label: "Company Groups", icon: Users, checked: false },
    { key: "personalContacts", label: "Personal Contacts", icon: User, checked: false },
    { key: "personalGroups", label: "Personal Groups", icon: User, checked: false },
  ]

  if (!isAuthenticated) {
    return <LoginDialog open={showLogin} onOpenChange={setShowLogin} onLoginSuccess={handleLogin} />
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Alert */}
        {alert && (
          <div className="fixed top-4 right-4 z-50 w-96">
            <Alert variant={alert.type === "error" ? "destructive" : "default"}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {alert.type === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : alert.type === "error" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription className="truncate">{alert.message}</AlertDescription>
                </div>
                <div>
                  <button
                    aria-label="Close alert"
                    onClick={() => {
                      setAlert(null)
                      if (alertTimeoutRef.current) {
                        window.clearTimeout(alertTimeoutRef.current)
                        alertTimeoutRef.current = null
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Alert>
          </div>
        )}

        {/* Header */}
        <div className="bg-background border-b border-border px-4 py-2 flex items-center justify-between text-foreground">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-purple-600 font-bold text-xl">Desktop Messaging</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search contacts, templates, messages..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10"
                onFocus={() => searchQuery && setShowSearchResults(true)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => {
                    setSearchQuery("")
                    setShowSearchResults(false)
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {searchResults.contacts.length === 0 &&
                searchResults.templates.length === 0 &&
                searchResults.messages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No results found</p>
                    <p className="text-xs text-gray-400">Try searching for contacts, templates, or messages</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {/* Contacts */}
                    {searchResults.contacts.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">CONTACTS</div>
                        {searchResults.contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                            onClick={() => handleSearchResultClick("contact", contact)}
                          >
                            <User className="w-4 h-4 text-blue-600" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{contact.name}</div>
                              <div className="text-xs text-gray-600">{contact.phoneNumber}</div>
                            </div>
                            <div className="text-xs text-blue-600">Add to recipients</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Templates */}
                    {searchResults.templates.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">TEMPLATES</div>
                        {searchResults.templates.map((template) => (
                          <div
                            key={template.id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                            onClick={() => handleSearchResultClick("template", template)}
                          >
                            <BookOpen className="w-4 h-4 text-green-600" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="text-xs text-gray-600 truncate">{template.content}</div>
                            </div>
                            <div className="text-xs text-green-600">Use template</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Users */}
                    {searchResults.users.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">USERS</div>
                        {searchResults.users.map((user) => (
                          <div
                            key={user.id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                            onClick={() => {
                              // Fill recipient with user's personalMobile if available
                              const mobile = user.personalMobile || user.personal_mobile || user.mobile || ""
                              if (mobile) {
                                const currentRecipients = toRecipients.trim()
                                const newRecipients = currentRecipients ? `${currentRecipients}; ${mobile}` : mobile
                                setToRecipients(newRecipients)
                                showAlert('success', `Added ${user.username || user.email} to recipients`)
                              } else {
                                showAlert('info', `User ${user.username || user.email} has no mobile number`) 
                              }
                              setSearchQuery("")
                              setShowSearchResults(false)
                            }}
                          >
                            <Users className="w-4 h-4 text-purple-600" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{user.username || user.email}</div>
                              <div className="text-xs text-gray-600">{user.email}</div>
                            </div>
                            <div className="text-xs text-purple-600">Add to recipients</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Groups */}
                    {searchResults.groups.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">GROUPS</div>
                        {searchResults.groups.map((group) => (
                          <div
                            key={group.id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                            onClick={async () => {
                              // Expand group members into recipient list
                              try {
                                const members = group.memberIds || []
                                const selected = await contactService.getSelectedContacts(members)
                                const phones = selected.map((c) => c.phoneNumber).filter(Boolean)
                                if (phones.length) {
                                  const currentRecipients = toRecipients.trim()
                                  const newRecipients = currentRecipients ? `${currentRecipients}; ${phones.join('; ')}` : phones.join('; ')
                                  setToRecipients(newRecipients)
                                  showAlert('success', `Added ${phones.length} contacts from group ${group.name}`)
                                } else {
                                  showAlert('info', `No phone numbers found for group ${group.name}`)
                                }
                              } catch (e) {
                                console.warn('Failed to add group members to recipients', e)
                                showAlert('error', 'Failed to add group members')
                              }
                              setSearchQuery("")
                              setShowSearchResults(false)
                            }}
                          >
                            <Users className="w-4 h-4 text-indigo-600" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{group.name}</div>
                              <div className="text-xs text-gray-600">{group.memberIds?.length || 0} members</div>
                            </div>
                            <div className="text-xs text-indigo-600">Add group</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Messages */}
                    {searchResults.messages.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">MESSAGES</div>
                        {searchResults.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-4 hover:bg-gray-50 cursor-pointer
                              ${selectedMessage && selectedMessage.id === message.id
                                ? "bg-purple-100 border-l-4 border-l-purple-500"
                                : message.status !== "delivered"
                                  ? "bg-blue-50 border-l-4 border-l-blue-500"
                                  : ""}
                            `}
                            onClick={() => setSelectedMessage(message)}
                          >
                            <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{message.from}</span>
                            </div>
                                <div className="text-sm text-gray-600">{message.content}</div>
                              </div>
                              <div className="text-xs text-gray-500 ml-4">
                                {"createdAt" in message && message.createdAt
                                  ? new Date(message.createdAt).toLocaleString()
                                  : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-foreground hover:text-primary"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 mr-1" /> : <Moon className="w-4 h-4 mr-1" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="text-foreground hover:text-primary"
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              Help
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserSettings(true)}
              className="text-foreground hover:text-primary"
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
            {/* Admin button, only visible to admin users */}
            {currentUser?.role === "admin" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin")}
                className="text-foreground hover:bg-primary hover:text-primary-foreground border-primary/20"
              >
                <span className="font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Admin
                </span>
              </Button>
            ) : null}
            {/* Logout button, always visible */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-foreground hover:text-primary"
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar */}
          <div className="w-80 bg-card border-r border-border text-foreground">
            {/* Menu Options */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 text-sm font-bold flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Menu Options: The main items are displayed at the top left hand side of the screen</p>
                </TooltipContent>
              </Tooltip>
              MENU Options
            </div>

            <div className="p-2 space-y-1">
              {menuItems.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                        activeMenuItem === item.id ? "bg-purple-200 border border-purple-300" : "hover:bg-gray-200"
                      }`}
                      onClick={() => {
                        setActiveMenuItem(item.id)
                        // Remove the dialog opening logic - content will show inline
                      }}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Quick Contacts */}
            <div className="mt-4">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 text-sm font-bold">
                Quick contacts
              </div>

              <div className="p-2 space-y-2">
                {contactCategories.map((category) => (
                  <div key={category.key} className="flex items-center gap-2">
                    <Checkbox
                      checked={(contactFilters as any)[category.key] === true}
                      onCheckedChange={(checked) => {
                        setContactFilters((prev) => ({
                          ...prev,
                          [category.key]: checked as boolean,
                        }))
                      }}
                      className="w-4 h-4"
                    />
                    <category.icon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">{category.label}</span>
                  </div>
                ))}
              </div>

              {/* Sidebar Contact Search */}
              <div className="p-2">
                <div className="relative">
                  <Input
                    placeholder="Search"
                    value={sidebarContactSearchQuery}
                    onChange={(e) => setSidebarContactSearchQuery(e.target.value)}
                    className="text-sm h-8"
                  />
                </div>
              </div>

              {/* Contact List */}
              <div className="p-2">
                <div className="border border-border bg-card h-32 text-xs p-2 overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">No contacts found</div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={`cursor-pointer p-1 rounded hover:bg-gray-100 ${
                          selectedContacts.includes(contact.id) ? "bg-blue-100" : ""
                        }`}
                        onClick={() => {
                          setSelectedContacts((prev) =>
                            prev.includes(contact.id) ? prev.filter((id) => id !== contact.id) : [...prev, contact.id],
                          )
                        }}
                      >
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-gray-600">{contact.phoneNumber}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add to Recipients Button */}
              <div className="p-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={addSelectedContactsToRecipients}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 relative"
                      disabled={selectedContacts.length === 0}
                    >
                      ADD TO RECIPIENTS
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add To Recipients Button: Adds selected contacts to the recipient list</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-background text-foreground">
            {/* Dynamic Header based on active menu item */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 font-bold text-lg">
              {activeMenuItem === 1 && "SEND SMS"}
              {activeMenuItem === 2 && "SEND MMS"}
              {activeMenuItem === 3 && "INBOX"}
              {activeMenuItem === 4 && "RULES WIZARD"}
              {activeMenuItem === 5 && "CONTACTS"}
              {activeMenuItem === 6 && "LIBRARY"}
              {activeMenuItem === 7 && "SENT MESSAGES"}
              {activeMenuItem === 8 && "SCHEDULED MESSAGES"}
            </div>

            {/* Dynamic Content based on active menu item */}
            {activeMenuItem === 1 && (
              <div className="p-4 space-y-4">
                {/* Send SMS Content - existing content */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">From:</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Select defaultValue="personal">
                              <SelectTrigger className="w-40 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="personal">{currentUser?.personalMobile ? currentUser.personalMobile : "PersonalMobile (Not Set)"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>From: Specify where replies to your SMS are to be sent. For example, company Inbox</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={bulkNumberSend} onCheckedChange={checked => setBulkNumberSend(checked === true)} className="w-4 h-4" />
                      <span className="text-sm text-blue-600">Bulk Number Send</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={mailMerge} onCheckedChange={checked => setMailMerge(checked === true)} className="w-4 h-4" />
                      <span className="text-sm text-blue-600">Mail Merge</span>
                    </div>
                  </div>
                </div>

                {/* To Field */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">To:</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Textarea
                          value={toRecipients}
                          onChange={(e) => setToRecipients(e.target.value)}
                          className="h-24 resize-none bg-card text-foreground border-border"
                          placeholder="Enter mobile phone numbers separated by semicolons"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        To: Display all recipients of the message. Also use this field to enter recipients (mobile phone
                        numbers) not included in any of the address books
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-xs text-gray-600 mt-1">
                    Message recipients must be separated by a semicolon e.g. 0409xxxxxx; 0409xxxxxx; 0409xxxxxx
                  </div>
                </div>

                {/* Save As Section */}
                <div className="flex items-center gap-4">
                  <span className="font-medium">Save as:</span>
                  <Select defaultValue="personal">
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal Message</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="font-medium">Title:</span>
                  <Input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-32 h-8 bg-card text-foreground border-border" />
                  <Button
                    onClick={handleSaveTemplate}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm"
                  >
                    SAVE
                  </Button>
                </div>

                {/* Compose Message */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">Compose Message</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Select Template</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Message Template: Instead of composing a new message from scratch, you can select a
                            predefined template from the list of options
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="h-32 resize-none bg-card text-foreground border-border"
                          placeholder="Enter your message here..."
                          maxLength={maxCharacters}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Compose Message: The message text is entered here</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Character Count and Buttons */}
                  <div className="flex items-center justify-between mt-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Characters remaining: {charactersRemaining}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Characters Remaining: Displays number of characters remaining as you type</p>
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Button
                              onClick={clearForm}
                              className="bg-gray-500 hover:bg-gray-600 text-white h-8 px-4 text-sm"
                            >
                              CLEAR
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear Button: Clear all message and recipient details and start again</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Button
                              onClick={() => setShowSendLater(true)}
                              className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm"
                            >
                              SEND LATER
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Send Later Button: Define the send schedule for the message (Note: the user account needs
                            adequate permissions to use this feature)
                          </p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Button
                              onClick={handleSendNow}
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-4 text-sm"
                            >
                              SEND NOW
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Send Now Button: Send the SMS message immediately</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Send MMS Content */}
            {activeMenuItem === 2 && (
              <div className="p-4 space-y-4">
                {/* MMS Form State */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">From:</span>
                      <Select defaultValue="personal">
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">PersonalMobile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={bulkNumberSend} onCheckedChange={checked => setBulkNumberSend(checked === true)} className="w-4 h-4" />
                      <span className="text-sm text-blue-600">Bulk Number Send</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={mailMerge} onCheckedChange={checked => setMailMerge(checked === true)} className="w-4 h-4" />
                      <span className="text-sm text-blue-600">Mail Merge</span>
                    </div>
                  </div>
                </div>

                {/* Recipients Field */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Recipients:</span>
                  </div>
                  <Textarea
                    value={toRecipients}
                    onChange={(e) => setToRecipients(e.target.value)}
                    className="h-24 resize-none"
                    placeholder="Enter mobile phone numbers separated by semicolons"
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    Message recipients must be separated by a semicolon e.g. 0409xxxxxx; 0409xxxxxx; 0409xxxxxx
                  </div>
                </div>

                {/* Subject Field */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Subject (Optional):</span>
                  </div>
                  <Input placeholder="Enter subject" className="h-8" />
                </div>

                {/* Save As Section */}
                <div className="flex items-center gap-4">
                  <span className="font-medium">Save as:</span>
                  <Select defaultValue="personal">
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal Message</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="font-medium">Title:</span>
                  <Input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-32 h-8" />
                  <Button
                    onClick={handleSaveTemplate}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm"
                  >
                    SAVE
                  </Button>
                </div>

                {/* Message Content */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">Compose Message</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Select Template</span>
                      <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="h-32 resize-none"
                    placeholder="Enter your message here..."
                  />
                </div>

                {/* Media Attachments */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Media Attachments:</span>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Drag and drop files here, or click to select</p>
                        <p className="text-xs text-gray-500">
                          Supports images, videos, and audio files (Max 500KB each)
                        </p>
                      </div>
                      <Button variant="outline" className="mt-2">
                        Select Files
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Total size: 0KB / 500KB</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={clearForm} className="bg-gray-500 hover:bg-gray-600 text-white h-8 px-4 text-sm">
                      CLEAR
                    </Button>
                    <Button
                      onClick={() => setShowSendLater(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-sm"
                    >
                      SEND LATER
                    </Button>
                    <Button
                      onClick={handleSendNow}
                      className="bg-green-600 hover:bg-green-700 text-white h-8 px-4 text-sm"
                    >
                      SEND MMS
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Inbox Content */}
            {activeMenuItem === 3 && (
              <div className="p-4 space-y-4">
                {/* Inbox Filters */}
                <div className="flex items-center gap-4 mb-4">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Messages</SelectItem>
                      <SelectItem value="personal">Personal Inbox</SelectItem>
                      <SelectItem value="company">Company Inbox</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Search messages..." className="flex-1 max-w-md" value={inboxSearchQuery} onChange={e => setInboxSearchQuery(e.target.value)} />
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={async () => {
                    // Trigger search for inbox messages using inboxService
                    if (inboxSearchQuery.trim()) {
                      const results = await inboxService.searchMessages(inboxSearchQuery.trim())
                      setInboxMessages(results)
                      showAlert('success', `Found ${results.length} message(s)`)
                    } else {
                      // If cleared, reload the inbox
                      fetchInboxMessages(0).catch(err => console.warn('Failed to reload inbox', err))
                    }
                  }}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Message List */}
                <div className="border border-gray-300 rounded-lg bg-white">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">
                    Received Messages
                  </div>
                  <div className="h-[60vh] overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                      {inboxMessages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No messages found</div>
                      ) : (
                        // Normalize message shape so both Telstra API messages and DB messages render
                        inboxMessages
                          .filter((msg: any) => (typeof msg.direction === "undefined" ? true : msg.direction === "incoming"))
                          .map((message: any) => {
                            const id = message.messageId || message.id
                            const rawFrom = message.from || message.fromNumber || message.fromAddress || "Unknown"
                            const from = message.displayFrom || rawFrom
                            const content = message.messageContent || message.content || message.message || ""
                            const status = message.status || (message.read ? "delivered" : "received")
                            const receivedTs = message.receivedTimestamp || message.receivedAt || message.received || message.sentTimestamp || message.sentAt

                            return (
                              <div
                                key={id}
                                className={`p-4 cursor-pointer
                                  ${selectedMessage && (selectedMessage.messageId || selectedMessage.id) === id
                                    ? "bg-purple-100 border-l-4 border-l-purple-500"
                                    : status !== "delivered"
                                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                                      : ""}
                                `}
                                onClick={() => setSelectedMessage(message)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`font-medium ${status !== "delivered" ? "font-bold" : ""}`}>{from}</span>
                                      {status !== "delivered" && (
                                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">NEW</span>
                                      )}
                                    </div>

                                    <div className="text-sm text-gray-600">{content}</div>
                                  </div>
                                  <div className="text-xs text-gray-500 ml-4">
                                    {receivedTs ? new Date(receivedTs).toLocaleString() : ""}
                                  </div>
                                </div>
                              </div>
                            )
                          })
                      )}
                    </div>
                  </div>
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-2 px-4 pb-2">
                    {(() => {
                      const totalCount = paging?.totalCount ?? inboxMessages.length ?? 0
                      const totalPages = Math.max(1, Math.ceil((totalCount || inboxMessages.length || 0) / pageSize))
                      const currentPage = Math.floor(offset / pageSize) + 1
                      const startIdx = offset + 1
                      const endIdx = Math.min(offset + inboxMessages.length, totalCount)

                      // Determine page window (show up to 7 pages centered on current)
                      const windowSize = 7
                      let startPage = Math.max(1, currentPage - Math.floor(windowSize / 2))
                      let endPage = Math.min(totalPages, startPage + windowSize - 1)
                      if (endPage - startPage + 1 < windowSize) {
                        startPage = Math.max(1, endPage - windowSize + 1)
                      }

                      const pages: number[] = []
                      for (let p = startPage; p <= endPage; p++) pages.push(p)

                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === 1}
                              onClick={() => fetchInboxMessages(Math.max(0, offset - pageSize))}
                            >
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {startPage > 1 && (
                                <>
                                  <Button
                                    variant={1 === currentPage ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => fetchInboxMessages(0)}
                                  >
                                    1
                                  </Button>
                                  {startPage > 2 && <span className="px-2 text-sm text-gray-500">...</span>}
                                </>
                              )}

                              {pages.map((p) => (
                                <Button
                                  key={p}
                                  variant={p === currentPage ? "default" : "ghost"}
                                  size="sm"
                                  onClick={() => fetchInboxMessages((p - 1) * pageSize)}
                                >
                                  {p}
                                </Button>
                              ))}

                              {endPage < totalPages && (
                                <>
                                  {endPage < totalPages - 1 && <span className="px-2 text-sm text-gray-500">...</span>}
                                  <Button
                                    variant={totalPages === currentPage ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => fetchInboxMessages((totalPages - 1) * pageSize)}
                                  >
                                    {totalPages}
                                  </Button>
                                </>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage >= totalPages}
                              onClick={() => fetchInboxMessages(offset + pageSize)}
                            >
                              Next
                            </Button>
                          </div>

                          <div className="text-sm text-gray-600">
                            Showing {startIdx}-{endIdx} of {totalCount} messages
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      if (selectedMessage) {
                        // Switch to Send SMS tab
                        setActiveMenuItem(1);
                        // Pre-populate recipient with sender
                        setToRecipients(selectedMessage.from);
                        // Pre-populate message with reply prefix
                        setMessageText(`Re: ${selectedMessage.messageContent}`);
                        // Clear selected message
                        setSelectedMessage(null);
                        showAlert("success", "Reply message prepared");
                      }
                    }}
                    disabled={!selectedMessage}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Reply
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedMessage) {
                        // Switch to Send SMS tab
                        setActiveMenuItem(1);
                        // Pre-populate message content for forwarding
                        setMessageText(`Forwarded message: ${selectedMessage.messageContent}`);
                        // Clear recipients so user can choose who to forward to
                        setToRecipients("");
                        // Clear selected message
                        setSelectedMessage(null);
                        showAlert("success", "Message prepared for forwarding");
                      }
                    }}
                    disabled={!selectedMessage}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Forward
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      (async () => {
                        if (!selectedMessage) return
                        const idToDelete = selectedMessage.messageId || selectedMessage.id
                        if (!idToDelete) return
                        if (!confirm('Delete selected message? This cannot be undone.')) return
                        try {
                          const ok = await inboxService.deleteMessage(idToDelete)
                          if (ok) {
                            setInboxMessages((msgs) => msgs.filter((msg) => {
                              const mid = msg.messageId || msg.id
                              return mid !== idToDelete
                            }))
                            setSelectedMessage(null)
                            showAlert('success', 'Message deleted')
                          } else {
                            showAlert('error', 'Failed to delete message')
                          }
                        } catch (err) {
                          console.warn('Failed to delete message', err)
                          showAlert('error', 'Failed to delete message')
                        }
                      })()
                    }}
                    disabled={!selectedMessage}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedMessage) {
                        setInboxMessages((msgs) =>
                          msgs.map((msg) =>
                            msg.messageId === selectedMessage.messageId ? { ...msg, status: "delivered" } : msg
                          )
                        );
                      }
                    }}
                    disabled={!selectedMessage}
                  >
                    Mark as Read
                  </Button>
                </div>
              </div>
            )}

            {/* Rules Wizard Content */}
            {activeMenuItem === 4 && (
              <div className="p-4 space-y-4">
                {/* Rules List */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Message Rules</h3>
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowRulesWizard(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Create New Rule
                  </Button>
                </div>

                {/* Existing Rules */}
                <div className="border border-gray-300 rounded-lg bg-white">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">
                    Active Rules ({rules.filter(r => r.enabled).length} of {rules.length})
                  </div>
                  <div className="divide-y divide-gray-200">
                    {rules.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No rules created yet. Click "Create New Rule" to get started.
                      </div>
                    ) : (
                      rules.map((rule) => (
                        <div key={rule.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-medium">{rule.name}</span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    rule.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {rule.enabled ? "ACTIVE" : "DISABLED"}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-1">
                                <strong>When:</strong> {rule.condition.type} "{rule.condition.value}"
                              </div>
                              <div className="text-sm text-gray-600">
                                <strong>Then:</strong> {rule.action.type === "forward" ? `Forward to ${rule.action.value}` :
                                  rule.action.type === "reply" ? `Auto-reply: "${rule.action.value.substring(0, 50)}..."` :
                                  rule.action.type === "delete" ? "Delete message" :
                                  `Move to folder: ${rule.action.value}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setEditingRuleId(rule.id);
                                setShowRulesWizard(true);
                              }}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                                handleDeleteRule(rule.id);
                              }}>
                                Delete
                              </Button>
                              <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={() => handleToggleRule(rule.id)}
                                className="ml-2 w-4 h-4"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contacts Content */}
            {activeMenuItem === 5 && (
              <div className="p-4 space-y-4">
                {/* Contact Management Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Contact Management</h3>
                  <div className="flex items-center gap-2">
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                      // Open the Contacts dialog for editing contacts
                      setShowContacts(true);
                    }}>
                      <User className="w-4 h-4 mr-2" />
                      Edit Contacts
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                      setShowContacts(true);
                    }}>
                      <Users className="w-4 h-4 mr-2" />
                      Create Group
                    </Button>
                  </div>
                </div>

                {/* Contact Filters */}
                <div className="flex items-center gap-4 mb-4">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contacts</SelectItem>
                      <SelectItem value="company">Company Contacts</SelectItem>
                      <SelectItem value="personal">Personal Contacts</SelectItem>
                      <SelectItem value="groups">Groups</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search contacts..."
                    className="flex-1 max-w-md"
                    value={contactsSearchQuery}
                    onChange={(e) => setContactsSearchQuery(e.target.value)}
                  />
                  <Button variant="outline" onClick={async () => {
                    // Trigger search for contacts using the searchContacts service
                    if (contactsSearchQuery.trim()) {
                      const results = await contactService.searchContacts(contactsSearchQuery.trim())
                      console.log('Search results:', results)
                      setContacts(results)
                      if (results.length === 0) {
                        showAlert('info', 'No contacts found matching your search')
                      } else {
                        showAlert('success', `Found ${results.length} contact(s)`)
                      }
                    } else {
                      // If search cleared, reload full contact list
                      try {
                        const all = await contactService.getContacts()
                        setContacts(all)
                        showAlert('success', `Loaded ${all.length} contacts`)
                      } catch (e) {
                        console.warn('Failed to reload contacts', e)
                      }
                    }
                  }}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Contacts List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Individual Contacts */}
                  <div className="border border-gray-300 rounded-lg bg-white">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">
                      Individual Contacts
                    </div>
                    <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                      {contacts.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No contacts found</div>
                      ) : (
                        contacts.map((contact) => (
                          <div key={contact.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{contact.name}</span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      contact.category === "company"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {contact.category}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">{contact.phoneNumber}</div>
                                {contact.email && <div className="text-sm text-gray-600">{contact.email}</div>}
                              </div>
                              <div className="flex items-center gap-1">
                                {/* If this is a synthetic user-derived contact (id prefixed with "user:"),
                                    do not allow edit/delete since it doesn't correspond to a contact row. */}
                                {!String(contact.id).startsWith('user:') ? (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => {
                                      handleEditContact(contact.id, {});
                                    }}>
                                      Edit
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                                      handleDeleteContact(contact.id);
                                    }}>
                                      Delete
                                    </Button>
                                  </>
                                ) : (
                                  <div className="text-xs text-gray-500">(user)</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Contact Groups */}
                  <div className="border border-gray-300 rounded-lg bg-white">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">
                      Contact Groups
                    </div>
                    <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                      {contactGroups.length === 0 ? (
                        <div className="p-4 text-gray-500">No groups defined. Open Contacts to create groups.</div>
                      ) : (
                        contactGroups.map((group) => (
                          <div key={group.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Users className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">{group.name}</span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      group.type === "company"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {group.type === "company" ? "Company" : "Personal"}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">{group.memberIds?.length || 0} members</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" onClick={() => {
                                  // Open contacts dialog where groups can be managed
                                  setShowContacts(true);
                                }}>
                                  Manage
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-600" onClick={async () => {
                                  if (!confirm(`Delete group "${group.name}"?`)) return
                                  await contactService.deleteGroup(group.id)
                                  await loadGroups()
                                  showAlert("success", `Group "${group.name}" deleted`)
                                }}>
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Contact Form */}
                <div id="add-contact-form" className="border border-gray-300 rounded-lg bg-white p-4">
                  <h4 className="font-medium mb-4">Add New Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name</label>
                      <Input
                        placeholder="Enter contact name"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number</label>
                      <Input
                        placeholder="+61..."
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input
                        placeholder="email@example.com"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Type</label>
                      <Select
                        value={newContactType}
                        onValueChange={(value: "personal" | "company") => setNewContactType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button onClick={handleAddContact} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Add Contact
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // trigger CSV import file input
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = '.csv,text/csv'
                        input.onchange = async (e) => {
                          const files = (e.target as HTMLInputElement).files
                          if (!files || files.length === 0) return
                          const text = await files[0].text()
                          const parsed = parseCsv(text)
                          if (!parsed || parsed.length === 0) {
                            toast({ title: 'Error', description: 'No contacts found in CSV', variant: 'destructive' })
                            return
                          }
                          // Map headers to expected fields (name, phoneNumber, email, category)
                          const contactsPayload = parsed.map((row) => ({
                            name: row['name'] || row['Name'] || row['fullName'] || row['Full Name'] || '',
                            phoneNumber: row['phoneNumber'] || row['Phone'] || row['phone'] || row['PhoneNumber'] || '',
                            email: row['email'] || row['Email'] || '',
                            category: (row['category'] || row['Category'] || 'personal').toString().toLowerCase(),
                          })).filter(c => c.name && c.phoneNumber)

                          if (contactsPayload.length === 0) {
                            toast({ title: 'Error', description: 'CSV contained no valid contacts', variant: 'destructive' })
                            return
                          }

                          try {
                            const resp = await fetch('/api/contacts/import', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer user_${currentUser?.id}` },
                              body: JSON.stringify({ userId: currentUser?.id, contacts: contactsPayload }),
                            })
                            if (!resp.ok) throw new Error('Import failed')
                            const data = await resp.json()
                            toast({ title: 'Success', description: `Imported ${data.created?.length || 0} contacts` })
                            await loadData()
                          } catch (e) {
                            console.error('CSV import failed', e)
                            toast({ title: 'Error', description: 'Failed to import CSV', variant: 'destructive' })
                          }
                        }
                        input.click()
                      }}
                    >
                      Import CSV
                    </Button>
                    <Button variant="outline" onClick={async () => {
                      // Export contacts as CSV
                      try {
                        const resp = await fetch(`/api/contacts/export?userId=${currentUser?.id}` , { headers: { 'Authorization': `Bearer user_${currentUser?.id}` } })
                        if (!resp.ok) throw new Error('Export failed')
                        const txt = await resp.text()
                        const blob = new Blob([txt], { type: 'text/csv' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `contacts-${currentUser?.id}.csv`
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                        URL.revokeObjectURL(url)
                      } catch (e) {
                        console.error('Export failed', e)
                        toast({ title: 'Error', description: 'Failed to export contacts', variant: 'destructive' })
                      }
                    }}>
                      Export CSV
                    </Button>
                    <Button variant="outline" onClick={async () => {
                      // Download template CSV (headers only)
                      try {
                        const resp = await fetch(`/api/contacts/export?userId=${currentUser?.id}&template=1`, { headers: { 'Authorization': `Bearer user_${currentUser?.id}` } })
                        if (!resp.ok) throw new Error('Template download failed')
                        const txt = await resp.text()
                        const blob = new Blob([txt], { type: 'text/csv' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `contacts-template.csv`
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                        URL.revokeObjectURL(url)
                      } catch (e) {
                        console.error('Template download failed', e)
                        toast({ title: 'Error', description: 'Failed to download template', variant: 'destructive' })
                      }
                    }}>
                      Download CSV Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewContactName("")
                        setNewContactPhone("")
                        setNewContactEmail("")
                        setNewContactType("personal")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Library Content */}
            {activeMenuItem === 6 && (
              <div className="p-4 space-y-4">
                {/* Library Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Message Library</h3>
                  <div className="flex items-center gap-2">
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                      // Reset editor to create new template and scroll to it
                      setEditingTemplateId(null)
                      setNewTemplateName("")
                      setNewTemplateContent("")
                      setNewTemplateCategory("personal")
                      const formElement = document.getElementById('template-editor');
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: 'smooth' });
                      }
                      showAlert("success", "Scroll down to create a new template");
                    }}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      New Template
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                      // Create a hidden file input and trigger it
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*,video/*,audio/*';
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) {
                          handleFileUpload(files);
                        }
                      };
                      input.click();
                    }}>
                      <Mail className="w-4 h-4 mr-2" />
                      Upload Media
                    </Button>
                  </div>
                </div>

                {/* Library Tabs */}
                <div className="border-b border-gray-300">
                  <div className="flex space-x-8">
                    <button className="py-2 px-1 border-b-2 border-purple-500 text-purple-600 font-medium">
                      Templates
                    </button>
                    <button className="py-2 px-1 text-gray-500 hover:text-gray-700">Saved Messages</button>
                    <button className="py-2 px-1 text-gray-500 hover:text-gray-700">Media Files</button>
                  </div>
                </div>

                {/* Templates Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Template List */}
                  <div className="border border-gray-300 rounded-lg bg-white">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">
                      Message Templates
                    </div>
                    <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                      {templates && templates.length > 0 ? (
                        templates.map((template) => (
                          <div key={template.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{template.name}</span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      template.category === "company"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {template.category === "company" ? "Company" : "Personal"}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 mb-2 line-clamp-2">{template.content}</div>
                                <div className="text-xs text-gray-500">{template.createdAt ? `Created: ${new Date(template.createdAt).toLocaleString()}` : ''}</div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Button variant="outline" size="sm" onClick={() => handleUseTemplate(template)}>
                                  Use
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  // Open the template editor and populate fields for editing
                                  try {
                                    const tpl: any = template as any
                                    setEditingTemplateId(String(tpl.id))
                                    setNewTemplateName(tpl.name || "")
                                    setNewTemplateContent(tpl.content || "")
                                    const cat = (tpl.category || "personal").toString().toLowerCase()
                                    setNewTemplateCategory(cat === "company" ? "company" : "personal")
                                    const el = document.getElementById('template-editor')
                                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                                  } catch (e) {
                                    console.warn('Failed to open template editor for edit', e)
                                  }
                                }}>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleDeleteTemplate(String(template.id))}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">No templates found</div>
                      )}
                    </div>
                  </div>

                  {/* Template Editor */}
                  <div id="template-editor" className="border border-gray-300 rounded-lg bg-white p-4">
                    <h4 className="font-medium mb-4">Create New Template</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Template Name</label>
                        <Input
                          placeholder="Enter template name"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Category</label>
                        <Select
                          value={newTemplateCategory}
                          onValueChange={(value: "personal" | "company") => setNewTemplateCategory(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Template Content</label>
                        <Textarea
                          placeholder="Enter your template content here... Use {name}, {date}, etc. for variables"
                          className="h-32 resize-none"
                          value={newTemplateContent}
                          onChange={(e) => setNewTemplateContent(e.target.value)}
                        />
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Available variables:</strong> {"{name}"}, {"{date}"}, {"{time}"}, {"{orderNumber}"}
                      </div>
                        <div className="flex items-center gap-2">
                        <Button onClick={handleAddTemplate} className="bg-blue-600 hover:bg-blue-700 text-white">
                          {editingTemplateId ? 'Update Template' : 'Save Template'}
                        </Button>
                        <Button variant="outline" onClick={() => {
                          if (newTemplateName && newTemplateContent) {
                            const previewText = newTemplateContent
                              .replace(/{name}/g, 'John Doe')
                              .replace(/{date}/g, new Date().toLocaleDateString())
                              .replace(/{time}/g, new Date().toLocaleTimeString())
                              .replace(/{orderNumber}/g, 'ORD-12345');
                            showAlert("success", `Preview: ${previewText}`);
                          } else {
                            showAlert("error", "Please enter template name and content first");
                          }
                        }}>Preview</Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setNewTemplateName("")
                            setNewTemplateContent("")
                            setNewTemplateCategory("personal")
                            setEditingTemplateId(null)
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media Files Section */}
                <div className="border border-gray-300 rounded-lg bg-white p-4">
                  <h4 className="font-medium mb-4">Media Files</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                      { name: "logo.png", size: "45KB", type: "image" },
                      { name: "promo.jpg", size: "128KB", type: "image" },
                      { name: "audio.mp3", size: "256KB", type: "audio" },
                      { name: "video.mp4", size: "1.2MB", type: "video" },
                    ].map((file, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 text-center hover:bg-gray-50">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                          {file.type === "image" && <BookOpen className="w-6 h-6 text-blue-600" />}
                          {file.type === "audio" && <Mail className="w-6 h-6 text-green-600" />}
                          {file.type === "video" && <Send className="w-6 h-6 text-purple-600" />}
                        </div>
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        <div className="text-xs text-gray-500">{file.size}</div>
                        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => {
                          // Copy media filename to clipboard for use in messages
                          navigator.clipboard.writeText(file.name).then(() => {
                            showAlert("success", `Media filename "${file.name}" copied to clipboard`);
                          }).catch(() => {
                            showAlert("error", "Failed to copy filename to clipboard");
                          });
                        }}>
                          Use
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sent Messages Content */}
            {activeMenuItem === 7 && (
              <div className="p-4 space-y-4">
                {/* Sent Messages Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Sent Messages</h3>
                  <div className="flex items-center gap-2">
                    <Select value={sentStatusFilter} onValueChange={setSentStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Messages</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={sentSearchQuery}
                      onChange={e => setSentSearchQuery(e.target.value)}
                      placeholder="Search sent messages..."
                    />
                    <Button onClick={() => {
                      // Trigger search for sent messages and refresh the list
                      fetchSentMessages(0);
                    }}>Search</Button>
                  </div>
                </div>

                {/* Message Status Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                        <div className="text-2xl font-bold">{totalSent}</div>
                        <div className="text-sm text-gray-600">Total Sent</div>
                        </div>
                      </div>
                    </div>
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <div className="text-2xl font-bold">{deliveredCount}</div>
                        <div className="text-sm text-gray-600">Delivered</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                        <div className="text-sm text-gray-600">Pending</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div>
                        <div className="text-2xl font-bold">{failedCount}</div>
                        <div className="text-sm text-gray-600">Failed</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sent Messages List */}
                <div className="border border-gray-300 rounded-lg bg-white">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">
                    Recent Sent Messages
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredSentMessages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">No sent messages found</div>
                    ) : (
                      filteredSentMessages.map((message) => (
                        <div key={message.messageId} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">To: {message.to}</span>
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">SMS</span>
                                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">{message.status}</span>
                            </div>
                              <div className="text-sm text-gray-800 mb-2">{message.messageContent}</div>
                            <div className="text-xs text-gray-500">
                                Sent: {message.sentTimestamp ? new Date(message.sentTimestamp).toLocaleString() : ""}
                            </div>
                          </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pagination and message count display */}
                {(() => {
                  const totalCount = sentPaging?.totalCount ?? sentApiMessages.length ?? 0
                  const totalPages = Math.max(1, Math.ceil((totalCount || sentApiMessages.length || 0) / sentPageSize))
                  const startIdx = sentOffset + 1
                  const endIdx = Math.min(sentOffset + sentApiMessages.length, totalCount)
                  return (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600">
                        Showing {startIdx}-{endIdx} of {totalCount} messages
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => fetchSentMessages(sentOffset - sentPageSize)} disabled={currentPage === 1}>
                          Previous
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <Button
                            key={i + 1}
                            variant={currentPage === i + 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => fetchSentMessages(i * sentPageSize)}
                          >
                            {i + 1}
                          </Button>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => fetchSentMessages(sentOffset + sentPageSize)} disabled={currentPage === totalPages}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )
                })()}
                
              </div>
            )}

            {/* Scheduled Messages Content */}
            {activeMenuItem === 8 && (
              <div className="p-4 space-y-4">
                {/* Scheduled Messages Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Scheduled Messages</h3>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Scheduled</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                      // Scroll to the Quick Schedule Form
                      const formElement = document.getElementById('quick-schedule-form');
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: 'smooth' });
                      }
                      showAlert("success", "Scroll down to schedule a new message");
                    }}>
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule New
                    </Button>
                  </div>
                </div>

                {/* Schedule Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div>
                        <div className="text-2xl font-bold">{scheduledMessages.filter(m => m.status === 'scheduled').length}</div>
                        <div className="text-sm text-gray-600">Pending</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <div className="text-2xl font-bold">{scheduledMessages.filter(m => m.status === 'sent').length}</div>
                        <div className="text-sm text-gray-600">Sent Today</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div>
                        <div className="text-2xl font-bold">{scheduledMessages.length}</div>
                        <div className="text-sm text-gray-600">This Week</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scheduled Messages List */}
                <div className="border border-gray-300 rounded-lg bg-white">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">
                    Scheduled Messages
                  </div>
                  <div className="divide-y divide-gray-200">
                    {scheduledMessages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">No scheduled messages found</div>
                    ) : (
                      scheduledMessages.map((message) => (
                        <div key={message.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">
                                  Scheduled for: {message.scheduledAt ? new Date(message.scheduledAt).toLocaleString() : ""}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    message.type === "sms" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {message.type}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    message.status === "scheduled"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : message.status === "sent"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {message.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-1">To: {message.to.join(", ")}</div>
                              <div className="text-sm text-gray-800 mb-2">{message.content}</div>
                              <div className="text-xs text-gray-500">Created: {message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}</div>
                            </div>
                            <div className="flex items-center gap-1 ml-4">
                              {message.status === "scheduled" && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    setShowScheduledMessages(true);
                                  }}>
                                    Edit
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                                    showAlert("success", `Cancel scheduled message "${message.content.substring(0, 30)}..." functionality would cancel the message`);
                                  }}>
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {message.status === "sent" && (
                                <Button variant="outline" size="sm" onClick={() => {
                                  setShowScheduledMessages(true);
                                }}>
                                  Details
                                </Button>
                              )}
                              {message.status === "cancelled" && (
                                <Button variant="outline" size="sm" onClick={() => {
                                  setShowScheduledMessages(true);
                                }}>
                                  Reschedule
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Schedule Form */}
                <div id="quick-schedule-form" className="border border-gray-300 rounded-lg bg-white p-4">
                  <h4 className="font-medium mb-4">Quick Schedule Message</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Recipients</label>
                      <Input
                        placeholder="Enter phone numbers..."
                        value={scheduleRecipients}
                        onChange={(e) => setScheduleRecipients(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Schedule Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Message</label>
                    <Textarea
                      placeholder="Enter your message..."
                      className="h-24 resize-none"
                      value={scheduleMessage}
                      onChange={(e) => setScheduleMessage(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button onClick={handleScheduleMessage} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Schedule Message
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScheduleRecipients("")
                        setScheduleMessage("")
                        setScheduleDateTime("")
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-background border-t border-border px-4 py-1 flex items-center justify-between text-sm text-foreground mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowStatus(true)}>
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-background rounded-full"></div>
                </div>
                <span>Status</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Status: The Status link lists responses related to the actions you perform each time you use 
                Desktop Messaging. For example: 'Message Successfully Scheduled' or 'Password Updated Successfully' etc.
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span>Credit remaining: {currentUser?.credits || 0}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Credit remaining: Displays the number of message credits you have left for the month</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* All Dialog Components */}
        <StatusDialog open={showStatus} onOpenChange={setShowStatus} />
        <SendLaterDialog open={showSendLater} onOpenChange={setShowSendLater} onSchedule={handleSendLater} />
        <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
        <SendMMSDialog open={showSendMMS} onOpenChange={setShowSendMMS} onSend={handleSendMMS} />
        <InboxDialog open={showInbox} onOpenChange={setShowInbox} />
        <ContactsDialog open={showContacts} onOpenChange={setShowContacts} />
        <LibraryDialog open={showLibrary} onOpenChange={setShowLibrary} onUseTemplate={handleUseTemplate} />
        <SentMessagesDialog open={showSentMessages} onOpenChange={setShowSentMessages} />
        <ScheduledMessagesDialog open={showScheduledMessages} onOpenChange={setShowScheduledMessages} />
        <RulesWizardDialog open={showRulesWizard} onOpenChange={(open) => {
          setShowRulesWizard(open);
          if (!open) {
            setEditingRuleId(undefined);
          }
        }} rules={rules} editingRuleId={editingRuleId} onRuleUpdate={loadData} />
        <UserSettingsDialog open={showUserSettings} onOpenChange={setShowUserSettings} onUserUpdate={setCurrentUser} />

        {/* Click outside to close search results */}
        {showSearchResults && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSearchResults(false)}
            onKeyDown={(e) => e.key === "Escape" && setShowSearchResults(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

export default DesktopMessaging;
