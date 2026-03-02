import { describe, it, expect } from 'vitest';
import { buildAdaptiveCard } from '../src/services/templates';
import { Notification } from '../src/types';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'test-1',
    channel: 'deployments',
    priority: 'P0',
    title: 'Production deploy failed',
    body: 'Service mesh-api failed health checks after rollout',
    sourceId: 'ci-pipeline-42',
    createdAt: '2026-03-01T10:00:00Z',
    ...overrides,
  };
}

describe('buildAdaptiveCard', () => {
  it('returns a valid adaptive card structure', () => {
    const card = buildAdaptiveCard(makeNotification());

    expect(card.type).toBe('AdaptiveCard');
    expect(card.version).toBe('1.4');
    expect(card.body).toHaveLength(4);
    expect(card.actions).toHaveLength(1);
  });

  it('includes the notification title in the card body', () => {
    const card = buildAdaptiveCard(makeNotification({ title: 'DB connection timeout' }));
    const json = JSON.stringify(card.body);
    expect(json).toContain('DB connection timeout');
  });

  it('includes the notification body text', () => {
    const card = buildAdaptiveCard(makeNotification({ body: 'Retries exhausted after 3 attempts' }));
    const json = JSON.stringify(card.body);
    expect(json).toContain('Retries exhausted after 3 attempts');
  });

  it('includes the channel name', () => {
    const card = buildAdaptiveCard(makeNotification({ channel: 'incidents' }));
    const json = JSON.stringify(card.body);
    expect(json).toContain('incidents');
  });

  it('sets priority color to attention for P0', () => {
    const card = buildAdaptiveCard(makeNotification({ priority: 'P0' }));
    const json = JSON.stringify(card.body);
    expect(json).toContain('"color":"attention"');
  });

  it('sets priority color to warning for P1', () => {
    const card = buildAdaptiveCard(makeNotification({ priority: 'P1' }));
    const json = JSON.stringify(card.body);
    expect(json).toContain('"color":"warning"');
  });

  it('includes a View Details action with the notification ID', () => {
    const card = buildAdaptiveCard(makeNotification({ id: 'notif-abc' }));
    expect(card.actions?.[0]?.url).toContain('notif-abc');
  });
});
