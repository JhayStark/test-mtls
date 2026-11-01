import { Injectable, OnModuleDestroy } from '@nestjs/common';

const SWEEP_INTERVAL_MS = 60_000;

// Stands in for the production Redis SET NX EX. Per-process, so it only
// detects replays while the service runs as a single task.
@Injectable()
export class SecNonceStore implements OnModuleDestroy {
  private readonly expiries = new Map<string, number>();
  private readonly sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);

  constructor() {
    this.sweeper.unref();
  }

  setIfAbsent(key: string, ttlSeconds: number): boolean {
    const now = Date.now();
    const expiresAt = this.expiries.get(key);
    if (expiresAt !== undefined && expiresAt > now) return false;
    this.expiries.set(key, now + ttlSeconds * 1000);
    return true;
  }

  onModuleDestroy() {
    clearInterval(this.sweeper);
  }

  private sweep() {
    const now = Date.now();
    for (const [key, expiresAt] of this.expiries) {
      if (expiresAt <= now) this.expiries.delete(key);
    }
  }
}
