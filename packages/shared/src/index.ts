import { z } from "zod";

export const professionalCategories = [
  "TECH_LEADER", "FOUNDER", "RECRUITER", "ENGINEER", "CREATOR", "EXECUTIVE", "COLLABORATOR", "UNKNOWN"
] as const;
export const pipelineStatuses = [
  "DISCOVERED", "ANALYZED", "SHORTLISTED", "READY_TO_CONTACT", "CONTACTED", "REPLIED", "RELATIONSHIP_BUILDING", "CONNECTED", "ARCHIVED"
] as const;
export const networkingGoals = [
  "FOUNDERS", "RECRUITERS", "SENIOR_ENGINEERS", "TECH_LEADERS", "TECH_CREATORS", "COLLABORATION"
] as const;

export type ProfessionalCategory = (typeof professionalCategories)[number];
export type PipelineStatus = (typeof pipelineStatuses)[number];
export type NetworkingGoal = (typeof networkingGoals)[number];

export const usernameSchema = z.string().trim().transform((value, ctx) => {
  const normalized = value.replace(/^@+/, "").trim().toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
    ctx.addIssue({ code: "custom", message: "Nome de usuário do Instagram inválido" });
    return z.NEVER;
  }
  return normalized;
});

export const evidenceSchema = z.object({
  field: z.string().min(1),
  observation: z.string().min(1),
  sourceUrl: z.string().url().optional()
});

export const assessmentSchema = z.object({
  category: z.enum(professionalCategories),
  professionalSummary: z.string().min(1),
  profession: z.string().nullable(),
  jobTitle: z.string().nullable(),
  company: z.string().nullable(),
  topics: z.array(z.string()).max(8),
  potentialOpportunities: z.array(z.string()).max(6),
  relevanceScore: z.number().int().min(0).max(100),
  confidenceScore: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidence: z.array(evidenceSchema).max(12),
  suggestedApproach: z.string().min(1),
  suggestedMessage: z.string().min(1).max(800),
  missingInformation: z.array(z.string()).max(10)
});
export type Assessment = z.infer<typeof assessmentSchema>;

export const importRecordSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().max(160).optional(),
  biography: z.string().trim().max(3000).optional(),
  profileUrl: z.string().url().optional(),
  source: z.string().min(1).max(80)
});
export type ImportRecord = z.infer<typeof importRecordSchema>;

export const contactInputSchema = z.object({
  displayName: z.string().trim().max(160).nullable().optional(),
  biography: z.string().trim().max(3000).nullable().optional(),
  profession: z.string().trim().max(160).nullable().optional(),
  jobTitle: z.string().trim().max(160).nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  professionalInterests: z.array(z.string().trim().max(80)).max(12).optional(),
  profileUrl: z.string().url().nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  evidenceUrl: z.string().url().nullable().optional()
});

export const scoringWeightsSchema = z.object({
  professionalRelevance: z.number().min(0).max(1),
  collaborationValue: z.number().min(0).max(1),
  interactionEvidence: z.number().min(0).max(1),
  informationQuality: z.number().min(0).max(1)
}).refine((weights) => Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 1) < 0.001, {
  message: "Os pesos devem totalizar 1"
});
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;
export const defaultScoringWeights: ScoringWeights = {
  professionalRelevance: 0.35,
  collaborationValue: 0.30,
  interactionEvidence: 0.20,
  informationQuality: 0.15
};

export function normalizeUsername(value: string): string | null {
  const result = usernameSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function safeText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
