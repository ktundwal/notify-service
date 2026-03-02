import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dispatch } from '../src/services/dispatcher';
import { initDb, closeDb, insertSubscription } from '../src/storage/sqlite';
import { Subscription } from '../src/types';

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    userId: 'user-alice',
    channel: 'deployments',
    enabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    minPriority: 'P3',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  initDb(':memory:');
});

afterEach(() => {
  closeDb();
});

describe('dispatch', () => {
  it('delivers to a subscribed user', () => {
    insertSubscription(makeSub());

    const result = dispatch({
      channel: 'deployments',
      priority: 'P1',
      title: 'Deploy started',
      body: 'v2.3.1 rolling out',
      sourceId: 'ci-100',
    });

    expect(result.deduplicated).toBe(false);
    expect(result.delivered).toContain('user-alice');
    expect(result.notificationId).toBeTruthy();
  });

  it('filters when notification priority is below subscription threshold', () => {
    insertSubscription(makeSub({ minPriority: 'P1' }));

    const result = dispatch({
      channel: 'deployments',
      priority: 'P3',
      title: 'Minor update',
      body: 'Docs updated',
      sourceId: 'ci-101',
    });

    expect(result.delivered).toHaveLength(0);
    expect(result.filtered).toContain('user-alice');
  });

  it('delivers P0 even during quiet hours', () => {
    // Set quiet hours to cover all 24h to guarantee "now" is within them
    insertSubscription(makeSub({
      quietHoursStart: '00:00',
      quietHoursEnd: '23:59',
    }));

    const result = dispatch({
      channel: 'deployments',
      priority: 'P0',
      title: 'CRITICAL: Production down',
      body: 'All health checks failing',
      sourceId: 'ci-102',
    });

    expect(result.delivered).toContain('user-alice');
  });

  it('filters non-P0 during quiet hours', () => {
    insertSubscription(makeSub({
      quietHoursStart: '00:00',
      quietHoursEnd: '23:59',
    }));

    const result = dispatch({
      channel: 'deployments',
      priority: 'P2',
      title: 'Staging deploy',
      body: 'v2.3.1-rc1',
      sourceId: 'ci-103',
    });

    expect(result.delivered).toHaveLength(0);
    expect(result.filtered).toContain('user-alice');
  });

  it('deduplicates identical notifications from the same source', () => {
    insertSubscription(makeSub());

    const payload = {
      channel: 'deployments',
      priority: 'P1' as const,
      title: 'Deploy started',
      body: 'v2.3.1 rolling out',
      sourceId: 'ci-104',
    };

    const first = dispatch(payload);
    expect(first.deduplicated).toBe(false);

    const second = dispatch(payload);
    expect(second.deduplicated).toBe(true);
  });

  it('delivers to multiple subscribers', () => {
    insertSubscription(makeSub({ id: 'sub-1', userId: 'user-alice' }));
    insertSubscription(makeSub({ id: 'sub-2', userId: 'user-bob' }));

    const result = dispatch({
      channel: 'deployments',
      priority: 'P1',
      title: 'Deploy complete',
      body: 'v2.3.1 is live',
      sourceId: 'ci-105',
    });

    expect(result.delivered).toContain('user-alice');
    expect(result.delivered).toContain('user-bob');
  });

  it('returns empty arrays when no one is subscribed', () => {
    const result = dispatch({
      channel: 'deployments',
      priority: 'P1',
      title: 'Deploy',
      body: 'Nobody cares',
      sourceId: 'ci-106',
    });

    expect(result.delivered).toHaveLength(0);
    expect(result.filtered).toHaveLength(0);
    expect(result.deduplicated).toBe(false);
  });
});
