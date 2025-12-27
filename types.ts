export enum CalendarType {
  SOLAR = 'SOLAR',
  LUNAR = 'LUNAR'
}

export enum CycleType {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export interface EventLog {
  id: string;
  eventId: string;
  date: string; // ISO String
  title: string;
  amount: number; // Positive for income, negative for expense
  notes: string;
  tags: string[];
}

export interface EventItem {
  id: string;
  name: string;
  date: string; // Base date (YYYY-MM-DD)
  calendarType: CalendarType;
  cycleType: CycleType;
  interval: number; // e.g., every 3 months
  reminderDays: number; // Days in advance to remind
  description?: string;
  created_at: number;
}

export interface AppSettings {
  dailyPushTime: string; // "09:00"
  // Notification Configs (Saved in KV now)
  telegramBotToken?: string;
  telegramChatId?: string;
  barkKey?: string;
  pushPlusToken?: string;
  webhookUrl?: string;
}

export interface WorkerResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}