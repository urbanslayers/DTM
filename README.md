# DTM Messaging Application

A comprehensive messaging platform built with Next.js and TypeScript that integrates with the Telstra API for SMS and MMS messaging. This application provides a desktop-like interface for managing contacts, templates, messages, and includes advanced features like message scheduling, rules, and real-time notifications.

## 🚀 Features

### Core Messaging Features
- **SMS & MMS Support**: Send text messages and multimedia messages
- **Bulk Messaging**: Send messages to multiple recipients simultaneously
- **Message Scheduling**: Schedule messages for future delivery
- **Message Templates**: Create and manage reusable message templates. Instantly load a template and auto-navigate to the Send SMS page for quick sending.
- **Contact Management**: Organize contacts into personal and company categories
- **Inbox Management**: View and manage incoming messages with read/unread status

### Advanced Features
- **Rules Wizard**: Create automated rules for message handling (forward, reply, delete, folder). Messages sent by rules are now saved and visible in Sent Messages.
- **Real-time Notifications**: WebSocket-based real-time message status updates. Sent and Inbox messages update instantly across all clients—no manual refresh required.
- **Media Library**: Upload and manage media files for MMS messages
- **Search Functionality**: Global search across contacts, templates, and messages
- **Message History**: Track sent messages with delivery status. Sent Messages view updates in real time, including messages sent by automation rules.
- **Admin Panel**: Administrative interface for user management

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Theme switching capability
- **Keyboard Shortcuts**: Quick actions with keyboard combinations
- **Intuitive Navigation**: Easy-to-use interface with clear sections

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives
- **Database**: SQLite with custom ORM
- **Authentication**: Custom JWT-based authentication
- **Real-time**: Socket.io for WebSocket connections
- **API Integration**: Telstra Messaging API v3
- **Icons**: Lucide React

## 📋 Prerequisites

## 👤 Creating the Initial Admin User

Before you can log in and use the application, you must create the first admin user. Use the provided script to do this:

1. Open a terminal and navigate to the `scripts` directory:
   ```bash
   cd scripts
   ```
2. Run the admin user creation script:
   ```bash
   node create-admin-user.js
   ```
3. The admin username and password are configured directly in the `create-admin-user.js` file. Edit this file to set your desired admin email and password before running the script. **Important:** Change the default credentials before deploying to production for security.

Once the initial admin user is created, you can log in to the application as that user. Additional admins and regular users can then be added through the Admin Panel in the web UI.

Before running this application, ensure you have:

- Node.js 18.x or higher
- npm or yarn package manager
- Telstra API credentials (Client ID and Client Secret)
- A running SQLite database (handled automatically)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd messaging-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**

   Create a `.env.local` file in the root directory with the following variables:

   ```env
   # Telstra API Credentials
   TELSTRA_CLIENT_ID=your_telstra_client_id
   TELSTRA_CLIENT_SECRET=your_telstra_client_secret

   # Database Configuration
   DATABASE_URL=your_database_url
   ```

4. **Database Initialization**

   The application will automatically initialize the SQLite database on first run. The database schema includes tables for:
   - Users and authentication
   - Contacts and contact groups
   - Message templates
   - Messages (sent, scheduled, inbox)
   - Rules and automation
   - Media files
   - User settings

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Usage Guide

### Authentication

1. **First Time Setup**: On first launch, you'll be prompted to create an admin account
2. **Login**: Use your credentials to access the application
3. **User Management**: Admins can manage user accounts through the admin panel

### Main Interface

The application features a tabbed interface with the following sections:

#### 1. Send SMS
- Compose and send SMS messages
- Instantly load a message template and auto-navigate here when using a template
- Bulk send to multiple recipients
- Schedule messages for later delivery

#### 2. Send MMS
- Send multimedia messages with images and attachments
- Upload and manage media files
- Use the media library for attachments

#### 3. Inbox
- View incoming messages
- Mark messages as read/unread
- Organize messages by folders (personal/company)
- Search through message history

#### 4. Rules Wizard
- Create automated message handling rules
- Set conditions (contains, from, time, keyword)
- Define actions (forward, reply, delete, folder)
- Messages sent by rules are now saved and appear in Sent Messages

#### 5. Contacts
- Manage personal and company contacts
- Create contact groups
- Import/export contact lists
- Search and filter contacts

#### 6. Library
- Create and manage message templates
- Store frequently used messages
- Organize templates by category
- Using a template will switch you to the Send SMS tab automatically

#### 7. Sent Messages
- View message history
- Track delivery status
- Sent Messages update in real time (no manual refresh needed)
- Messages sent by rules appear here automatically
- Filter by status (sent, delivered, failed)
- Pagination for large message lists

#### 8. Scheduled Messages
- View and manage scheduled messages
- Cancel scheduled messages
- Edit scheduled message details

### Keyboard Shortcuts

- **Ctrl+H**: Show help dialog
- **Ctrl+Enter**: Send message immediately
- **Shift+Ctrl+Enter**: Schedule message
- **Ctrl+R**: Clear form
- **Ctrl+S**: Save as template
- **Escape**: Close dialogs

## 🔌 API Reference

### Authentication Endpoints

#### POST `/api/auth/token`
Exchange credentials for access token.

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

### Messaging Endpoints

#### GET `/api/messaging/inbox`
Retrieve inbox messages.

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)
- `offset` (optional): Offset for pagination (default: 0)
- `direction` (optional): Message direction filter (default: "incoming")
- `reverse` (optional): Sort order (default: true for newest first)

#### POST `/api/messaging/sms`
Send SMS message.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "to": "string",
  "messageContent": "string",
  "from": "string (required)",
  "scheduledDelivery": "ISO datetime string (optional)"
}
```

#### POST `/api/messaging/mms`
Send MMS message.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "to": "string",
  "subject": "string (optional)",
  "body": "string (optional)",
  "from": "string (required)",
  "media": [
    {
      "type": "string",
      "filename": "string",
      "payload": "base64 string"
    }
  ]
}
```

#### GET `/api/messaging/status/{messageId}`
Get message delivery status.

## 🗄️ Database Schema

The application uses SQLite with the following main tables:

### Users
- User authentication and profile information
- Credits management for messaging costs

### Contacts
- Contact information and categorization
- Phone numbers and email addresses

### Messages
- Sent, scheduled, and inbox messages
- Delivery status tracking

### Templates
- Reusable message templates
- Template categories and metadata

### Rules
- Automated message handling rules
- Conditions and actions for rule processing

### Media Files
- Uploaded media for MMS messages
- File metadata and storage paths

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Secure password storage
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting (configurable)
- **CORS Configuration**: Cross-origin resource sharing settings

## 📊 Monitoring and Logging

- **Structured Logging**: Detailed application logs
- **Error Tracking**: Comprehensive error handling
- **Performance Monitoring**: API response time tracking
- **Message Status Tracking**: Real-time delivery status updates

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm run start
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
TELSTRA_CLIENT_ID=your_production_client_id
TELSTRA_CLIENT_SECRET=your_production_client_secret
```

## 🔧 Development

### Code Structure
```
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   ├── components/     # React components
│   └── page.tsx        # Main page
├── components/         # Reusable UI components
├── lib/               # Utilities and services
│   ├── database.ts    # Database connection
│   ├── telstra-api.ts # Telstra API integration
│   └── *.ts           # Various services
└── public/            # Static assets
```

### Key Services
- **MessagingService**: Handles message sending and tracking
- **ContactService**: Manages contact operations
- **TemplateService**: Template management
- **InboxService**: Inbox message handling
- **RulesService**: Automated rule processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.


## 🔄 Changelog

### Version 1.0.0
- Initial release with core messaging functionality
- SMS and MMS support
- Contact and template management
- Basic inbox functionality
- Authentication system
- Admin panel

### Recent Updates
- Message scheduling feature
- Rules wizard for automation
- Enhanced search functionality
- Real-time notifications (Inbox and Sent Messages update instantly)
- Media library management
- Improved UI/UX
- Message Templates now auto-navigate to Send SMS when used
- Messages sent by rules are now persisted and appear in Sent Messages
- Sent Messages view updates in real time (no manual refresh needed)

---

**Made with ❤️ for seamless business communication**
