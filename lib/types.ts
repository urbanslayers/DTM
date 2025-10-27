export interface Rule {
  id: string
  userId: string
  name: string
  condition: {
    type: "contains" | "from" | "time" | "keyword"
    value: string
  }
  action: {
    type: "forward" | "reply" | "delete" | "folder"
    value: string
  }
  enabled: boolean
  createdAt: Date
}

export interface InboxMessage {
  id: string
  userId: string
  from: string
  to: string
  subject?: string
  content: string
  type: "sms" | "mms"
  receivedAt: Date
  read: boolean
  folder: "personal" | "company"
}

export interface MediaFile {
  id: string
  userId: string
  filename: string
  originalName: string
  size: number
  type: string
  url: string
  uploadedAt: Date
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: "user" | "admin";
  credits: number;
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
  personalMobile?: string;
  displayName?: string;
  timezone?: string;
  language?: string;
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  category: "company" | "personal";
  createdAt: Date;
}

export interface ContactGroup {
  id: string;
  userId: string;
  name: string;
  contactIds: string[];
  createdAt: Date;
}

export interface Message {
  id: string;
  userId: string;
  to: string[];
  from?: string;
  content: string;
  type: "sms" | "mms";
  status: "sent" | "delivered" | "failed" | "scheduled" | "cancelled";
  credits: number;
  isTemplate: boolean;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  scheduledAt?: Date;
  templateName?: string;
}

export interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  category: "personal" | "company";
  createdAt: Date;
}

export interface ApiUsage {
  id: string
  userId: string | null
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: Date
}

export interface SystemStatus {
  id: string
  userId: string
  type: "success" | "error" | "info" | "warning"
  message: string
  timestamp: Date
}

export interface Analytics {
  overview: {
    totalMessages: number;
    smsCount: number;
    mmsCount: number;
    deliveredCount: number;
    failedCount: number;
    deliveryRate: number;
    activeUsers: number;
    newUsers: number;
    totalAPICalls: number;
    avgResponseTime: number;
    errorRate: number;
  };
  dailyStats: Array<{
    date: string;
    messages: number;
    apiCalls: number;
    errors: number;
  }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  topUsers: Array<{ userId: string; username: string; messageCount: number }>;
}
