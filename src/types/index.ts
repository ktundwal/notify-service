export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Notification {
  id: string;
  channel: string;
  priority: Priority;
  title: string;
  body: string;
  sourceId: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  channel: string;
  enabled: boolean;
  quietHoursStart: string | null; // "22:00" format
  quietHoursEnd: string | null;   // "08:00" format
  minPriority: Priority;
  createdAt: string;
}

export interface WebhookPayload {
  channel: string;
  priority: Priority;
  title: string;
  body: string;
  sourceId: string;
}

export interface AdaptiveCard {
  type: 'AdaptiveCard';
  version: '1.4';
  body: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
}

export interface AdaptiveCardElement {
  type: string;
  text?: string;
  size?: string;
  weight?: string;
  color?: string;
  spacing?: string;
  wrap?: boolean;
  items?: AdaptiveCardElement[];
  columns?: AdaptiveCardColumn[];
}

export interface AdaptiveCardColumn {
  type: 'Column';
  width: string;
  items: AdaptiveCardElement[];
}

export interface AdaptiveCardAction {
  type: string;
  title: string;
  url?: string;
}

export interface DispatchResult {
  notificationId: string;
  delivered: string[];
  filtered: string[];
  deduplicated: boolean;
}
