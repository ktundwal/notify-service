import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { contentHash, isDuplicate } from '../src/services/dedup';
import { initDb, closeDb, insertNotification } from '../src/storage/sqlite';
import { Notification } from '../src/types';

beforeEach(() => {
  initDb(':memory:');
});

afterEach(() => {
  closeDb();
});

describe('contentHash', () => {
  it('produces a consistent hash for the same input', () => {
    const payload = {
      channel: 'deploys',
      priority: 'P0' as const,
      title: 'Deploy failed',
      body: 'Rollback initiated',
      sourceId: 'ci-1',
    };
    expect(contentHash(payload)).toBe(contentHash(payload));
  });

  it('produces different hashes for different content', () => {
    const a = { channel: 'deploys', priority: 'P0' as const, title: 'A', body: 'X', sourceId: 's1' };
    const b = { channel: 'deploys', priority: 'P0' as const, title: 'B', body: 'X', sourceId: 's1' };
    expect(contentHash(a)).not.toBe(contentHash(b));
  });
});

describe('isDuplicate', () => {
  it('returns false when no previous notifications exist', () => {
    const payload = {
      channel: 'alerts',
      priority: 'P1' as const,
      title: 'High CPU',
      body: 'CPU > 90%',
      sourceId: 'monitor-1',
    };
    expect(isDuplicate(payload)).toBe(false);
  });

  it('returns true when the same content was sent recently', () => {
    const notification: Notification = {
      id: 'existing-1',
      channel: 'alerts',
      priority: 'P1',
      title: 'High CPU',
      body: 'CPU > 90%',
      sourceId: 'monitor-1',
      createdAt: new Date().toISOString(),
    };
    insertNotification(notification);

    const payload = {
      channel: 'alerts',
      priority: 'P1' as const,
      title: 'High CPU',
      body: 'CPU > 90%',
      sourceId: 'monitor-1',
    };
    expect(isDuplicate(payload)).toBe(true);
  });

  it('returns false when content differs even from same source', () => {
    const notification: Notification = {
      id: 'existing-2',
      channel: 'alerts',
      priority: 'P1',
      title: 'High CPU',
      body: 'CPU > 90%',
      sourceId: 'monitor-1',
      createdAt: new Date().toISOString(),
    };
    insertNotification(notification);

    const payload = {
      channel: 'alerts',
      priority: 'P1' as const,
      title: 'High Memory',
      body: 'Memory > 95%',
      sourceId: 'monitor-1',
    };
    expect(isDuplicate(payload)).toBe(false);
  });
});
