import type { Context, Next } from "hono";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

class InMemoryStore {
  private store = new Map<string, RateLimitStore>();

  get(key: string): RateLimitStore | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, value: RateLimitStore): void {
    this.store.set(key, value);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const store = new InMemoryStore();

setInterval(() => store.cleanup(), 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  limit: number;
  message?: string;
  keyType: "ip" | "ip+code";
}) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    let key: string;
    if (options.keyType === "ip+code") {
      const code = c.req.param("code") || "unknown";
      key = `ratelimit:${ip}:${code}`;
    } else {
      key = `ratelimit:${ip}`;
    }

    const now = Date.now();
    const windowMs = options.windowMs;
    const limit = options.limit;

    let entry = store.get(key);

    if (!entry) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(key, entry);
    } else {
      entry.count++;
      store.set(key, entry);
    }

    const remaining = Math.max(0, limit - entry.count);
    c.header("X-RateLimit-Limit", limit.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", new Date(entry.resetTime).toISOString());

    if (entry.count > limit) {
      const secondsLeft = Math.ceil((entry.resetTime - now) / 1000);
      return c.html(
        `
          <div id="result"></div>
          <div hx-swap-oob="beforeend:body">
            <div
              id="rate-limit-modal"
              class="fixed inset-0 flex items-center justify-center z-1 p-4"
              style="animation: fadeIn 0.2s ease"
            >
              <div class="bg-black opacity-50 absolute inset-0"></div>
              <div class="neo-card bg-red-100 max-w-md w-full">
                <h3 class="text-2xl font-black text-red-600 mb-4">SABAR WOI!</h3>
                <p class="font-bold mb-4">Terlalu banyak request! Tunggu 1 menit ya.</p>
                <div class="bg-white border-4 border-black p-4 mb-4">
                  <p class="text-sm mb-2 font-bold">Reset dalam:</p>
                  <p class="font-black text-5xl text-center" id="countdown-timer">${secondsLeft}s</p>
                </div>
                <button
                  onclick="
                    const modal = document.getElementById('rate-limit-modal');
                    modal.style.animation = 'fadeOut 0.2s ease';
                    setTimeout(() => modal.remove(), 200);
                  "
                  class="neo-btn w-full"
                >
                  OKE SIAP
                </button>
              </div>
            </div>
          </div>
          <script>
            (function() {
              let secondsLeft = ${secondsLeft};
              const timer = document.getElementById('countdown-timer');
              const modal = document.getElementById('rate-limit-modal');

              const interval = setInterval(() => {
                secondsLeft--;
                if (timer) {
                  timer.textContent = secondsLeft + 's';
                }

                if (secondsLeft <= 0) {
                  clearInterval(interval);
                  if (modal) {
                    modal.style.animation = 'fadeOut 0.2s ease';
                    setTimeout(() => modal.remove(), 200);
                  }
                }
              }, 1000);
            })();
          </script>
          <style>
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
          </style>
        `,
        200,
      );
    }

    await next();
  };
}
