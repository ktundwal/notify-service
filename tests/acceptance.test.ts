/**
 * Acceptance tests — written by the human, not the agents.
 *
 * These define the "definition of done" for the demo task.
 * 6 test groups: 3 features (auth, rate-limiter, stats) + 3 artifacts
 * (on-call playbook, CLAUDE.md docs update, UX spec).
 * Agents write their own unit tests, but THIS file is the external
 * verification. If these pass, the features and artifacts work as specified.
 *
 * How this works:
 * - Each describe block dynamically imports the module the agents must create.
 * - If the module doesn't exist → import fails → all tests in that block fail.
 * - If the module exists but behaves wrong → specific assertions fail.
 * - Agents CANNOT modify this file to make tests pass — only their code can.
 *
 * DO NOT MODIFY THIS FILE — it's the spec.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { initDb, closeDb, insertNotification } from '../src/storage/sqlite';
import { v4 as uuid } from 'uuid';

// ─── Auth Middleware ───────────────────────────────────────────────

describe('Acceptance: Auth Middleware', () => {
  beforeEach(() => {
    initDb(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('module exists at src/middleware/auth.ts and exports authMiddleware', async () => {
    const mod = await import('../src/middleware/auth');
    expect(typeof mod.authMiddleware).toBe('function');
  });

  it('rejects requests without X-API-Key header with 401', async () => {
    const { authMiddleware } = await import('../src/middleware/auth');
    const app = express();
    app.use(express.json());
    app.use('/webhooks', authMiddleware);
    app.post('/webhooks/notify', (_req, res) => res.json({ ok: true }));

    const res = await request(app)
      .post('/webhooks/notify')
      .send({ channel: 'test', priority: 'P1', title: 'T', body: 'B', sourceId: 's1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects requests with an invalid API key with 401', async () => {
    const { authMiddleware } = await import('../src/middleware/auth');
    const app = express();
    app.use(express.json());
    app.use('/webhooks', authMiddleware);
    app.post('/webhooks/notify', (_req, res) => res.json({ ok: true }));

    const res = await request(app)
      .post('/webhooks/notify')
      .set('X-API-Key', 'wrong-key')
      .send({ channel: 'test', priority: 'P1', title: 'T', body: 'B', sourceId: 's1' });

    expect(res.status).toBe(401);
  });

  it('allows requests with valid dev API key', async () => {
    const { authMiddleware } = await import('../src/middleware/auth');
    const app = express();
    app.use(express.json());
    app.use('/webhooks', authMiddleware);
    app.post('/webhooks/notify', (_req, res) => res.status(200).json({ ok: true }));

    const res = await request(app)
      .post('/webhooks/notify')
      .set('X-API-Key', 'notify-dev-key')
      .send({ channel: 'test', priority: 'P1', title: 'T', body: 'B', sourceId: 's1' });

    expect(res.status).toBe(200);
  });

  it('allows requests with valid prod API key', async () => {
    const { authMiddleware } = await import('../src/middleware/auth');
    const app = express();
    app.use(express.json());
    app.use('/webhooks', authMiddleware);
    app.post('/webhooks/notify', (_req, res) => res.status(200).json({ ok: true }));

    const res = await request(app)
      .post('/webhooks/notify')
      .set('X-API-Key', 'notify-prod-key')
      .send({ channel: 'test', priority: 'P1', title: 'T', body: 'B', sourceId: 's1' });

    expect(res.status).toBe(200);
  });
});

// ─── Rate Limiter ─────────────────────────────────────────────────

describe('Acceptance: Rate Limiter', () => {
  beforeEach(() => {
    initDb(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('module exists at src/services/rate-limiter.ts and exports createRateLimiter', async () => {
    const mod = await import('../src/services/rate-limiter');
    expect(typeof mod.createRateLimiter).toBe('function');
  });

  it('allows requests under the rate limit', async () => {
    const { createRateLimiter } = await import('../src/services/rate-limiter');
    const app = express();
    app.use(express.json());
    app.post('/test', createRateLimiter(5, 60_000), (_req, res) => res.json({ ok: true }));

    const res = await request(app)
      .post('/test')
      .send({ sourceId: 'src-1' });

    expect(res.status).toBe(200);
  });

  it('returns 429 with Retry-After header when limit exceeded', async () => {
    const { createRateLimiter } = await import('../src/services/rate-limiter');
    const app = express();
    app.use(express.json());
    // Low limit for testing: 3 requests per minute
    app.post('/test', createRateLimiter(3, 60_000), (_req, res) => res.json({ ok: true }));

    // Send 4 requests — the 4th should be rejected
    for (let i = 0; i < 3; i++) {
      await request(app).post('/test').send({ sourceId: 'flood' });
    }

    const res = await request(app)
      .post('/test')
      .send({ sourceId: 'flood' });

    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeTruthy();
    expect(res.body.error).toMatch(/rate limit/i);
  });

  it('tracks limits independently per sourceId', async () => {
    const { createRateLimiter } = await import('../src/services/rate-limiter');
    const app = express();
    app.use(express.json());
    app.post('/test', createRateLimiter(2, 60_000), (_req, res) => res.json({ ok: true }));

    // Exhaust limit for source-A
    await request(app).post('/test').send({ sourceId: 'source-A' });
    await request(app).post('/test').send({ sourceId: 'source-A' });

    // source-A should be blocked
    const blockedRes = await request(app).post('/test').send({ sourceId: 'source-A' });
    expect(blockedRes.status).toBe(429);

    // source-B should still work
    const okRes = await request(app).post('/test').send({ sourceId: 'source-B' });
    expect(okRes.status).toBe(200);
  });
});

// ─── Stats Endpoint ───────────────────────────────────────────────

describe('Acceptance: Stats Endpoint', () => {
  beforeEach(() => {
    initDb(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('module exists at src/routes/stats.ts and exports a router', async () => {
    const mod = await import('../src/routes/stats');
    expect(mod.default).toBeTruthy();
  });

  it('storage exports getNotificationStats function', async () => {
    const mod = await import('../src/storage/sqlite');
    expect(typeof mod.getNotificationStats).toBe('function');
  });

  it('GET /stats returns JSON with channels and total', async () => {
    const statsRoutes = (await import('../src/routes/stats')).default;
    const app = express();
    app.use('/stats', statsRoutes);

    const res = await request(app).get('/stats');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('channels');
    expect(res.body).toHaveProperty('total');
  });

  it('counts notifications grouped by channel and priority', async () => {
    const recent = new Date(Date.now() - 10 * 60_000).toISOString();

    insertNotification({
      id: uuid(), channel: 'deployments', priority: 'P0',
      title: 'Deploy', body: 'Failed', sourceId: 's1', createdAt: recent,
    });
    insertNotification({
      id: uuid(), channel: 'deployments', priority: 'P0',
      title: 'Deploy 2', body: 'Failed again', sourceId: 's2', createdAt: recent,
    });
    insertNotification({
      id: uuid(), channel: 'deployments', priority: 'P2',
      title: 'Deploy 3', body: 'Staging', sourceId: 's3', createdAt: recent,
    });
    insertNotification({
      id: uuid(), channel: 'incidents', priority: 'P0',
      title: 'Incident', body: 'Outage', sourceId: 's4', createdAt: recent,
    });

    const statsRoutes = (await import('../src/routes/stats')).default;
    const app = express();
    app.use('/stats', statsRoutes);

    const res = await request(app).get('/stats');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.channels.deployments.P0).toBe(2);
    expect(res.body.channels.deployments.P2).toBe(1);
    expect(res.body.channels.incidents.P0).toBe(1);
  });

  it('does not count notifications older than 1 hour', async () => {
    const twoHoursAgo = new Date(Date.now() - 120 * 60_000).toISOString();

    insertNotification({
      id: uuid(), channel: 'old', priority: 'P1',
      title: 'Old', body: 'Stale', sourceId: 's-old', createdAt: twoHoursAgo,
    });

    const statsRoutes = (await import('../src/routes/stats')).default;
    const app = express();
    app.use('/stats', statsRoutes);

    const res = await request(app).get('/stats');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});

// ─── On-Call Playbook ────────────────────────────────────────────

describe('Acceptance: On-Call Playbook', () => {
  let playbook: string;

  beforeEach(() => {
    const playbookPath = path.join(process.cwd(), 'docs', 'oncall-playbook.md');
    playbook = fs.readFileSync(playbookPath, 'utf-8');
  });

  it('docs/oncall-playbook.md exists and is non-empty', () => {
    expect(playbook.length).toBeGreaterThan(0);
  });

  it('contains a section for auth middleware mentioning 401 and X-API-Key', () => {
    expect(playbook).toMatch(/auth/i);
    expect(playbook).toMatch(/401/);
    expect(playbook).toMatch(/X-API-Key/i);
  });

  it('contains a section for rate limiter mentioning 429 and Retry-After', () => {
    expect(playbook).toMatch(/rate limit/i);
    expect(playbook).toMatch(/429/);
    expect(playbook).toMatch(/Retry-After/i);
  });

  it('contains a section for stats endpoint mentioning GET /stats and channels', () => {
    expect(playbook).toMatch(/stats/i);
    expect(playbook).toMatch(/GET \/stats/);
    expect(playbook).toMatch(/channel/i);
  });

  it('contains diagnostic or troubleshooting guidance for each feature', () => {
    const hasDiagnostics = /diagnos|troubleshoot|debug|investigat|check|verify/i.test(playbook);
    expect(hasDiagnostics).toBe(true);
  });
});

// ─── Librarian (Docs Updated) ───────────────────────────────────

describe('Acceptance: Librarian (Docs Updated)', () => {
  let claudeMd: string;

  beforeEach(() => {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    claudeMd = fs.readFileSync(claudeMdPath, 'utf-8');
  });

  it('CLAUDE.md documents the stats endpoint', () => {
    expect(claudeMd).toMatch(/\/stats/);
  });

  it('CLAUDE.md documents API key authentication', () => {
    expect(claudeMd).toMatch(/X-API-Key/i);
  });

  it('CLAUDE.md documents rate limiting', () => {
    expect(claudeMd).toMatch(/rate limit/i);
  });

  it('CLAUDE.md architecture includes auth middleware file', () => {
    expect(claudeMd).toMatch(/middleware\/auth/);
  });
});

// ─── Product Owner Spec ─────────────────────────────────────────

describe('Acceptance: Product Owner Spec', () => {
  let spec: string;

  beforeEach(() => {
    const specPath = path.join(process.cwd(), 'demo-artifacts', 'ux-spec.md');
    spec = fs.readFileSync(specPath, 'utf-8');
  });

  it('docs/ux-spec.md exists and is non-empty', () => {
    expect(spec.length).toBeGreaterThan(0);
  });

  it('UX spec covers authentication error states', () => {
    expect(spec).toMatch(/auth|API key|401/i);
  });

  it('UX spec covers rate limiting feedback', () => {
    expect(spec).toMatch(/rate limit|429|throttl/i);
  });

  it('UX spec covers the stats display', () => {
    expect(spec).toMatch(/stats|dashboard|channel/i);
  });
});
