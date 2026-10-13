export type CapabilityName = "account" | "insights" | "owned_media_comments" | "business_discovery" | "messaging_metadata";
export type CapabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "UNAUTHORIZED" | "UNSUPPORTED_ACCOUNT" | "API_ERROR" | "RATE_LIMITED";
export type CapabilityResult = { capability: CapabilityName; status: CapabilityStatus; detail: string; checkedAt: string };
export type ProviderProfile = { instagramUserId?: string; username?: string; displayName?: string; biography?: string; profileUrl?: string; accountType?: "BUSINESS" | "CREATOR" | "PERSONAL" | "UNKNOWN" };

export interface InstagramProvider {
  readonly name: string;
  getCapabilities(): Promise<CapabilityResult[]>;
  getAuthorizedAccount(): Promise<ProviderProfile | null>;
  discoverProfessionalAccount(username: string): Promise<ProviderProfile | null>;
}

export class InstagramProviderError extends Error {
  constructor(public readonly status: CapabilityStatus, message: string, public readonly retryAfterSeconds?: number) { super(message); }
}

function statusFromHttp(response: Response): CapabilityStatus {
  if (response.status === 429) return "RATE_LIMITED";
  if (response.status === 401 || response.status === 403) return "UNAUTHORIZED";
  if (response.status === 400) return "UNSUPPORTED_ACCOUNT";
  return "API_ERROR";
}

export class InstagramGraphProvider implements InstagramProvider {
  readonly name = "Instagram Graph API";
  constructor(private readonly options: { accessToken?: string; accountId?: string; apiVersion?: string; fetcher?: typeof fetch } = {}) {}
  private get fetcher() { return this.options.fetcher ?? fetch; }
  private get base() { return `https://graph.facebook.com/${this.options.apiVersion ?? "v24.0"}`; }
  private assertConfigured() {
    if (!this.options.accessToken || !this.options.accountId) throw new InstagramProviderError("UNAVAILABLE", "Token ou ID da conta profissional não configurado.");
  }
  private async request(path: string): Promise<Record<string, unknown>> {
    this.assertConfigured();
    const separator = path.includes("?") ? "&" : "?";
    const response = await this.fetcher(`${this.base}${path}${separator}access_token=${encodeURIComponent(this.options.accessToken!)}`);
    if (!response.ok) throw new InstagramProviderError(statusFromHttp(response), `Graph API respondeu ${response.status}.`, Number(response.headers.get("retry-after") ?? undefined));
    return await response.json() as Record<string, unknown>;
  }
  async getCapabilities(): Promise<CapabilityResult[]> {
    const checkedAt = new Date().toISOString();
    if (!this.options.accessToken || !this.options.accountId) return (["account", "insights", "owned_media_comments", "business_discovery", "messaging_metadata"] as CapabilityName[]).map((capability) => ({ capability, status: "UNAVAILABLE", detail: "Integração não configurada.", checkedAt }));
    const checks: Array<[CapabilityName, string, string]> = [
      ["account", `/${this.options.accountId}?fields=id,username,name,biography`, "Informações da conta conectada."],
      ["insights", `/${this.options.accountId}/insights?metric=reach`, "Insights dependem do tipo de conta, escopo e métrica."],
      ["owned_media_comments", `/${this.options.accountId}/media?fields=id,comments_count&limit=1`, "Somente conteúdo pertencente à conta conectada."],
      ["business_discovery", `/${this.options.accountId}?fields=business_discovery.username(self){id,username}`, "Somente contas profissionais elegíveis e caminho Facebook Login."],
      ["messaging_metadata", `/${this.options.accountId}/conversations?limit=1`, "Metadados de mensagens sujeitos a permissões e janela aplicável."]
    ];
    return Promise.all(checks.map(async ([capability, path, detail]) => {
      try { await this.request(path); return { capability, status: "AVAILABLE" as const, detail, checkedAt }; }
      catch (error) { return { capability, status: error instanceof InstagramProviderError ? error.status : "API_ERROR" as CapabilityStatus, detail: error instanceof Error ? error.message : "Falha inesperada.", checkedAt }; }
    }));
  }
  async getAuthorizedAccount(): Promise<ProviderProfile | null> {
    const body = await this.request(`/${this.options.accountId}?fields=id,username,name,biography,account_type`);
    return { instagramUserId: String(body.id), username: typeof body.username === "string" ? body.username : undefined, displayName: typeof body.name === "string" ? body.name : undefined, biography: typeof body.biography === "string" ? body.biography : undefined, accountType: body.account_type === "BUSINESS" || body.account_type === "CREATOR" ? body.account_type : "UNKNOWN" };
  }
  async discoverProfessionalAccount(username: string): Promise<ProviderProfile | null> {
    const body = await this.request(`/${this.options.accountId}?fields=business_discovery.username(${encodeURIComponent(username)}){id,username,name,biography,website,followers_count,media_count}`);
    const profile = body.business_discovery as Record<string, unknown> | undefined;
    if (!profile) return null;
    return { instagramUserId: String(profile.id), username: typeof profile.username === "string" ? profile.username : undefined, displayName: typeof profile.name === "string" ? profile.name : undefined, biography: typeof profile.biography === "string" ? profile.biography : undefined, profileUrl: typeof profile.username === "string" ? `https://instagram.com/${profile.username}` : undefined, accountType: "BUSINESS" };
  }
}

export class MockInstagramProvider implements InstagramProvider {
  readonly name = "Simulador de integração";
  async getCapabilities(): Promise<CapabilityResult[]> {
    const checkedAt = new Date().toISOString();
    const available: CapabilityResult[] = (["account", "insights", "owned_media_comments"] as CapabilityName[]).map((capability) => ({ capability, status: "AVAILABLE", detail: "Disponível apenas com dados simulados; nenhuma chamada foi feita ao Instagram.", checkedAt }));
    return available.concat([
      { capability: "business_discovery", status: "UNAVAILABLE", detail: "Demonstração não consulta perfis externos.", checkedAt },
      { capability: "messaging_metadata", status: "UNAVAILABLE", detail: "O MVP não envia nem lê DMs automaticamente.", checkedAt }
    ] satisfies CapabilityResult[]);
  }
  async getAuthorizedAccount(): Promise<ProviderProfile> { return { instagramUserId: "demo-account", username: "sua_conta_demo", displayName: "Conta de demonstração", accountType: "BUSINESS" }; }
  async discoverProfessionalAccount(): Promise<ProviderProfile | null> { return null; }
}
