import { Router, Request, Response } from 'express';
import { WebhookPayload } from '../types';
import { dispatch } from '../services/dispatcher';
import { getRecentNotifications } from '../storage/sqlite';

const router = Router();

router.post('/notify', (req: Request, res: Response) => {
  const { channel, priority, title, body, sourceId } = req.body as WebhookPayload;

  if (!channel || !priority || !title || !body || !sourceId) {
    res.status(400).json({
      error: 'Missing required fields: channel, priority, title, body, sourceId',
    });
    return;
  }

  if (!['P0', 'P1', 'P2', 'P3'].includes(priority)) {
    res.status(400).json({ error: 'Invalid priority. Must be P0, P1, P2, or P3' });
    return;
  }

  const result = dispatch({ channel, priority, title, body, sourceId });

  if (result.deduplicated) {
    res.status(200).json({ status: 'deduplicated', message: 'Duplicate notification suppressed' });
    return;
  }

  res.status(201).json({
    status: 'dispatched',
    notificationId: result.notificationId,
    delivered: result.delivered.length,
    filtered: result.filtered.length,
  });
});

router.get('/history', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const notifications = getRecentNotifications(limit);
  res.json({ notifications, count: notifications.length });
});

export default router;
