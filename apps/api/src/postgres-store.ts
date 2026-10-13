import { Pool } from "pg";
import { MemoryStore, type Contact, type Evidence, type Interaction, type Pipeline, type StoredAssessment } from "./store.js";

const OWNER_ID = "local-owner";
const iso = (value: Date | string | null | undefined) => value ? new Date(value).toISOString() : undefined;
const parseJson = (value: unknown) => typeof value === "string" ? JSON.parse(value) : value;

/** PostgreSQL-backed repository used outside DEMO_MODE. It follows the Prisma schema
 * and migrations directly so development remains usable on Nix hosts where Prisma's
 * native schema engine is unavailable. */
export class PostgresStore extends MemoryStore {
  private constructor(private readonly pool: Pool) { super(); }
  static async create(connectionString: string) { const store = new PostgresStore(new Pool({ connectionString })); await store.initialize(); return store; }
  private async initialize() {
    await this.pool.query('INSERT INTO "User" ("id", "email", "passwordHash", "updatedAt") VALUES ($1, $2, $3, NOW()) ON CONFLICT ("id") DO NOTHING', [OWNER_ID, "owner@local.invalid", "external-auth-required"]);
    const contacts = await this.pool.query(`SELECT c.*, p."status" AS pipeline_status, p."priority" AS pipeline_priority, p."personalNotes" AS pipeline_notes, p."lastContactedAt" AS pipeline_last_contacted, p."nextFollowUpAt" AS pipeline_next_follow_up, p."updatedAt" AS pipeline_updated
      FROM "Contact" c LEFT JOIN "NetworkingPipeline" p ON p."contactId" = c."id" WHERE c."userId" = $1`, [OWNER_ID]);
    for (const row of contacts.rows) {
      const pipeline: Pipeline = { status: row.pipeline_status ?? "DISCOVERED", priority: row.pipeline_priority ?? 0, personalNotes: row.pipeline_notes ?? undefined, lastContactedAt: iso(row.pipeline_last_contacted), nextFollowUpAt: iso(row.pipeline_next_follow_up), updatedAt: iso(row.pipeline_updated) ?? iso(row.updatedAt)! };
      this.contacts.set(row.id, { id: row.id, instagramUsername: row.instagramUsername, instagramUserId: row.instagramUserId ?? undefined, displayName: row.displayName ?? undefined, biography: row.biography ?? undefined, profession: row.profession ?? undefined, jobTitle: row.jobTitle ?? undefined, company: row.company ?? undefined, professionalInterests: row.professionalInterests ?? [], accountType: row.accountType, profileUrl: row.profileUrl ?? undefined, followerStatus: row.followerStatus, dataSource: row.dataSource, profileLastCheckedAt: iso(row.profileLastCheckedAt), personalNotes: row.personalNotes ?? undefined, createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)!, pipeline, evidence: [], interactions: [] });
    }
    const ids = [...this.contacts.keys()];
    if (!ids.length) return;
    const [evidence, interactions, assessments] = await Promise.all([
      this.pool.query('SELECT * FROM "ContactEvidence" WHERE "contactId" = ANY($1::text[]) ORDER BY "observedAt" ASC', [ids]),
      this.pool.query('SELECT * FROM "ContactInteraction" WHERE "contactId" = ANY($1::text[]) ORDER BY "occurredAt" ASC', [ids]),
      this.pool.query('SELECT DISTINCT ON ("contactId") * FROM "NetworkingAssessment" WHERE "contactId" = ANY($1::text[]) ORDER BY "contactId", "analyzedAt" DESC', [ids])
    ]);
    for (const row of evidence.rows) { const contact = this.contacts.get(row.contactId); if (contact) contact.evidence.push({ id: row.id, sourceType: row.sourceType, sourceUrl: row.sourceUrl ?? undefined, fieldName: row.fieldName, observedValue: row.observedValue, observedAt: iso(row.observedAt)! }); }
    for (const row of interactions.rows) { const contact = this.contacts.get(row.contactId); if (contact) contact.interactions.push({ id: row.id, interactionType: row.interactionType, externalId: row.externalId ?? undefined, content: row.content ?? undefined, occurredAt: iso(row.occurredAt)! }); }
    for (const row of assessments.rows) {
      const contact = this.contacts.get(row.contactId); if (!contact) continue;
      contact.assessment = { id: row.id, category: row.category, relevanceScore: row.relevanceScore, confidenceScore: row.confidenceScore, professionalSummary: row.professionalSummary, rationale: row.rationale, opportunities: row.opportunities, potentialOpportunities: row.opportunities, suggestedApproach: row.suggestedApproach, suggestedMessage: row.suggestedMessage, evidence: parseJson(row.evidence), topics: row.topics ?? [], missingInformation: row.missingInformation ?? [], profession: contact.profession ?? null, jobTitle: contact.jobTitle ?? null, company: contact.company ?? null, modelVersion: row.modelVersion, inputHash: row.inputHash, analyzedAt: iso(row.analyzedAt)!, scoreExplanation: [], usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 } } as StoredAssessment;
    }
  }
  override async persistContact(contact: Contact) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`INSERT INTO "Contact" ("id","userId","instagramUsername","instagramUserId","displayName","biography","profession","jobTitle","company","professionalInterests","accountType","profileUrl","followerStatus","dataSource","profileLastCheckedAt","personalNotes","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::\"AccountType\",$12,$13::\"FollowerStatus\",$14,$15,$16,$17,$18) ON CONFLICT ("userId","instagramUsername") DO UPDATE SET "instagramUserId"=EXCLUDED."instagramUserId","displayName"=EXCLUDED."displayName","biography"=EXCLUDED."biography","profession"=EXCLUDED."profession","jobTitle"=EXCLUDED."jobTitle","company"=EXCLUDED."company","professionalInterests"=EXCLUDED."professionalInterests","accountType"=EXCLUDED."accountType","profileUrl"=EXCLUDED."profileUrl","followerStatus"=EXCLUDED."followerStatus","dataSource"=EXCLUDED."dataSource","profileLastCheckedAt"=EXCLUDED."profileLastCheckedAt","personalNotes"=EXCLUDED."personalNotes","updatedAt"=EXCLUDED."updatedAt"`, [contact.id, OWNER_ID, contact.instagramUsername, contact.instagramUserId ?? null, contact.displayName ?? null, contact.biography ?? null, contact.profession ?? null, contact.jobTitle ?? null, contact.company ?? null, contact.professionalInterests, contact.accountType, contact.profileUrl ?? null, contact.followerStatus, contact.dataSource, contact.profileLastCheckedAt ?? null, contact.personalNotes ?? null, contact.createdAt, contact.updatedAt]);
      await client.query(`INSERT INTO "NetworkingPipeline" ("id","contactId","status","priority","personalNotes","lastContactedAt","nextFollowUpAt","createdAt","updatedAt") VALUES ($1,$2,$3::\"PipelineStatus\",$4,$5,$6,$7,NOW(),$8) ON CONFLICT ("contactId") DO UPDATE SET "status"=EXCLUDED."status","priority"=EXCLUDED."priority","personalNotes"=EXCLUDED."personalNotes","lastContactedAt"=EXCLUDED."lastContactedAt","nextFollowUpAt"=EXCLUDED."nextFollowUpAt","updatedAt"=EXCLUDED."updatedAt"`, [`pipeline-${contact.id}`, contact.id, contact.pipeline.status, contact.pipeline.priority, contact.pipeline.personalNotes ?? null, contact.pipeline.lastContactedAt ?? null, contact.pipeline.nextFollowUpAt ?? null, contact.pipeline.updatedAt]);
      for (const evidence of contact.evidence) await client.query(`INSERT INTO "ContactEvidence" ("id","contactId","sourceType","sourceUrl","fieldName","observedValue","observedAt") VALUES ($1,$2,$3::\"EvidenceSourceType\",$4,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, [evidence.id, contact.id, evidence.sourceType, evidence.sourceUrl ?? null, evidence.fieldName, evidence.observedValue, evidence.observedAt]);
      for (const interaction of contact.interactions) await client.query(`INSERT INTO "ContactInteraction" ("id","contactId","interactionType","externalId","content","occurredAt") VALUES ($1,$2,$3::\"InteractionType\",$4,$5,$6) ON CONFLICT ("id") DO NOTHING`, [interaction.id, contact.id, interaction.interactionType, interaction.externalId ?? null, interaction.content ?? null, interaction.occurredAt]);
      if (contact.assessment) { const a = contact.assessment; await client.query(`INSERT INTO "NetworkingAssessment" ("id","contactId","category","relevanceScore","confidenceScore","professionalSummary","rationale","opportunities","suggestedApproach","suggestedMessage","evidence","topics","missingInformation","modelVersion","inputHash","analyzedAt") VALUES ($1,$2,$3::\"ProfessionalCategory\",$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT ("id") DO NOTHING`, [a.id, contact.id, a.category, a.relevanceScore, a.confidenceScore, a.professionalSummary, a.rationale, a.potentialOpportunities, a.suggestedApproach, a.suggestedMessage, JSON.stringify(a.evidence), a.topics, a.missingInformation, a.modelVersion, a.inputHash, a.analyzedAt]); }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  override async removeContact(id: string) { const removed = this.deleteContact(id); if (removed) await this.pool.query('DELETE FROM "Contact" WHERE "id" = $1 AND "userId" = $2', [id, OWNER_ID]); return removed; }
  override async close() { await this.pool.end(); }
}
