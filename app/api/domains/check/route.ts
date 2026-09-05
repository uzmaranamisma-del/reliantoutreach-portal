import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { domains } from '@/db/schema';
import { eq } from 'drizzle-orm';

type DnsAnswer = { data?: string };
type DnsResponse = { Answer?: DnsAnswer[] };
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function lookup(name: string, type: 'TXT' | 'MX') {
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) throw new Error('DNS_LOOKUP_FAILED');
  return ((await response.json()) as DnsResponse).Answer ?? [];
}

export async function POST() {
  const auth = await getChatGPTUser();
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const workspaceId = `workspace:${auth.userId}`;
  const db = getDb();
  const rows = await db
    .select()
    .from(domains)
    .where(eq(domains.workspaceId, workspaceId))
    .limit(100);
  let checked = 0;
  for (const row of rows) {
    try {
      const [txt, dmarc, mx] = await Promise.all([
        lookup(row.domain, 'TXT'),
        lookup(`_dmarc.${row.domain}`, 'TXT'),
        lookup(row.domain, 'MX'),
      ]);
      const spfFound = txt.some((answer) =>
        answer.data?.toLowerCase().includes('v=spf1'),
      );
      const dmarcFound = dmarc.some((answer) =>
        answer.data?.toLowerCase().includes('v=dmarc1'),
      );
      const mxFound = mx.length > 0;
      const healthy = spfFound && dmarcFound && mxFound;
      await db
        .update(domains)
        .set({
          status: healthy ? 'healthy' : 'warning',
          spfStatus: spfFound ? 'verified' : 'missing',
          dmarcStatus: dmarcFound ? 'verified' : 'missing',
          mxStatus: mxFound ? 'verified' : 'missing',
          dkimStatus: row.dkimSelector ? row.dkimStatus : 'selector_needed',
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(domains.id, row.id));
      checked++;
    } catch {
      await db
        .update(domains)
        .set({ status: 'error', updatedAt: new Date() })
        .where(eq(domains.id, row.id));
    }
  }
  return json({ checked, total: rows.length });
}
