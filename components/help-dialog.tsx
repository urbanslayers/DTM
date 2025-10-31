"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Search,
  MessageSquare,
  Users,
  BookOpen,
  Settings,
  Send,
  Inbox,
  HelpCircle,
  Phone,
  Mail,
  Globe,
  Shield,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react"

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSection, setActiveSection] = useState("getting-started")

  const helpSections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: HelpCircle,
      content: [
        {
          title: "Welcome to Desktop Messaging",
          content: `Desktop Messaging is a powerful SMS and MMS messaging platform that allows you to send messages to multiple recipients, manage contacts, and track message delivery status.`,
        },
        {
          title: "First Time Setup",
          content: `1. Log in with your credentials (Demo: username: demo, password: password123)
2. Check your credit balance in the bottom status bar
3. Add contacts to your address book
4. Create message templates for frequently used messages
5. Start sending messages!`,
        },
        {
          title: "System Requirements",
          content: `• Modern web browser (Chrome, Firefox, Safari, Edge)
• Internet connection for API access
• Valid messaging account with credits`,
        },
      ],
    },
    {
      id: "sending-messages",
      title: "Sending Messages",
      icon: MessageSquare,
      content: [
        {
          title: "Send SMS Messages",
          content: `1. Select "Send SMS" from the menu (it's selected by default)
2. Choose your "From" address (PersonalMobile)
3. Add recipients in the "To" field or select from contacts
4. Type your message (160 characters per SMS)
5. Click "SEND NOW" or "SEND LATER" for scheduling`,
        },
        {
          title: "Send MMS Messages",
          content: `1. Click "Send MMS" from the menu
2. Add recipients and compose your message
3. Attach images or media files
4. MMS messages cost more credits than SMS
5. Maximum file size: 500KB total`,
        },
        {
          title: "Recipient Formats",
          content: `• Australian mobile numbers: 04xxxxxxxx or +614xxxxxxxx
• Separate multiple numbers with semicolons (;)
• Example: 0412345678; 0423456789; 0434567890`,
        },
        {
          title: "Message Scheduling",
          content: `1. Click "SEND LATER" button
2. Select date and time for delivery
3. Messages are queued and sent automatically
4. View scheduled messages in the "Scheduled Messages" section`,
        },
      ],
    },
    {
      id: "contacts",
      title: "Managing Contacts",
      icon: Users,
      content: [
        {
          title: "Contact Categories",
          content: `• Company Contacts: Shared business contacts
• Company Groups: Predefined business contact groups
• Personal Contacts: Your private contacts
• Personal Groups: Your custom contact groups`,
        },
        {
          title: "Adding Contacts",
          content: `1. Use the contact management interface
2. Enter name, phone number, and email (optional)
3. Choose category (Company or Personal)
4. Contacts appear in the Quick Contacts sidebar`,
        },
        {
          title: "Using Quick Contacts",
          content: `1. Check contact categories to display
2. Use the search box to find specific contacts
3. Click contacts to select them
4. Click "ADD TO RECIPIENTS" to add selected contacts to your message`,
        },
        {
          title: "Contact Groups",
          content: `• Create groups for frequently messaged contacts
• Send to entire groups with one click
• Manage group membership easily
• Separate personal and company groups`,
        },
      ],
    },
    {
      id: "templates",
      title: "Message Templates",
      icon: BookOpen,
      content: [
        {
          title: "Creating Templates",
          content: `1. Type your message in the compose area
2. Enter a title in the "Title" field
3. Select "Personal Message" or "Company Message"
4. Click "SAVE" to store the template`,
        },
        {
          title: "Using Templates",
          content: `1. Click the "Select Template" dropdown
2. Choose from your saved templates
3. The message content will populate automatically
4. Edit the message if needed before sending`,
        },
        {
          title: "Template Categories",
          content: `• Personal Messages: Your private templates
• Company Messages: Shared business templates
• Templates can include placeholders for personalization`,
        },
        {
          title: "Template Management",
          content: `• Access all templates in the "Library" section
• Edit, delete, or organize templates
• Share company templates with team members
• Import/export template collections`,
        },
      ],
    },
    {
      id: "inbox",
      title: "Inbox & Replies",
      icon: Inbox,
      content: [
        {
          title: "Viewing Messages",
          content: `1. Click "Inbox" from the main menu
2. View messages in Personal and Company inboxes
3. Filter by read/unread status
4. Search messages by sender or content`,
        },
        {
          title: "Message Types",
          content: `• SMS replies from recipients
• MMS messages with media attachments
• Delivery notifications
• System messages and alerts`,
        },
        {
          title: "Managing Inbox",
          content: `• Mark messages as read/unread
• Delete unwanted messages
• Forward messages to other users
• Export message history`,
        },
        {
          title: "Auto-Reply Rules",
          content: `• Set up automatic responses
• Create rules based on keywords
• Forward messages to email
• Configure business hours responses`,
        },
      ],
    },
    {
      id: "delivery-tracking",
      title: "Delivery Tracking",
      icon: Send,
      content: [
        {
          title: "Message Status",
          content: `• Sent: Message has been submitted
• Delivered: Message reached recipient's phone
• Failed: Message could not be delivered
• Scheduled: Message waiting to be sent`,
        },
        {
          title: "Viewing Sent Messages",
          content: `1. Click "Sent" from the main menu
2. View all sent messages with status
3. Filter by date range or status
4. Click message for detailed delivery report`,
        },
        {
          title: "Delivery Reports",
          content: `• Real-time delivery status updates
• Detailed error messages for failed deliveries
• Timestamp information for all status changes
• Export delivery reports for record keeping`,
        },
        {
          title: "Failed Message Handling",
          content: `• Review failed messages in the Sent section
• Check error codes and descriptions
• Retry failed messages if needed
• Update contact information for invalid numbers`,
        },
      ],
    },
    {
      id: "credits-billing",
      title: "Credits & Billing",
      icon: CreditCard,
      content: [
        {
          title: "Understanding Credits",
          content: `• SMS: 1 credit per 160 characters
• MMS: 3 credits per message
• Long SMS messages use multiple credits
• Credits are deducted when messages are sent`,
        },
        {
          title: "Checking Balance",
          content: `• View remaining credits in the bottom status bar
• Credits update in real-time after sending
• Low credit warnings appear automatically
• Purchase additional credits through your account`,
        },
        {
          title: "Usage Monitoring",
          content: `• Track daily, weekly, and monthly usage
• View credit consumption by message type
• Monitor usage trends and patterns
• Set up usage alerts and limits`,
        },
        {
          title: "Billing Information",
          content: `• Credits are pre-paid and deducted per message
• No monthly subscription fees
• Volume discounts available for high usage
• Detailed billing reports available`,
        },
      ],
    },
    {
      id: "advanced-features",
      title: "Advanced Features",
      icon: Settings,
      content: [
        {
          title: "Bulk Number Send",
          content: `• Send to large lists of phone numbers
• Import numbers from CSV files
• Validate numbers before sending
• Track delivery for each recipient`,
        },
        {
          title: "Mail Merge",
          content: `• Personalize messages with recipient data
• Use placeholders like {FirstName}, {Company}
• Import data from spreadsheets
• Preview personalized messages before sending`,
        },
        {
          title: "Rules Wizard",
          content: `• Create automated message handling rules
• Set up keyword-based responses
• Configure forwarding rules
• Manage business hour settings`,
        },
        {
          title: "API Integration",
          content: `• REST API for system integration
• Webhook support for real-time notifications
• Authentication via API keys
• Comprehensive API documentation available`,
        },
      ],
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: AlertTriangle,
      content: [
        {
          title: "Common Issues",
          content: `• Message not delivered: Check phone number format
• Insufficient credits: Purchase more credits
• Login problems: Verify username and password
• Slow performance: Check internet connection`,
        },
        {
          title: "Error Messages",
          content: `• "Invalid phone number": Use correct Australian format
• "Insufficient credits": Add credits to your account
• "Message too long": Split into multiple messages
• "Network error": Check internet connection`,
        },
        {
          title: "Performance Tips",
          content: `• Use templates for frequently sent messages
• Organize contacts into groups
• Schedule messages during off-peak hours
• Clear browser cache if experiencing issues`,
        },
        {
          title: "Getting Help",
          content: `• Check the Status section for system messages
• Contact support via the help menu
• Visit the online knowledge base
• Submit support tickets for technical issues`,
        },
      ],
    },
    {
      id: "keyboard-shortcuts",
      title: "Keyboard Shortcuts",
      icon: Settings,
      content: [
        {
          title: "Navigation Shortcuts",
          content: `• Ctrl/Cmd + 1: Send SMS
• Ctrl/Cmd + 2: Send MMS  
• Ctrl/Cmd + 3: Inbox
• Ctrl/Cmd + 4: Contacts
• Ctrl/Cmd + 5: Library`,
        },
        {
          title: "Message Shortcuts",
          content: `• Ctrl/Cmd + Enter: Send message now
• Ctrl/Cmd + Shift + Enter: Schedule message
• Ctrl/Cmd + R: Clear form
• Ctrl/Cmd + T: Select template`,
        },
        {
          title: "General Shortcuts",
          content: `• Ctrl/Cmd + F: Search contacts
• Ctrl/Cmd + H: Open help
• Ctrl/Cmd + S: Save template
• Esc: Close dialogs`,
        },
      ],
    },
    // Removed contact-support section
  ]

  const filteredSections = helpSections.filter(
    (section) =>
      searchQuery === "" ||
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.some(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  )

  const quickStartSteps = [
    {
      step: 1,
      title: "Login",
      description: "Use demo/password123 for the demo account",
      icon: Shield,
    },
    {
      step: 2,
      title: "Check Credits",
      description: "View your available credits in the status bar",
      icon: CreditCard,
    },
    {
      step: 3,
      title: "Add Contacts",
      description: "Add contacts to your address book for easy messaging",
      icon: Users,
    },
    {
      step: 4,
      title: "Send Message",
      description: "Compose and send your first SMS or MMS",
      icon: MessageSquare,
    },
  ]

  const tooltipGuide = [
    { description: "Menu Options: The main items are displayed at the top left hand side of the screen" },
    {
      description:
        "Quick contacts: Select from and manage Company Contacts, Company Groups, Personal Contacts and Personal Groups",
    },
    { description: "Add To Recipients Button: Adds selected contacts to the recipient list" },
    {
      description:
        "To: Display all recipients of the message. Also use this field to enter recipients (mobile phone numbers) not included in any of the address books",
    },
    { description: "Compose Message: The message text is entered here" },
    {
      description:
        "Message Template: Instead of composing a new message from scratch, you can select a predefined template from the list of options",
    },
    { description: "From: Specify where replies to your SMS are to be sent. For example, company Inbox" },
    { description: "Credit remaining: Displays the number of message credits you have left for the month" },
    {
      description:
        "Status: The Status link lists responses related to the actions you perform each time you use Desktop Messaging",
    },
    { description: "Characters Remaining: Displays number of characters remaining as you type" },
    { description: "Clear Button: Clear all message and recipient details and start again" },
    {
      description:
        "Send Later Button: Define the send schedule for the message (Note: the user account needs adequate permissions to use this feature)",
    },
    { description: "Send Now Button: Send the SMS message immediately" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Desktop Messaging - Help Guide
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-[70vh] min-h-[400px]">
          {/* Sidebar */}
          <div className="w-1/4 pr-4 border-r border-border flex flex-col min-w-[200px] max-w-xs">
            <Input
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2">
                {filteredSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? "default" : "ghost"}
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => setActiveSection(section.id)}
                  >
                    <section.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{section.title}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
                {activeSection === "getting-started" && (
                  <div className="space-y-6">
                    {/* Quick Start Guide */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          Quick Start Guide
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {quickStartSteps.map((step) => (
                            <div key={step.step} className="flex items-start gap-3 p-3 border rounded-lg">
                              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">
                                {step.step}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <step.icon className="w-4 h-4 text-gray-600" />
                                  <h4 className="font-medium">{step.title}</h4>
                                </div>
                                <p className="text-sm text-gray-600">{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Interface Guide */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Info className="w-5 h-5 text-blue-600" />
                          Interface Guide - Numbered Tooltips
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                          The interface includes numbered red circles that provide helpful tooltips. Here's what each
                          number means:
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {tooltipGuide.map((tooltip, index) => (
                            <div key={index} className="flex items-start gap-3 p-2 border rounded">
                              <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {index + 1}
                              </div>
                              <p className="text-sm">{tooltip.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Dynamic Content for Other Sections */}
                {activeSection !== "getting-started" && (
                  <div className="space-y-6">
                    {filteredSections
                      .find((section) => section.id === activeSection)
                      ?.content.map((item, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm max-w-none">
                              {item.content.split("\n").map((paragraph, pIndex) => (
                                <p key={pIndex} className="mb-2 last:mb-0 whitespace-pre-line">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}

                {/* Contact Support Card - Always at bottom */}
                {activeSection === "contact-support" && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Phone className="w-5 h-5" />
                        Need More Help?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg">
                          <Phone className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <h4 className="font-medium mb-1">Call Support</h4>
                          <p className="text-sm text-gray-600">1800 XXX XXX</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg">
                          <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <h4 className="font-medium mb-1">Email Support</h4>
                          <p className="text-sm text-gray-600">support@example.com.au</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg">
                          <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <h4 className="font-medium mb-1">Online Portal</h4>
                          <p className="text-sm text-gray-600">my.example.com.au</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close Help</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
