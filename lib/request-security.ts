export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }

  const allowedOrigins = new Set([new URL(request.url).origin]);
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      allowedOrigins.add(new URL(appUrl).origin);
    } catch {
      // A malformed deployment variable must never broaden accepted origins.
    }
  }

  return allowedOrigins.has(normalizedOrigin);
}
