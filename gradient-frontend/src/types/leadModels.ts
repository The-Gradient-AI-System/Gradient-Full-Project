export enum LeadStatus {
  NEW = "NEW",
  ASSIGNED = "ASSIGNED",
  EMAIL_SENT = "EMAIL_SENT",
  WAITING_REPLY = "WAITING_REPLY",
  REPLY_READY = "REPLY_READY",
  CLOSED = "CLOSED",
  LOST = "LOST",
}

export type StatusHistory = {
  id: string;
  date: string;
  leadName: string;
  status: LeadStatus;
  assignee: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  status: LeadStatus;
  isPriority: boolean;
  history: StatusHistory[];
};

export type UserSettings = {
  topBlock: string;
  bottomBlock: string;
  prompts: {
    follow_up: string;
    recap: string;
    quick: string;
  };
};

export type GenerateRepliesRequest = {
  sender: string;
  subject?: string;
  body?: string;
  lead?: Record<string, unknown>;
  placeholders?: Record<string, unknown>;
  prompt_overrides?: Record<string, string>;
};

export type GenerateRepliesResponse = {
  prompts: UserSettings;
  replies: {
    follow_up?: string;
    recap?: string;
    quick?: string;
  };
};

export type LeadProfileResponse = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  status: string;
  pending_review?: boolean;
  is_priority?: boolean;
  emails: Array<{
    gmail_id: string;
    subject: string;
    received_at: string;
    body: string;
    status: string;
  }>;
  history: Array<StatusHistory>;
};

export type DashboardMetrics = {
  stats: Record<string, number>;
  line: Array<{ name: string; pv: number; uv: number }>;
  quarter: Array<{ name: string; pv: number; uv: number }>;
  month: Array<{ name: string; pv: number; uv: number }>;
  pie: Array<{ value: number }>;
  generated_at?: string;
};

export type PreprocessingStatus = "idle" | "processing" | "ready" | "failed";
