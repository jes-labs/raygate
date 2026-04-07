import type { IdempotencyStore } from "@raygate/core";

/** In-memory idempotency store. Replace with Redis/Postgres for production. */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}
