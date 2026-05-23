export type SectionKind = 'primary' | 'updates' | 'forums' | 'promotions';

export interface User {
  displayName: string;
  email: string;
  timezone: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  attendees?: number;
}

export interface ActionItem {
  id: string;
  ask: string;
  due?: string;
  from?: string;
  sourceMsgId?: string;
  confidence: number;
  completed: boolean;
}

export interface MailSender {
  name: string;
  email: string;
}

export interface MailItem {
  id: string;
  from: MailSender;
  subject: string;
  snippet: string;
  body?: string;
  receivedAt: string;
  isUseful: boolean;
  isNoise: boolean;
  read?: boolean;
}

export interface InboxSection {
  newCount: number;
  filteredAsNoise?: number;
  items: MailItem[];
  filteredItems?: MailItem[];
}

export interface Briefing {
  user: User;
  generatedAt: string;
  calendar: CalendarEvent[];
  actionItems: ActionItem[];
  sections: Record<SectionKind, InboxSection>;
}

export interface PersonaMeta {
  id: string;
  label: string;
  description: string;
}
