import Database from 'better-sqlite3';
import { Notification, Subscription, Priority } from '../types';

let db: Database.Database;

export function initDb(dbPath = './notify-service.db'): Database.Database {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      priority TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      source_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      quiet_hours_start TEXT,
      quiet_hours_end TEXT,
      min_priority TEXT NOT NULL DEFAULT 'P3',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON subscriptions(channel);
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized — call initDb() first');
  return db;
}

interface NotificationRow {
  id: string;
  channel: string;
  priority: string;
  title: string;
  body: string;
  source_id: string;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  channel: string;
  enabled: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  min_priority: string;
  created_at: string;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    channel: row.channel,
    priority: row.priority as Priority,
    title: row.title,
    body: row.body,
    sourceId: row.source_id,
    createdAt: row.created_at,
  };
}

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    enabled: row.enabled === 1,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    minPriority: row.min_priority as Priority,
    createdAt: row.created_at,
  };
}

export function insertNotification(notification: Notification): void {
  getDb().prepare(`
    INSERT INTO notifications (id, channel, priority, title, body, source_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    notification.id,
    notification.channel,
    notification.priority,
    notification.title,
    notification.body,
    notification.sourceId,
    notification.createdAt,
  );
}

export function getRecentNotifications(limit = 50): Notification[] {
  const rows = getDb().prepare(`
    SELECT id, channel, priority, title, body, source_id, created_at
    FROM notifications
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as NotificationRow[];

  return rows.map(rowToNotification);
}

export function getNotificationsBySourceId(sourceId: string, sinceMinutes = 5): Notification[] {
  const since = new Date(Date.now() - sinceMinutes * 60_000).toISOString();
  const rows = getDb().prepare(`
    SELECT id, channel, priority, title, body, source_id, created_at
    FROM notifications
    WHERE source_id = ? AND created_at > ?
    ORDER BY created_at DESC
  `).all(sourceId, since) as NotificationRow[];

  return rows.map(rowToNotification);
}

export function insertSubscription(sub: Subscription): void {
  getDb().prepare(`
    INSERT INTO subscriptions (id, user_id, channel, enabled, quiet_hours_start, quiet_hours_end, min_priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sub.id,
    sub.userId,
    sub.channel,
    sub.enabled ? 1 : 0,
    sub.quietHoursStart,
    sub.quietHoursEnd,
    sub.minPriority,
    sub.createdAt,
  );
}

export function getSubscriptionsByUser(userId: string): Subscription[] {
  const rows = getDb().prepare(`
    SELECT id, user_id, channel, enabled, quiet_hours_start, quiet_hours_end, min_priority, created_at
    FROM subscriptions
    WHERE user_id = ?
  `).all(userId) as SubscriptionRow[];

  return rows.map(rowToSubscription);
}

export function getSubscriptionsByChannel(channel: string): Subscription[] {
  const rows = getDb().prepare(`
    SELECT id, user_id, channel, enabled, quiet_hours_start, quiet_hours_end, min_priority, created_at
    FROM subscriptions
    WHERE channel = ? AND enabled = 1
  `).all(channel) as SubscriptionRow[];

  return rows.map(rowToSubscription);
}

export function deleteSubscription(id: string): boolean {
  const result = getDb().prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function closeDb(): void {
  if (db) db.close();
}
