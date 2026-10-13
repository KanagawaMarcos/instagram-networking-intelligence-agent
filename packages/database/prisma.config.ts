import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx src/seed.ts" },
  // A URL real é obrigatória para migrate/deploy; este fallback permite gerar
  // o cliente em CI e no modo demo sem tentar abrir uma conexão.
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/instagram_networking?schema=public" }
});
