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
  subject?: string | null;
  body?: string | null;
  textOnlyEmails?: boolean | null;
  fromEmails?: string[] | null;
  fromName?: string | null;
  replyToEmail?: string | null;
  tags?: Array<{ name?: string | null }> | string[] | null;
  prospectValue?: number | null;
  trackOpens?: boolean | null;
  trackClicks?: boolean | null;
  sendUnsubscribeListHeader?: boolean | null;
  deactivateIfMissingPlaceholder?: boolean | null;
  stopCoworkersOnReply?: boolean | null;
  useProspectsTimeZone?: boolean | null;
  dailyLimitIncrease?: boolean | null;
  dailyLimitIncreaseToMax?: number | null;
  dailyLimitIncreasePercent?: number | null;
  dailyLimitPrioritize?: string | null;
  dailyLimitInitial?: number | null;
  dailyLimitInitialEnabled?: boolean | null;
  dailyLimitWhichEmailsCount?: string | null;
  espMatchType?: string | null;
  espMatchEnabled?: boolean | null;
  espLimitEnabled?: boolean | null;
  espLimitToMicrosoft?: number | null;
  espLimitToGoogle?: number | null;
  espLimitToOther?: number | null;
  openCount?: number | null;
  clickCount?: number | null;
  conversionCount?: number | null;
  initialOpenCount?: number | null;
  initialClickCount?: number | null;
  initialReplyCount?: number | null;
  initialBounceCount?: number | null;
  initialInterestedCount?: number | null;
  dailyLimit?: number | null;
  dailyLimitPer?: string | null;
  scheduleSending?: boolean | null;
  scheduleTimeZone?: string | null;
  delayMinMinutes?: number | null;
  delayMinSeconds?: number | null;
  sendMon?: boolean | null;
  sendMonAfter?: number | null;
  sendMonBefore?: number | null;
  sendTue?: boolean | null;
  sendTueAfter?: number | null;
  sendTueBefore?: number | null;
  sendWed?: boolean | null;
  sendWedAfter?: number | null;
  sendWedBefore?: number | null;
  sendThu?: boolean | null;
  sendThuAfter?: number | null;
  sendThuBefore?: number | null;
  sendFri?: boolean | null;
  sendFriAfter?: number | null;
  sendFriBefore?: number | null;
  sendSat?: boolean | null;
  sendSatAfter?: number | null;
  sendSatBefore?: number | null;
  sendSun?: boolean | null;
  sendSunAfter?: number | null;
  sendSunBefore?: number | null;
};
export type ProviderCampaignStats = {
  campaignId: number;
  timeline?: string[];
  sentSeries?: { data?: number[] } | number[];
  sentInitialSeries?: { data?: number[] } | number[];
  opensSeries?: { data?: number[] } | number[];
  clicksSeries?: { data?: number[] } | number[];
  replySeries?: { data?: number[] } | number[];
  unspamSeries?: { data?: number[] } | number[];
  followupStats?: unknown[];
};
export type ProviderSender = {
  senderId: number;
  email: string;
  fromName?: string | null;
  accountType?: string | null;
  dailyLimit?: number | null;
  disconnected?: boolean | null;
  warmup?: boolean | null;
  delayMinMinutes?: number | null;
  dailyLimitIncrease?: boolean | null;
  dailyLimitIncreaseToMax?: number | null;
  warmupDailyLimit?: number | null;
  warmupReplyPercent?: number | null;
  warmupSkipWeekends?: boolean | null;
};
export type ProviderProspect = {
  prospectId: number;
  createdAt?: string | null;
  email: string;
  sendingStatus?: string | null;
  sendingActive?: boolean | null;
  industry?: string | null;
  city?: string | null;
  website?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  country?: string | null;
  domain?: string | null;
  companySize?: string | null;
  jobPosition?: string | null;
  location?: string | null;
  personalSocial?: string | null;
  state?: string | null;
  notes?: string | null;
  validationStatus?: string | null;
};
export type ProviderMessage = {
  messageId: string;
  createdAt: string;
  type: 'Sent' | 'Reply' | 'SentManual';
  campaignId?: number | null;
  fromEmail: string;
  toEmail: string;
  subject?: string | null;
  body?: string | null;
  openCount?: number | null;
};
export type ProviderFollowup = {
  followupId: number;
  sequenceId?: number | null;
  subject?: string | null;
  body?: string | null;
  waitMin?: number | null;
  waitUnits?: 'Minutes' | 'Hours' | 'Days' | null;
  useOriginalSubject?: boolean | null;
  sendInSameThread?: boolean | null;
  replyInThread?: boolean | null;
  sentCount?: number | null;
  openCount?: number | null;
  clickCount?: number | null;
  bounceCount?: number | null;
  interestedCount?: number | null;
  replyCount?: number | null;
};
export type ProviderSequence = {
  sequenceId: number;
  name?: string | null;
  shortName?: string | null;
  conditionExtra?: boolean | null;
  conditionNegate?: boolean | null;
  conditionTimes?: number | null;
  conditionReply?: string | null;
  conditionAction?: string | null;
  conditionOperator?: string | null;
  followups?: ProviderFollowup[] | null;
};
type Page<T, C = string | number> = {
  items?: T[];
  pagination?: { nextCursor?: C | null };
};

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

  private async patch<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'X-API-Key': this.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const code =
        response.status === 401 || response.status === 406
          ? 'AUTHENTICATION_FAILED'
          : response.status === 429
            ? 'RATE_LIMITED'
            : 'UPDATE_FAILED';
      throw new Error(code);
    }
    return (await response.json()) as T;
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'RATE_LIMITED' : 'UPDATE_FAILED');
    return (await response.json()) as T;
  }

  private async remove(path: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': this.apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(response.status === 429 ? 'RATE_LIMITED' : 'UPDATE_FAILED');
  }

  async updateCampaign(campaignId: number, fields: Record<string, unknown>) {
    return this.patch<ProviderCampaign>(`/campaigns/${campaignId}`, fields);
  }

  async createFollowup(sequenceId: number, fields: Record<string, unknown>) {
    return this.post<ProviderFollowup>(`/sequences/${sequenceId}/followups`, fields);
  }

  async updateFollowup(followupId: number, fields: Record<string, unknown>) {
    return this.patch<ProviderFollowup>(`/followups/${followupId}`, fields);
  }

  async deleteFollowup(followupId: number) {
    return this.remove(`/followups/${followupId}`);
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

  async getProspects(maxPages = 5) {
    const items: ProviderProspect[] = [];
    let cursor: number | null = null;
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const cursorQuery: string = cursor ? `&startingAfter=${cursor}` : '';
      const page: Page<ProviderProspect, number> = await this.get<
        Page<ProviderProspect, number>
      >(`/prospects?page=${pageNumber}&limit=1000${cursorQuery}`);
      items.push(...(Array.isArray(page.items) ? page.items : []));
      cursor = page.pagination?.nextCursor ?? null;
      if (!cursor) break;
    }
    return items;
  }

  private async getMessagesByType(type: ProviderMessage['type'], maxPages = 3) {
    const items: ProviderMessage[] = [];
    let cursor: string | null = null;
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const cursorQuery: string = cursor
        ? `&startingAfter=${encodeURIComponent(cursor)}`
        : '';
      const page: Page<ProviderMessage, string> = await this.get<
        Page<ProviderMessage, string>
      >(`/messages?type=${type}&page=${pageNumber}&limit=1000${cursorQuery}`);
      items.push(...(Array.isArray(page.items) ? page.items : []));
      cursor = page.pagination?.nextCursor ?? null;
      if (!cursor) break;
    }
    return items;
  }

  async getMessages() {
    const pages = await Promise.all([
      this.getMessagesByType('Reply'),
      this.getMessagesByType('Sent'),
      this.getMessagesByType('SentManual'),
    ]);
    return pages.flat();
  }

  async getCampaignSequence(campaignId: number) {
    const page = await this.get<Page<ProviderSequence, number>>(
      `/campaigns/${campaignId}/sequences`,
    );
    const sequences = Array.isArray(page.items) ? page.items : [];
    const result: Array<{
      sequence: ProviderSequence;
      followups: ProviderFollowup[];
    }> = [];
    for (const sequence of sequences) {
      if (!Number.isInteger(sequence.sequenceId)) continue;
      const followups = Array.isArray(sequence.followups)
        ? sequence.followups
        : await this.get<Page<ProviderFollowup, number>>(
            `/sequences/${sequence.sequenceId}/followups`,
          ).then((response) =>
            Array.isArray(response.items) ? response.items : [],
          );
      result.push({ sequence, followups });
    }
    return result;
  }

  async getCampaignStats(campaignId: number) {
    return this.get<ProviderCampaignStats>(`/campaigns/${campaignId}/stats`);
  }
}
