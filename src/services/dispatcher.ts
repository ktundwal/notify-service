import { v4 as uuid } from 'uuid';
import { Notification, WebhookPayload, Priority, DispatchResult } from '../types';
import { insertNotification, getSubscriptionsByChannel } from '../storage/sqlite';
import { isDuplicate } from './dedup';
import { buildAdaptiveCard } from './templates';

const PRIORITY_RANK: Record<Priority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function isInQuietHours(start: string | null, end: string | null): boolean {
  if (!start || !end) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function dispatch(payload: WebhookPayload): DispatchResult {
  if (isDuplicate(payload)) {
    return {
      notificationId: '',
      delivered: [],
      filtered: [],
      deduplicated: true,
    };
  }

  const notification: Notification = {
    id: uuid(),
    channel: payload.channel,
    priority: payload.priority,
    title: payload.title,
    body: payload.body,
    sourceId: payload.sourceId,
    createdAt: new Date().toISOString(),
  };

  insertNotification(notification);

  const subscriptions = getSubscriptionsByChannel(payload.channel);

  const delivered: string[] = [];
  const filtered: string[] = [];

  for (const sub of subscriptions) {
    // Check priority threshold
    if (PRIORITY_RANK[payload.priority] > PRIORITY_RANK[sub.minPriority]) {
      filtered.push(sub.userId);
      continue;
    }

    // P0 always breaks through quiet hours
    if (payload.priority !== 'P0' && isInQuietHours(sub.quietHoursStart, sub.quietHoursEnd)) {
      filtered.push(sub.userId);
      continue;
    }

    // Build adaptive card (in production, this would send to Teams)
    buildAdaptiveCard(notification);
    delivered.push(sub.userId);
  }

  return {
    notificationId: notification.id,
    delivered,
    filtered,
    deduplicated: false,
  };
}
