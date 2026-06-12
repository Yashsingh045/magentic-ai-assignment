/** Shared API types mirrored from the backend contract. */

export type Role = "ADMIN" | "AGENT";

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Shape returned by /auth/register and /auth/login. */
export interface AuthResponse extends AuthTokens {
  user: User;
}

export type Personality = "PROFESSIONAL" | "FRIENDLY" | "TECHNICAL";

export interface EscalationRules {
  refundRequested: boolean;
  legalComplaint: boolean;
  customerAngry: boolean;
  humanRequested: boolean;
  customKeywords: string[];
}

export interface BotConfig {
  id: string;
  organizationId: string;
  botName: string;
  welcomeMessage: string;
  personality: Personality;
  escalationRules: EscalationRules;
}

export type DocumentStatus = "PROCESSING" | "INDEXED" | "FAILED";

export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface Ticket {
  id: string;
  organizationId: string;
  conversationId: string | null;
  customerName: string;
  customerEmail: string;
  query: string;
  priority: Priority;
  status: TicketStatus;
  createdAt: string;
}

export interface EscalationItem {
  id: string;
  reason: string;
  priority: Priority;
  createdAt: string;
  conversationId: string;
  ticket: {
    id: string;
    customerName: string;
    customerEmail: string;
    query: string;
    status: TicketStatus;
  } | null;
}

export type GroupedEscalations = Record<Priority, EscalationItem[]>;

export interface Analytics {
  chat: {
    totalConversations: number;
    avgResponseTimeMs: number;
    resolutionRate: number;
    escalationRate: number;
  };
  kb: {
    mostReferencedDocs: {
      documentId: string;
      filename: string;
      references: number;
    }[];
    failedQueries: number;
    unansweredQuestions: { question: string; at: string }[];
  };
}

export type Channel = "WIDGET" | "EMAIL" | "WHATSAPP";

export interface ConversationListItem {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  channel: Channel;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessage: { content: string; role: "USER" | "ASSISTANT" } | null;
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ConversationMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  richContent: {
    blocks: import("./chat-types").RichContentBlock[];
    suggestedQuestions: string[];
  } | null;
  referencedDocIds: string[] | null;
  responseTimeMs: number | null;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  channel: Channel;
  createdAt: string;
  lastMessageAt: string;
  messages: ConversationMessage[];
  escalations: {
    id: string;
    reason: string;
    priority: Priority;
    ticketId: string | null;
    createdAt: string;
  }[];
  tickets: {
    id: string;
    priority: Priority;
    status: TicketStatus;
    query: string;
    createdAt: string;
  }[];
}

/** A knowledge-base document as returned by GET /documents. */
export interface KbDocument {
  id: string;
  filename: string;
  fileType: string;
  status: DocumentStatus;
  sizeBytes: number;
  uploadedAt: string;
  chunkCount: number;
}
