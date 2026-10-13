import { z } from "zod";

const boolean = z.enum(["true", "false"]).optional().transform((value) => value !== "false");
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEMO_MODE: boolean,
  API_PORT: z.coerce.number().int().positive().default(3001),
  REDIS_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1).optional(),
  INSTAGRAM_ACCOUNT_ID: z.string().min(1).optional(),
  INSTAGRAM_GRAPH_API_VERSION: z.string().default("v24.0"),
  INTEGRATION_CREDENTIAL_ENCRYPTION_KEY: z.string().min(32).optional(),
  NEXO_INTEGRATION_SETTINGS_PATH: z.string().min(1).optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  ANALYSIS_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(25)
});
export type AppConfig = z.infer<typeof envSchema>;
export function loadConfig(input: Record<string, string | undefined> = process.env): AppConfig { return envSchema.parse(input); }
