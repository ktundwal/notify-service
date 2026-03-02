import { v4 as uuid } from 'uuid';
import { initDb, insertSubscription, insertNotification } from '../src/storage/sqlite';
import { Notification, Subscription } from '../src/types';

console.log('Seeding notify-service database...\n');
initDb();

// Create subscriptions
const subscriptions: Subscription[] = [
  {
    id: uuid(),
    userId: 'alice',
    channel: 'deployments',
    enabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    minPriority: 'P2',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuid(),
    userId: 'alice',
    channel: 'incidents',
    enabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    minPriority: 'P0',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuid(),
    userId: 'bob',
    channel: 'deployments',
    enabled: true,
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',
    minPriority: 'P3',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuid(),
    userId: 'bob',
    channel: 'pull-requests',
    enabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    minPriority: 'P3',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuid(),
    userId: 'charlie',
    channel: 'incidents',
    enabled: true,
    quietHoursStart: '21:00',
    quietHoursEnd: '09:00',
    minPriority: 'P1',
    createdAt: new Date().toISOString(),
  },
];

for (const sub of subscriptions) {
  insertSubscription(sub);
  console.log(`  Subscription: ${sub.userId} → ${sub.channel} (min: ${sub.minPriority})`);
}

// Create some sample notifications
const notifications: Notification[] = [
  {
    id: uuid(),
    channel: 'deployments',
    priority: 'P1',
    title: 'Production deploy: mesh-api v2.3.1',
    body: 'Rolling update started. 3/10 pods healthy.',
    sourceId: 'ci-pipeline-42',
    createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
  },
  {
    id: uuid(),
    channel: 'incidents',
    priority: 'P0',
    title: 'CRITICAL: Payment service unresponsive',
    body: 'Health checks failing for payment-api. 5xx rate > 50%. On-call paged.',
    sourceId: 'monitor-payments',
    createdAt: new Date(Date.now() - 15 * 60_000).toISOString(),
  },
  {
    id: uuid(),
    channel: 'pull-requests',
    priority: 'P3',
    title: 'PR #847: Update README badges',
    body: 'Minor documentation update. Auto-merge eligible.',
    sourceId: 'github-pr-847',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
];

for (const notif of notifications) {
  insertNotification(notif);
  console.log(`  Notification: [${notif.priority}] ${notif.title}`);
}

console.log(`\nSeeded ${subscriptions.length} subscriptions and ${notifications.length} notifications.`);
console.log('Run `npm run dev` to start the server.');
