import express from 'express';
import path from 'node:path';
import { initDb } from './storage/sqlite';
import webhookRoutes from './routes/webhooks';
import subscriptionRoutes from './routes/subscriptions';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/webhooks', webhookRoutes);
app.use('/subscriptions', subscriptionRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initDb();

app.listen(PORT, () => {
  console.log(`notify-service running on http://localhost:${PORT}`);
});

export default app;
