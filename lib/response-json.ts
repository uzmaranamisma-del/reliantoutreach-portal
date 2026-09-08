// Proxies and runtime failures can return empty or HTML responses.
export async function responseJson(
  response: Response,
): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => null);
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
