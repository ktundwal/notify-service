import { createHash } from 'crypto';
import { WebhookPayload } from '../types';
import { getNotificationsBySourceId } from '../storage/sqlite';

const DEDUP_WINDOW_MINUTES = 5;

export function contentHash(payload: WebhookPayload): string {
  const content = `${payload.channel}:${payload.title}:${payload.body}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function isDuplicate(payload: WebhookPayload): boolean {
  const recent = getNotificationsBySourceId(payload.sourceId, DEDUP_WINDOW_MINUTES);

  if (recent.length === 0) return false;

  const incomingHash = contentHash(payload);

  return recent.some(notification => {
    const existingHash = contentHash({
      channel: notification.channel,
      priority: notification.priority,
      title: notification.title,
      body: notification.body,
      sourceId: notification.sourceId,
    });
    return existingHash === incomingHash;
  });
}
