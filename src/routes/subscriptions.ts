import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Subscription, Priority } from '../types';
import {
  insertSubscription,
  getSubscriptionsByUser,
  deleteSubscription,
} from '../storage/sqlite';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { userId, channel, quietHoursStart, quietHoursEnd, minPriority } = req.body;

  if (!userId || !channel) {
    res.status(400).json({ error: 'Missing required fields: userId, channel' });
    return;
  }

  if (minPriority && !['P0', 'P1', 'P2', 'P3'].includes(minPriority)) {
    res.status(400).json({ error: 'Invalid minPriority. Must be P0, P1, P2, or P3' });
    return;
  }

  const subscription: Subscription = {
    id: uuid(),
    userId,
    channel,
    enabled: true,
    quietHoursStart: quietHoursStart || null,
    quietHoursEnd: quietHoursEnd || null,
    minPriority: (minPriority as Priority) || 'P3',
    createdAt: new Date().toISOString(),
  };

  insertSubscription(subscription);
  res.status(201).json({ subscription });
});

router.get('/:userId', (req: Request<{ userId: string }>, res: Response) => {
  const subscriptions = getSubscriptionsByUser(req.params.userId);
  res.json({ subscriptions, count: subscriptions.length });
});

router.delete('/:id', (req: Request<{ id: string }>, res: Response) => {
  const deleted = deleteSubscription(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }

  res.json({ status: 'deleted' });
});

export default router;
