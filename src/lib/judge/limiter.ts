/**
 * Giới hạn trong bộ nhớ tiến trình — đủ vì web chạy một tiến trình PM2 (fork, 1 instance).
 * Nếu sau này chạy nhiều tiến trình thì chuyển sang Redis / bảng DB.
 */

/** Cho phép tối đa `max` việc chạy cùng lúc; việc sau xếp hàng. */
export class Semaphore {
  private active = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly max: number) {}

  async use<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

/** Mỗi khóa (vd. userId) chỉ được làm một lần trong `intervalMs`. */
export class Cooldown {
  private readonly last = new Map<string, number>();

  constructor(private readonly intervalMs: number) {}

  /** Trả về số ms còn phải chờ (0 = được phép, và ghi nhận lần này). */
  take(key: string, now = Date.now()): number {
    const wait = (this.last.get(key) ?? -Infinity) + this.intervalMs - now;
    if (wait > 0) return wait;
    this.last.set(key, now);
    if (this.last.size > 5000) {
      for (const [k, t] of this.last) if (now - t > this.intervalMs) this.last.delete(k);
    }
    return 0;
  }
}
