const PRODUCTION_APP_ORIGIN = 'https://app.reliantoutreach.com';

function parsedOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isInternalOrigin(origin: string) {
  const hostname = new URL(origin).hostname.toLowerCase();
  return (
    hostname === '0.0.0.0' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  );
}

/**
 * Returns the browser-facing application origin.
 *
 * Hostinger proxies Next.js through an internal 0.0.0.0 address, so neither
 * request.url nor a mistakenly copied internal APP_URL is safe for production
 * email links and redirects.
 */
export function publicAppOrigin(request?: Request) {
  const configured =
    parsedOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    parsedOrigin(process.env.APP_URL);

  if (process.env.NODE_ENV === 'production') {
    if (configured && !isInternalOrigin(configured)) return configured;
    return PRODUCTION_APP_ORIGIN;
  }

  return configured ?? parsedOrigin(request?.url) ?? PRODUCTION_APP_ORIGIN;
}
