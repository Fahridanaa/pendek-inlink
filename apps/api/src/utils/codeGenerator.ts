export function generateCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const len = 6;

  let result = "";

  for (let i = 0; i < len; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    let normalized = parsed.href.replace(/\/$/, "");
    if (!normalized.startsWith("http")) {
      normalized = "https://" + normalized;
    }
    return normalized;
  } catch {
    return url;
  }
}
