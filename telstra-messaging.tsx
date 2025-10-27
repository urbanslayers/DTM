"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { LoginDialog } from "@/components/login-dialog"
import { StatusDialog } from "@/components/status-dialog"
import { SendLaterDialog } from "@/components/send-later-dialog"
import { HelpDialog } from "@/components/help-dialog"
import { authService } from "@/lib/auth"
import { messagingService } from "@/lib/messaging-service"
import { contactService } from "@/lib/contact-service"
import { templateService } from "@/lib/template-service"
import type { Contact, MessageTemplate, Message } from "@/lib/types"
import { SendMMSDialog } from "@/components/send-mms-dialog"
import { InboxDialog } from "@/components/inbox-dialog"
import { ContactsDialog } from "@/components/contacts-dialog"
import { LibraryDialog } from "@/components/library-dialog"
import { SentMessagesDialog } from "@/components/sent-messages-dialog"
import { ScheduledMessagesDialog } from "@/components/scheduled-messages-dialog"
import { RulesWizardDialog } from "@/components/rules-wizard-dialog"
import { UserSettingsDialog } from "@/components/user-settings-dialog"

// Add new imports at the top
import { rulesService } from "@/lib/rules-service"
import { inboxService } from "@/lib/inbox-service"
import { mediaService } from "@/lib/media-service"
import type { Rule, InboxMessage, MediaFile } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

function DesktopMessaging() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(true)
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser())

  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { token } = useAuth();

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
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [bulkNumberSend, setBulkNumberSend] = useState(false)
  const [mailMerge, setMailMerge] = useState(false)

  // Search state
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    contacts: Contact[]
    templates: MessageTemplate[]
    messages: Message[]
  }>({
    contacts: [],
    templates: [],
    messages: [],
  })

  // Data state
  const [contacts, setContacts] = useState<Contact[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])

  // Dialog state
  const [showStatus, setShowStatus] = useState(false)
  const [showSendLater, setShowSendLater] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [showSendMMS, setShowSendMMS] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [showSentMessages, setShowSentMessages] = useState(false)
  const [showScheduledMessages, setShowScheduledMessages] = useState(false)
  const [showRulesWizard, setShowRulesWizard] = useState(false)
  const [showUserSettings, setShowUserSettings] = useState(false)
  const [activeMenuItem, setActiveMenuItem] = useState(1)
  const [editingRuleId, setEditingRuleId] = useState<string | undefined>(undefined)

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
  const [scheduledMessages, setScheduledMessages] = useState<Message[]>([])
  const [paging, setPaging] = useState<any>({})
  const pageSize = 50;
  const [offset, setOffset] = useState(0)

  // Form state for new forms
  const [newContactName, setNewContactName] = useState("")
  const [newContactPhone, setNewContactPhone] = useState("")
  const [newContactEmail, setNewContactEmail] = useState("")
  const [newContactType, setNewContactType] = useState<"personal" | "company">("personal")

  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateContent, setNewTemplateContent] = useState("")
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
  const totalSent = sentApiMessages?.length || 0;
  const deliveredCount = sentApiMessages?.filter(m => m.status === "delivered").length || 0;
  const pendingCount = sentApiMessages?.filter(m => ["queued", "pending", "scheduled"].includes(m.status)).length || 0;
  const failedCount = sentApiMessages?.filter(m => ["failed", "cancelled", "expired"].includes(m.status)).length || 0;

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Replace the existing search useEffect with this improved version
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery)
      setShowSearchResults(true)
    } else {
      setShowSearchResults(false)
      setSearchResults({ contacts: [], templates: [], messages: [] })
    }
  }, [searchQuery]) // Remove other dependencies since performSearch now fetches fresh data

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

  // Add cleanup effect for search timeout
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  // Update search query with debouncing
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
        setSearchResults({ contacts: [], templates: [], messages: [] })
      }
    }, 300) // 300ms delay

    setSearchTimeout(timeout)
  }

  // Replace the existing performSearch function
  const performSearch = async (query: string) => {
    try {
      const [contactsData, templatesData, sentData] = await Promise.all([
        contactService.getContacts(),
        templateService.getTemplates(),
        messagingService.getSentMessages()
      ])

      const lowercaseQuery = query.toLowerCase()

      // Search contacts
      const contactResults = contactsData.filter(
        (contact) =>
          contact.name.toLowerCase().includes(lowercaseQuery) ||
          contact.phoneNumber.includes(query) ||
          (contact.email && contact.email.toLowerCase().includes(lowercaseQuery)),
      )

      // Search templates
      const templateResults = templatesData.filter(
        (template) =>
          template.name.toLowerCase().includes(lowercaseQuery) || template.content.toLowerCase().includes(lowercaseQuery),
      )

      // Search sent messages
      const messageResults = sentData.filter(
        (message) =>
          message.to.some((recipient) => recipient.includes(query)) ||
          message.content.toLowerCase().includes(lowercaseQuery),
      )

      setSearchResults({
        contacts: contactResults.slice(0, 5), // Limit results
        templates: templateResults.slice(0, 5),
        messages: messageResults.slice(0, 5),
      })
    } catch (error) {
      console.error("[Search] Error performing search:", error)
      setSearchResults({ contacts: [], templates: [], messages: [] })
    }
  }

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "h":
            event.preventDefault()
            setShowHelp(true)
            break
          case "Enter":
            if (event.shiftKey) {
              event.preventDefault()
              setShowSendLater(true)
            } else {
              event.preventDefault()
              handleSendNow()
            }
            break
          case "r":
            event.preventDefault()
            clearForm()
            break
          case "t":
            event.preventDefault()
            // Focus template selector
            break
          case "f":
            event.preventDefault()
            // Focus search
            break
          case "s":
            event.preventDefault()
            handleSaveTemplate()
            break
        }
      } else if (event.key === "Escape") {
        setShowHelp(false)
        setShowStatus(false)
        setShowSendLater(false)
        setShowSearchResults(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [messageText, saveTitle])

  // Update the loadData function
  const loadData = async () => {
    try {
      const [contactsData, templatesData, rulesData, inboxData, mediaData, sentData, scheduledData] = await Promise.all([
        contactService.getContacts(),
        templateService.getTemplates(),
        rulesService.getRules(),
        inboxService.getMessages(),
        mediaService.getMediaFiles(),
        messagingService.getSentMessages(),
        messagingService.getScheduledMessages()
      ])

      setContacts(contactsData)
      setTemplates(templatesData)
      setRules(rulesData)
      setInboxMessages(inboxData)
      setMediaFiles(mediaData)
      setSentMessages(sentData)
      setScheduledMessages(scheduledData)

      setCurrentUser(authService.getCurrentUser())
    } catch (error) {
      console.error("[loadData] Error loading data:", error)
    }
  }

  const handleLogin = async () => {
    setIsAuthenticated(true)
    setShowLogin(false)
    const user = authService.getCurrentUser();
    setCurrentUser(user)
    await loadData()
    // No redirect; admin button will be visible if user is admin
  }

  const handleLogout = async () => {
    await authService.logout()
    setIsAuthenticated(false)
    setShowLogin(true)
    setCurrentUser(null)
  }

  const clearForm = () => {
    setToRecipients("")
    setMessageText("")
    setSaveTitle("")
    setSelectedTemplate("")
    setSelectedContacts([])
    showAlert("success", "Form cleared successfully")
  }

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 5000)
  }

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
      loadData() // Refresh user credits
    } else {
      showAlert("error", result.error || "Failed to send message")
    }
  }

  const handleSendLater = async (scheduledAt: Date) => {
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

    // Save message as scheduled in database first
    messagingService
      .sendMessage(
        recipients,
        messageText,
        messageType,
        scheduledAt, // This will be handled by Telstra API scheduleSend parameter
        selectedTemplate ? templates.find((t) => t.id === selectedTemplate)?.name : undefined,
      )
      .then((result) => {
        if (result.success) {
          const messageLabel = messageType === "mms" ? "MMS" : "SMS"
          showAlert("success", `${messageLabel} scheduled successfully for ${scheduledAt.toLocaleString()} (local time)`)
          clearForm()
          loadData()
        } else {
          showAlert("error", result.error || "Failed to schedule message")
        }
      })
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setMessageText(template.content)
    }
  }

  const handleSaveTemplate = async () => {
    if (!saveTitle.trim() || !messageText.trim()) {
      showAlert("error", "Please enter both title and message content")
      return
    }

    const result = await templateService.addTemplate(saveTitle, messageText, "personal")
    if (result) {
      showAlert("success", `Template "${saveTitle}" saved successfully`)
      setSaveTitle("")
      loadData()
    } else {
      showAlert("error", "Failed to save template")
    }
  }

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

  const menuItems = [
    {
      id: 1,
      label: "Send SMS",
      icon: MessageSquare,
      active: true,
      description: "Address Book Send, Mail Merge Send, or Bulk Number Send for SMS messages",
    },
    {
      id: 2,
      label: "Send MMS",
      icon: Mail,
      description: "Address Book Send, Mail Merge Send, or Bulk Number Send for MMS messages",
    },
    {
      id: 3,
      label: "Inbox",
      icon: Inbox,
      description: "Preview all messages received in your Personal and Company Inboxes",
    },
    {
      id: 4,
      label: "Rules Wizard",
      icon: Settings,
      description: "Create and manage Company Inbox message rules",
    },
    {
      id: 5,
      label: "Contacts",
      icon: Users,
      description: "Select from and manage Company Contacts, Company Groups, Personal Contacts and Personal Groups",
    },
    {
      id: 6,
      label: "Library",
      icon: BookOpen,
      description: "Manage message templates, saved messages and multimedia content",
    },
    {
      id: 7,
      label: "Sent",
      icon: Send,
      description: "View all messages sent and review their message status",
    },
    {
      id: 8,
      label: "Scheduled Messages",
      icon: Clock,
      description: "View and manage all scheduled messages",
    },
  ]

  const contactCategories = [
    {
      key: "companyContacts" as const,
      icon: Users,
      label: "Company Contacts",
      checked: contactFilters.companyContacts,
    },
    {
      key: "companyGroups" as const,
      icon: Users,
      label: "Company Groups",
      checked: contactFilters.companyGroups,
    },
    {
      key: "personalContacts" as const,
      icon: User,
      label: "Personal Contacts",
      checked: contactFilters.personalContacts,
    },
    {
      key: "personalGroups" as const,
      icon: Users,
      label: "Personal Groups",
      checked: contactFilters.personalGroups,
    },
  ]

  const handleSendMMS = async (data: {
    to: string[]
    subject: string
    body: string
    media: Array<{ type: string; filename: string; data: string }>
  }) => {
    const result = await messagingService.sendMessage(data.to, data.body, "mms")

    if (result.success) {
      showAlert("success", `MMS sent successfully to ${data.to.length} recipient(s)`)
      loadData()
    } else {
      showAlert("error", result.error || "Failed to send MMS")
    }
  }

  const handleUseTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template.id)
    setMessageText(template.content)
    showAlert("success", `Template "${template.name}" loaded`)
  }

  // Add new form handlers

  // Contact management handlers
  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      showAlert("error", "Please enter contact name and phone number")
      return
    }

    const result = await contactService.addContact(newContactName, newContactPhone, newContactType, newContactEmail)
    if (result) {
      showAlert("success", `Contact "${newContactName}" added successfully`)
      setNewContactName("")
      setNewContactPhone("")
      setNewContactEmail("")
      setNewContactType("personal")
      loadData()
    } else {
      showAlert("error", "Failed to add contact")
    }
  }

  const handleEditContact = (contactId: string, updates: Partial<Contact>) => {
    // Open the ContactsDialog for editing
    setShowContacts(true)
  }

  const handleDeleteContact = async (contactId: string) => {
    const contacts = await contactService.getContacts()
    const contact = contacts.find((c) => c.id === contactId)

    if (contact && await contactService.deleteContact(contactId)) {
      showAlert("success", `Contact "${contact.name}" deleted successfully`)
      loadData()
    } else {
      showAlert("error", "Failed to delete contact")
    }
  }

  // Template management handlers
  const handleAddTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      showAlert("error", "Please enter template name and content")
      return
    }

    const result = await templateService.addTemplate(newTemplateName, newTemplateContent, newTemplateCategory)
    if (result) {
      showAlert("success", `Template "${newTemplateName}" created successfully`)
      setNewTemplateName("")
      setNewTemplateContent("")
      setNewTemplateCategory("personal")
      loadData()
    } else {
      showAlert("error", "Failed to create template")
    }
  }

  const handleEditTemplate = (templateId: string, updates: Partial<MessageTemplate>) => {
    // Open the LibraryDialog for editing templates
    setShowLibrary(true)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    const templates = await templateService.getTemplates()
    const template = templates.find((t) => t.id === templateId)

    if (template && await templateService.deleteTemplate(templateId)) {
      showAlert("success", `Template "${template.name}" deleted successfully`)
      loadData()
    } else {
      showAlert("error", "Failed to delete template")
    }
  }

  // Rules management handlers
  const handleAddRule = async () => {
    if (!newRuleName.trim() || !newRuleConditionValue.trim() || !newRuleActionValue.trim()) {
      showAlert("error", "Please fill in all rule fields")
      return
    }

    const result = await rulesService.addRule(
      newRuleName,
      { type: newRuleConditionType, value: newRuleConditionValue },
      { type: newRuleActionType, value: newRuleActionValue },
    )

    if (result) {
      showAlert("success", `Rule "${newRuleName}" created successfully`)
      setNewRuleName("")
      setNewRuleConditionValue("")
      setNewRuleActionValue("")
      loadData()
    } else {
      showAlert("error", "Failed to create rule")
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (await rulesService.deleteRule(ruleId)) {
      loadData()
    } else {
      showAlert("error", "Failed to delete rule")
    }
  }

  const handleToggleRule = async (ruleId: string) => {
    if (await rulesService.toggleRule(ruleId)) {
      loadData()
    } else {
      showAlert("error", "Failed to toggle rule")
    }
  }

  // Inbox management handlers
  const handleMarkAsRead = async (messageId: string) => {
    if (await inboxService.markAsRead(messageId)) {
      loadData()
    }
  }

  const handleDeleteInboxMessage = async (messageId: string) => {
    if (await inboxService.deleteMessage(messageId)) {
      loadData()
    }
  }

  // Media management handlers
  const handleFileUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 500000) {
        // 500KB limit
        showAlert("error", `File "${file.name}" exceeds 500KB limit`)
        continue
      }

      const result = await mediaService.uploadFile(file)
      if (result) {
        showAlert("success", `File "${file.name}" uploaded successfully`)
      } else {
        showAlert("error", `Failed to upload "${file.name}"`)
      }
    }
    loadData()
  }

  const handleDeleteMediaFile = async (fileId: string) => {
    if (await mediaService.deleteFile(fileId)) {
      loadData()
    }
  }

  // Schedule message handler
  const handleScheduleMessage = () => {
    if (!scheduleRecipients.trim() || !scheduleMessage.trim() || !scheduleDateTime) {
      showAlert("error", "Please fill in all schedule fields")
      return
    }

    const recipients = messagingService.parseRecipients(scheduleRecipients)
    const scheduledAt = new Date(scheduleDateTime)

    messagingService.sendMessage(recipients, scheduleMessage, "sms", scheduledAt).then((result) => {
      if (result.success) {
        showAlert("success", `Message scheduled for ${scheduledAt.toLocaleString()} (local time)`)
        setScheduleRecipients("")
        setScheduleMessage("")
        setScheduleDateTime("")
        loadData()
      } else {
        showAlert("error", result.error || "Failed to schedule message")
      }
    })
  }

  const handleCancelScheduledMessage = (messageId: string) => {
    // This would call a service method to cancel the scheduled message
    showAlert("success", "Cancel scheduled message functionality would be implemented")
    loadData()
  }

  useEffect(() => {
    if (activeMenuItem === 3 && token) {
      fetchInboxMessages(offset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenuItem, token, offset]);

  const fetchInboxMessages = async (newOffset = 0) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const params = new URLSearchParams({
        userId: user.id,
        limit: String(pageSize),
        offset: String(newOffset),
        direction: 'incoming',
        reverse: 'true',
      });
      const res = await fetch(`/api/messaging/inbox?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setInboxMessages(data.messages || []);
      setPaging(data.paging || {});
      setOffset(newOffset);
    } catch (err) {
      setInboxMessages([]);
      setPaging({});
    }
  };

  // Fetch real sent messages from Telstra API with user filtering
  const fetchSentMessages = async (newOffset = 0) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      // Get user's allocated phone numbers (personal mobile + company contacts)
      const allocatedNumbers = await getAllocatedPhoneNumbers(user.id);

      const params = new URLSearchParams({
        userId: user.id,
        status: 'sent,delivered,failed,queued,pending,scheduled',
        phoneNumbers: allocatedNumbers.join(','),
        limit: String(sentPageSize),
        offset: String(newOffset),
      });

      const res = await fetch(`/api/messaging/messages?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setSentApiMessages(data.messages || []);
      setSentPaging(data.paging || {});
      setSentOffset(newOffset);
    } catch (err) {
      setSentApiMessages([]);
      setSentPaging({});
    }
  };

  const getAllocatedPhoneNumbers = async (userId: string): Promise<string[]> => {
    try {
      // Get user details to get personal mobile
      const userResponse = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer user_${userId}`,
        },
      });

      if (!userResponse.ok) return [];

      const userData = await userResponse.json();
      const allocatedNumbers: string[] = [];

      // Add user's personal mobile if available
      if (userData.personalMobile) {
        allocatedNumbers.push(userData.personalMobile);
      }

      // Get company contacts' phone numbers (treating company contacts as group members)
      const contactsResponse = await fetch(`/api/contacts?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer user_${userId}`,
        },
      });

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        const companyContacts = contactsData.contacts.filter((contact: any) => contact.category === 'company');
        companyContacts.forEach((contact: any) => {
          allocatedNumbers.push(contact.phoneNumber);
        });
      }

      return allocatedNumbers;
    } catch (error) {
      console.error("Error getting allocated phone numbers:", error);
      return [];
    }
  };

  useEffect(() => {
    if (activeMenuItem === 7 && token) {
      fetchSentMessages(sentOffset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenuItem, token, sentOffset]);

  // Pagination calculations
  const totalCount = sentPaging?.totalCount || 0;
  const currentPage = Math.floor(sentOffset / sentPageSize) + 1;
  const totalPages = Math.ceil(totalCount / sentPageSize) || 1;
  const startIdx = sentOffset + 1;
  const endIdx = Math.min(sentOffset + sentApiMessages.length, totalCount);

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
              {alert.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertDescription>{alert.message}</AlertDescription>
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
                      checked={category.checked}
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
                  <Input placeholder="Search messages..." className="flex-1 max-w-md" />
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                    // Trigger search for inbox messages
                    // This would implement filtering of inboxMessages based on search input
                    console.log('Inbox search triggered');
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
                        // Filter for incoming messages only
                        inboxMessages.filter((msg: any) => msg.direction === 'incoming').map((message: any) => (
                          <div
                            key={message.messageId}
                            className={`p-4 cursor-pointer
                              ${selectedMessage && selectedMessage.messageId === message.messageId
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
                                  <span className={`font-medium ${message.status !== "delivered" ? "font-bold" : ""}`}>{message.from}</span>
                                  {message.status !== "delivered" && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">NEW</span>
                              )}
                            </div>
                                {/* Remove subject if not present in Telstra API */}
                                {/* {message.subject && (
                              <div className="text-sm font-medium text-gray-800 mb-1">{message.subject}</div>
                                )} */}
                                <div className="text-sm text-gray-600">{message.messageContent}</div>
                          </div>
                              <div className="text-xs text-gray-500 ml-4">
                                {message.receivedTimestamp
                                  ? new Date(message.receivedTimestamp).toLocaleString()
                                  : message.sentTimestamp
                                  ? new Date(message.sentTimestamp).toLocaleString()
                                  : ""}
                        </div>
                      </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  {/* Pagination Controls */}
                  <div className="flex justify-between items-center mt-2 px-4 pb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!paging.previousPage || offset === 0}
                      onClick={() => {
                        const prevOffset = Math.max(0, offset - pageSize);
                        fetchInboxMessages(prevOffset);
                      }}
                    >
                      Previous
                    </Button>
                    <span>
                      Showing {offset + 1} - {offset + inboxMessages.length} of {paging.totalCount || inboxMessages.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!paging.nextPage || inboxMessages.length < pageSize}
                      onClick={() => {
                        const nextOffset = offset + pageSize;
                        fetchInboxMessages(nextOffset);
                      }}
                    >
                      Next
                    </Button>
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
                      if (selectedMessage) {
                        setInboxMessages((msgs) => msgs.filter((msg) => msg.messageId !== selectedMessage.messageId));
                        setSelectedMessage(null);
                      }
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
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">Active Rules</div>
                  <div className="divide-y divide-gray-200">
                    {[
                      {
                        id: 1,
                        name: "Forward Support Messages",
                        condition: "Contains 'support' or 'help'",
                        action: "Forward to support@company.com",
                        enabled: true,
                      },
                      {
                        id: 2,
                        name: "Auto-Reply After Hours",
                        condition: "Received between 6 PM - 8 AM",
                        action: "Send auto-reply message",
                        enabled: true,
                      },
                      {
                        id: 3,
                        name: "Spam Filter",
                        condition: "Contains promotional keywords",
                        action: "Move to spam folder",
                        enabled: false,
                      },
                    ].map((rule) => (
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
                              <strong>When:</strong> {rule.condition}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>Then:</strong> {rule.action}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingRuleId(String(rule.id));
                              setShowRulesWizard(true);
                            }}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                              handleDeleteRule(String(rule.id));
                            }}>
                              Delete
                            </Button>
                            <Checkbox checked={rule.enabled} className="ml-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rule Creation Form */}
                <div className="border border-gray-300 rounded-lg bg-white p-4">
                  <h4 className="font-medium mb-4">Create New Rule</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Rule Name</label>
                      <Input
                        placeholder="Enter rule name"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Condition Type</label>
                      <Select
                        value={newRuleConditionType}
                        onValueChange={(value: any) => setNewRuleConditionType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Message contains</SelectItem>
                          <SelectItem value="from">From specific number</SelectItem>
                          <SelectItem value="time">Received at specific time</SelectItem>
                          <SelectItem value="keyword">Contains keyword</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Condition Value</label>
                      <Input
                        placeholder="Enter condition value"
                        value={newRuleConditionValue}
                        onChange={(e) => setNewRuleConditionValue(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Action Type</label>
                      <Select value={newRuleActionType} onValueChange={(value: any) => setNewRuleActionType(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="forward">Forward message</SelectItem>
                          <SelectItem value="reply">Send auto-reply</SelectItem>
                          <SelectItem value="delete">Delete message</SelectItem>
                          <SelectItem value="folder">Move to folder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Action Value</label>
                      <Input
                        placeholder="Enter action value"
                        value={newRuleActionValue}
                        onChange={(e) => setNewRuleActionValue(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={handleAddRule} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Save Rule
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNewRuleName("")
                          setNewRuleConditionValue("")
                          setNewRuleActionValue("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
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
                      // Scroll to the Add Contact form
                      const formElement = document.getElementById('add-contact-form');
                      if (formElement) {
                        formElement.scrollIntoView({ behavior: 'smooth' });
                      }
                      showAlert("success", "Scroll down to add a new contact");
                    }}>
                      <User className="w-4 h-4 mr-2" />
                      Add Contact
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                      showAlert("success", "Create Group functionality would open a group creation dialog");
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
                  <Input placeholder="Search contacts..." className="flex-1 max-w-md" />
                  <Button variant="outline" onClick={() => {
                    // Trigger search for contacts
                    // This would implement filtering of contacts based on search input
                    console.log('Contacts search triggered');
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
                      {[
                        {
                          id: 1,
                          name: "John Smith",
                          phone: "+61412345678",
                          email: "john@company.com",
                          type: "Company",
                        },
                        {
                          id: 2,
                          name: "Sarah Johnson",
                          phone: "+61498765432",
                          email: "sarah@email.com",
                          type: "Personal",
                        },
                        {
                          id: 3,
                          name: "Mike Wilson",
                          phone: "+61456789123",
                          email: "mike@company.com",
                          type: "Company",
                        },
                        { id: 4, name: "Emma Davis", phone: "+61423456789", email: "emma@email.com", type: "Personal" },
                      ].map((contact) => (
                        <div key={contact.id} className="p-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{contact.name}</span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    contact.type === "Company"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {contact.type}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">{contact.phone}</div>
                              <div className="text-sm text-gray-600">{contact.email}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => {
                                handleEditContact(String(contact.id), {});
                              }}>
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                                handleDeleteContact(String(contact.id));
                              }}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Groups */}
                  <div className="border border-gray-300 rounded-lg bg-white">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 font-medium text-sm">
                      Contact Groups
                    </div>
                    <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                      {[
                        { id: 1, name: "Sales Team", members: 12, type: "Company" },
                        { id: 2, name: "Support Staff", members: 8, type: "Company" },
                        { id: 3, name: "Family", members: 5, type: "Personal" },
                        { id: 4, name: "Friends", members: 15, type: "Personal" },
                      ].map((group) => (
                        <div key={group.id} className="p-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{group.name}</span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    group.type === "Company"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {group.type}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">{group.members} members</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => {
                                setShowContacts(true);
                              }}>
                                Manage
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600" onClick={() => {
                                showAlert("success", `Delete group "${group.name}" functionality would be implemented`);
                              }}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                      // Scroll to the template editor form
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
                      {[
                        {
                          id: 1,
                          name: "Meeting Reminder",
                          content: "Hi {name}, don't forget about our meeting tomorrow at {time}. See you there!",
                          type: "Company",
                          lastUsed: "2 days ago",
                        },
                        {
                          id: 2,
                          name: "Order Confirmation",
                          content: "Thank you for your order #{orderNumber}. We'll send you tracking details soon.",
                          type: "Company",
                          lastUsed: "1 week ago",
                        },
                        {
                          id: 3,
                          name: "Birthday Wishes",
                          content: "Happy Birthday {name}! Hope you have a wonderful day filled with joy!",
                          type: "Personal",
                          lastUsed: "3 days ago",
                        },
                      ].map((template) => (
                        <div key={template.id} className="p-3 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{template.name}</span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    template.type === "Company"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {template.type}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-2 line-clamp-2">{template.content}</div>
                              <div className="text-xs text-gray-500">Last used: {template.lastUsed}</div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button variant="outline" size="sm" onClick={() => handleUseTemplate(template as unknown as MessageTemplate)}>
                                Use
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => {
                                handleEditTemplate(String(template.id), {});
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
                      ))}
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
                          Save Template
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
  )
}

export default DesktopMessaging
