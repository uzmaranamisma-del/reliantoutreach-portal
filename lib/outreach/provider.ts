export type ProviderCampaign = {
  campaignId: number;
  name: string;
  description?: string | null;
  status: string;
  createdAt?: string | null;
  prospectCount?: number | null;
  activeProspectCount?: number | null;
  sentCount?: number | null;
  bounceCount?: number | null;
  replyCount?: number | null;
  interestedCount?: number | null;
};
export type ProviderSender = {
  senderId: number;
  email: string;
  fromName?: string | null;
  accountType?: string | null;
  dailyLimit?: number | null;
  disconnected?: boolean | null;
  warmup?: boolean | null;
};
type Page<T> = { items?: T[] };

export class OutreachProvider {
  private readonly baseUrl = 'https://api.manyreach.com/api/v2';
  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'X-API-Key': this.apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const code =
        response.status === 401 || response.status === 406
          ? 'AUTHENTICATION_FAILED'
          : response.status === 429
            ? 'RATE_LIMITED'
            : 'UPSTREAM_UNAVAILABLE';
      throw new Error(code);
    }
    return (await response.json()) as T;
  }

  async getCampaigns() {
    const page = await this.get<Page<ProviderCampaign>>(
      '/campaigns?pageQuery.page=1&pageQuery.limit=1000&pageQuery.includeArchived=false',
    );
    return Array.isArray(page.items) ? page.items : [];
  }

  async getSenders() {
    const page = await this.get<Page<ProviderSender>>(
      '/senders?page=1&limit=1000',
    );
    return Array.isArray(page.items) ? page.items : [];
  }
}
