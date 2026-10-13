import Fastify from "fastify";
import cors from "@fastify/cors";
import { createAnalysisEngine } from "@ina/ai";
import { loadConfig, type AppConfig } from "@ina/config";
import { parseImport, parseManualUsernames } from "@ina/importers";
import { InstagramGraphProvider, type InstagramProvider } from "@ina/instagram";
import { calculateRanking } from "@ina/scoring";
import { contactInputSchema, defaultScoringWeights, pipelineStatuses, scoringWeightsSchema, type NetworkingGoal, type PipelineStatus } from "@ina/shared";
import { z } from "zod";
import { MemoryStore, seedDemo, type Contact } from "./store.js";
import { PostgresStore } from "./postgres-store.js";
import { createCredentialStore, type CredentialStore, type InstagramCredentials } from "./credential-store.js";

type AppOptions = { config?: AppConfig; store?: MemoryStore; provider?: InstagramProvider; credentialStore?: CredentialStore };
const queryArray = (value: unknown) => typeof value === "string" ? value.split(",").filter(Boolean) : [];

function contactView(contact: Contact, goals: NetworkingGoal[], weights = defaultScoringWeights) {
  const assessment = contact.assessment;
  const ranking = assessment ? calculateRanking({ category: assessment.category, aiRelevance: assessment.relevanceScore, confidence: assessment.confidenceScore, opportunities: assessment.potentialOpportunities.length, interactions: contact.interactions.length, hasBiography: Boolean(contact.biography), hasProfessionalFields: [contact.profession, contact.jobTitle, contact.company].filter(Boolean).length, daysSinceEvidence: contact.evidence[0] ? Math.floor((Date.now() - new Date(contact.evidence[0].observedAt).getTime()) / 86_400_000) : undefined, goals }, weights) : undefined;
  return { ...contact, assessment, ranking, profileUrl: contact.profileUrl ?? `https://instagram.com/${contact.instagramUsername}` };
}

export async function buildApp(options: AppOptions = {}) {
  const config = options.config ?? loadConfig();
  const store = options.store ?? (config.DEMO_MODE ? new MemoryStore() : await PostgresStore.create(config.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/instagram_networking?schema=public"));
  const credentialStore = options.credentialStore ?? createCredentialStore(config);
  const ai = createAnalysisEngine({ apiKey: config.ANTHROPIC_API_KEY, model: config.ANTHROPIC_MODEL, demoMode: config.DEMO_MODE });
  const app = Fastify({ logger: config.NODE_ENV !== "test" });
  await app.register(cors, { origin: true });
  app.setErrorHandler((error, _request, reply) => reply.code(400).send({ error: error instanceof Error ? error.message : "Erro de validação" }));
  app.addHook("onRequest", async (request) => { if (request.method !== "OPTIONS") request.headers["x-user-id"] = "demo-user"; });

  async function analyze(contact: Contact) {
    const output = await ai.analyze({ username: contact.instagramUsername, displayName: contact.displayName, biography: contact.biography, profession: contact.profession, jobTitle: contact.jobTitle, company: contact.company, professionalInterests: contact.professionalInterests, notes: contact.personalNotes, interactions: contact.interactions.map((value) => ({ type: value.interactionType, content: value.content })), goals: store.goals.find((goal) => goal.active)?.goals ?? [] });
    const now = new Date().toISOString();
    contact.assessment = { id: crypto.randomUUID(), ...output.assessment, modelVersion: output.modelVersion, analyzedAt: now, inputHash: output.inputHash, scoreExplanation: [], usage: output.usage };
    for (const evidence of output.assessment.evidence) contact.evidence.push({ id: crypto.randomUUID(), sourceType: "AI_ASSESSMENT", sourceUrl: evidence.sourceUrl, fieldName: evidence.field, observedValue: evidence.observation, observedAt: now });
    if (contact.pipeline.status === "DISCOVERED") contact.pipeline.status = "ANALYZED";
    contact.pipeline.updatedAt = now;
    await store.persistContact(contact);
    return contact;
  }

  async function instagramIntegration() {
    const stored = await credentialStore.get();
    const environmentCredentials = config.INSTAGRAM_ACCESS_TOKEN && config.INSTAGRAM_ACCOUNT_ID ? { accessToken: config.INSTAGRAM_ACCESS_TOKEN, accountId: config.INSTAGRAM_ACCOUNT_ID } : undefined;
    const credentials: Pick<InstagramCredentials, "accessToken" | "accountId"> | undefined = stored ?? environmentCredentials;
    const provider = options.provider ?? new InstagramGraphProvider({ accessToken: credentials?.accessToken, accountId: credentials?.accountId, apiVersion: config.INSTAGRAM_GRAPH_API_VERSION });
    const localStatus = await credentialStore.status();
    return { credentials, provider, status: stored ? localStatus : environmentCredentials ? { configured: true, source: "ENVIRONMENT" as const, accountIdHint: `••••${environmentCredentials.accountId.slice(-6)}`, encryption: "ENVIRONMENT_KEY" as const } : localStatus };
  }

  app.get("/health", async () => ({ status: "ok", demoMode: config.DEMO_MODE, persistence: config.DEMO_MODE ? "memory-demo" : "database-required" }));
  app.get("/api/onboarding", async () => {
    const integration = await instagramIntegration();
    return {
      ...store.onboarding,
      demoAvailable: true,
      instagramConfigured: Boolean(integration.credentials),
      instagramConfiguration: integration.status,
      officialLimitations: [
      "A API oficial não lista todos os seguidores.",
      "Biografias de perfis arbitrários não ficam disponíveis.",
      "A descoberta oficial é limitada a contas profissionais elegíveis e permissões aprovadas."
      ]
    };
  });
  app.get("/api/integrations/instagram", async () => {
    const integration = await instagramIntegration();
    return integration.status;
  });
  app.put("/api/integrations/instagram", async (request) => {
    const body = z.object({ accessToken: z.string().min(10).max(10_000), accountId: z.string().min(1).max(100).regex(/^\d+$/, "Use o ID numérico da conta profissional do Instagram.") }).parse(request.body);
    await credentialStore.save(body);
    return credentialStore.status();
  });
  app.delete("/api/integrations/instagram", async () => {
    await credentialStore.clear();
    return credentialStore.status();
  });
  app.post("/api/onboarding/demo", async () => {
    if (store.contacts.size === 0) {
      seedDemo(store);
      for (const contact of store.listContacts()) await store.persistContact(contact);
    }
    const onboarding = await store.completeOnboarding({ mode: "DEMO" });
    return { onboarding, contactsImported: store.contacts.size };
  });
  app.post("/api/onboarding/live", async (request, reply) => {
    const integration = await instagramIntegration();
    if (!integration.credentials) return reply.code(409).send({ error: "Informe o token de acesso e o ID da conta profissional no onboarding para sincronizar." });
    const capabilities = await integration.provider.getCapabilities();
    const account = await integration.provider.getAuthorizedAccount();
    const onboarding = await store.completeOnboarding({ mode: "LIVE", connectedAccount: account ? { instagramUserId: account.instagramUserId, username: account.username, displayName: account.displayName, accountType: account.accountType } : undefined });
    return { onboarding, account, capabilities, nextStep: "Importe a sua exportação de seguidores para criar a base de contatos. A API oficial não enumera todos os seguidores." };
  });
  app.get("/api/dashboard", async () => {
    const contacts = store.listContacts(); const active = store.goals.find((goal) => goal.active)!;
    const views = contacts.map((contact) => contactView(contact, active.goals, active.weights));
    const categoryCounts = Object.fromEntries(["TECH_LEADER", "FOUNDER", "RECRUITER", "ENGINEER", "CREATOR", "EXECUTIVE", "COLLABORATOR", "UNKNOWN"].map((category) => [category, views.filter((contact) => contact.assessment?.category === category).length]));
    return { totalContacts: contacts.length, totalAnalyzed: contacts.filter((contact) => contact.assessment).length, withProfessionalInfo: contacts.filter((contact) => contact.biography || contact.profession || contact.jobTitle).length, highPriority: views.filter((contact) => (contact.ranking?.finalScore ?? 0) >= 75).length, categoryCounts, pipeline: Object.fromEntries(pipelineStatuses.map((status) => [status, contacts.filter((contact) => contact.pipeline.status === status).length])), pendingFollowUps: contacts.filter((contact) => contact.pipeline.nextFollowUpAt && new Date(contact.pipeline.nextFollowUpAt) <= new Date()).length, jobs: [...store.analyses.values()] };
  });
  app.get("/api/contacts", async (request) => {
    const query = request.query as Record<string, unknown>; const page = Math.max(1, Number(query.page ?? 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
    const active = store.goals.find((goal) => goal.active)!; let contacts = store.listContacts().map((contact) => contactView(contact, active.goals, active.weights));
    const search = typeof query.search === "string" ? query.search.toLowerCase() : "";
    const categories = queryArray(query.category); const statuses = queryArray(query.status); const profession = typeof query.profession === "string" ? query.profession.toLowerCase() : "";
    if (search) contacts = contacts.filter((contact) => [contact.instagramUsername, contact.displayName, contact.profession, contact.company].filter(Boolean).join(" ").toLowerCase().includes(search));
    if (profession) contacts = contacts.filter((contact) => contact.profession?.toLowerCase().includes(profession));
    if (categories.length) contacts = contacts.filter((contact) => categories.includes(contact.assessment?.category ?? "UNKNOWN"));
    if (statuses.length) contacts = contacts.filter((contact) => statuses.includes(contact.pipeline.status));
    if (query.hasBiography === "true") contacts = contacts.filter((contact) => Boolean(contact.biography));
    if (typeof query.minRelevance === "string") contacts = contacts.filter((contact) => (contact.ranking?.finalScore ?? 0) >= Number(query.minRelevance));
    contacts.sort((a, b) => (b.ranking?.finalScore ?? -1) - (a.ranking?.finalScore ?? -1));
    return { data: contacts.slice((page - 1) * pageSize, page * pageSize), pagination: { page, pageSize, total: contacts.length, pages: Math.ceil(contacts.length / pageSize) } };
  });
  app.get("/api/contacts/:id", async (request, reply) => { const contact = store.contacts.get((request.params as { id: string }).id); if (!contact) return reply.code(404).send({ error: "Contato não encontrado" }); const active = store.goals.find((goal) => goal.active)!; return contactView(contact, active.goals, active.weights); });
  app.patch("/api/contacts/:id", async (request, reply) => {
    const values = contactInputSchema.parse(request.body); const contact = store.contacts.get((request.params as { id: string }).id); if (!contact) return reply.code(404).send({ error: "Contato não encontrado" });
    const previous = { ...contact }; Object.assign(contact, values, { updatedAt: new Date().toISOString(), dataSource: "MANUAL_ENRICHMENT" });
    for (const [fieldName, value] of Object.entries(values)) if (value && previous[fieldName as keyof Contact] !== value) contact.evidence.push({ id: crypto.randomUUID(), sourceType: "MANUAL", sourceUrl: values.evidenceUrl ?? undefined, fieldName, observedValue: Array.isArray(value) ? value.join(", ") : String(value), observedAt: new Date().toISOString() });
    await store.persistContact(contact);
    const active = store.goals.find((goal) => goal.active)!; return contactView(contact, active.goals, active.weights);
  });
  app.delete("/api/contacts/:id", async (request, reply) => await store.removeContact((request.params as { id: string }).id) ? reply.code(204).send() : reply.code(404).send({ error: "Contato não encontrado" }));
  app.post("/api/imports/preview", async (request) => { const body = z.object({ filename: z.string().min(1), content: z.string().max(10_000_000) }).parse(request.body); const result = parseImport(body.content, body.filename); return { ...result, preview: result.records.slice(0, 10) }; });
  app.post("/api/imports/manual", async (request) => { const body = z.object({ input: z.string().min(1).max(50_000) }).parse(request.body); return parseManualUsernames(body.input); });
  app.post("/api/imports", async (request) => {
    const body = z.object({ filename: z.string().min(1), content: z.string().max(10_000_000) }).parse(request.body); const parsed = parseImport(body.content, body.filename); const job = { id: crypto.randomUUID(), filename: body.filename, status: "PROCESSING" as const, totalRecords: parsed.records.length, importedRecords: 0, duplicateRecords: parsed.duplicateRecords, invalidRecords: parsed.invalidRecords.length, errors: parsed.invalidRecords, createdAt: new Date().toISOString() };
    store.imports.set(job.id, job); for (const record of parsed.records) { if (store.listContacts().some((contact) => contact.instagramUsername === record.username)) { job.duplicateRecords++; continue; } const contact = store.addContact({ instagramUsername: record.username, displayName: record.displayName, biography: record.biography, profileUrl: record.profileUrl, accountType: "UNKNOWN", followerStatus: "KNOWN", dataSource: record.source }); await store.persistContact(contact); job.importedRecords++; }
    const completed = { ...job, status: "COMPLETED" as const, completedAt: new Date().toISOString() }; store.imports.set(job.id, completed); return { job: completed, preview: parsed.records.slice(0, 10) };
  });
  app.get("/api/imports", async () => ({ data: [...store.imports.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
  app.post("/api/analyses", async (request) => {
    const body = z.object({ contactIds: z.array(z.string()).min(1).max(500) }).parse(request.body); const contacts = body.contactIds.map((id) => store.contacts.get(id)).filter((value): value is Contact => Boolean(value));
    const job = { id: crypto.randomUUID(), status: "PROCESSING" as const, totalContacts: contacts.length, processedContacts: 0, failedContacts: 0, tokenUsage: 0, estimatedCostUsd: 0, actualCostUsd: 0, errors: [] as unknown[], createdAt: new Date().toISOString() }; store.analyses.set(job.id, job);
    for (const contact of contacts) try { const enriched = await analyze(contact); job.processedContacts++; job.tokenUsage += enriched.assessment!.usage.inputTokens + enriched.assessment!.usage.outputTokens; job.estimatedCostUsd += enriched.assessment!.usage.estimatedCostUsd; } catch (error) { job.failedContacts++; job.errors.push({ contactId: contact.id, message: error instanceof Error ? error.message : "Falha desconhecida" }); }
    const completed = { ...job, status: job.failedContacts ? "COMPLETED" as const : "COMPLETED" as const, completedAt: new Date().toISOString() }; store.analyses.set(job.id, completed); return completed;
  });
  app.post("/api/analyses/:id/cancel", async (request, reply) => { const job = store.analyses.get((request.params as { id: string }).id); if (!job) return reply.code(404).send({ error: "Processamento não encontrado" }); if (job.status === "COMPLETED") return reply.code(409).send({ error: "Processamento já concluído" }); job.status = "CANCELLED"; return job; });
  app.get("/api/analyses", async () => ({ data: [...store.analyses.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
  app.patch("/api/contacts/:id/pipeline", async (request, reply) => { const values = z.object({ status: z.enum(pipelineStatuses).optional(), priority: z.number().int().min(0).max(3).optional(), personalNotes: z.string().max(5000).optional(), nextFollowUpAt: z.string().datetime().nullable().optional(), lastContactedAt: z.string().datetime().nullable().optional() }).parse(request.body); const contact = store.contacts.get((request.params as { id: string }).id); if (!contact) return reply.code(404).send({ error: "Contato não encontrado" }); Object.assign(contact.pipeline, values, { updatedAt: new Date().toISOString() }); if (values.personalNotes !== undefined) contact.personalNotes = values.personalNotes; await store.persistContact(contact); const active = store.goals.find((goal) => goal.active)!; return contactView(contact, active.goals, active.weights); });
  app.get("/api/board", async () => { const active = store.goals.find((goal) => goal.active)!; return Object.fromEntries(pipelineStatuses.map((status) => [status, store.listContacts().filter((contact) => contact.pipeline.status === status).map((contact) => contactView(contact, active.goals, active.weights))])); });
  app.get("/api/recommendations", async () => { const active = store.goals.find((goal) => goal.active)!; const contacts = store.listContacts().filter((contact) => contact.assessment).map((contact) => contactView(contact, active.goals, active.weights)).sort((a, b) => (b.ranking?.finalScore ?? 0) - (a.ranking?.finalScore ?? 0)); return { data: contacts, grouped: Object.fromEntries(["FOUNDER", "RECRUITER", "TECH_LEADER", "ENGINEER", "CREATOR", "COLLABORATOR"].map((category) => [category, contacts.filter((contact) => contact.assessment?.category === category)])) }; });
  app.get("/api/settings", async () => { const integration = await instagramIntegration(); return { demoMode: config.DEMO_MODE, goals: store.goals, integration: integration.status, capabilities: await integration.provider.getCapabilities(), ai: { configured: Boolean(config.ANTHROPIC_API_KEY), model: config.ANTHROPIC_MODEL, activeEngine: config.DEMO_MODE || !config.ANTHROPIC_API_KEY ? "demo" : "claude" } }; });
  app.put("/api/settings/goals", async (request) => { const body = z.object({ name: z.string().min(1).max(80), goals: z.array(z.enum(["FOUNDERS", "RECRUITERS", "SENIOR_ENGINEERS", "TECH_LEADERS", "TECH_CREATORS", "COLLABORATION"])).min(1), weights: scoringWeightsSchema }).parse(request.body); const configGoal = { id: crypto.randomUUID(), ...body, active: true }; store.goals.forEach((goal) => { goal.active = false; }); store.goals.push(configGoal); return configGoal; });
  return app;
}
