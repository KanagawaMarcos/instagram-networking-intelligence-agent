import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "prisma", "migrations");
const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/instagram_networking?schema=public";
const client = new Client({ connectionString });

await client.connect();
await client.query('CREATE TABLE IF NOT EXISTS "_ina_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now())');
const migrationNames = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
for (const name of migrationNames) {
  const alreadyApplied = await client.query('SELECT 1 FROM "_ina_migrations" WHERE "name" = $1', [name]);
  if (alreadyApplied.rowCount) continue;
  const migration = await readFile(join(root, name, "migration.sql"), "utf8");
  const existingSchema = await client.query("SELECT to_regclass('public.\"Contact\"') AS contact_table");
  if (existingSchema.rows[0]?.contact_table && name.endsWith("_init")) {
    await client.query('INSERT INTO "_ina_migrations" ("name") VALUES ($1)', [name]);
    console.info(`Migração ${name} adotada: schema inicial já existe.`);
    continue;
  }
  await client.query("BEGIN");
  try {
    await client.query(migration);
    await client.query('INSERT INTO "_ina_migrations" ("name") VALUES ($1)', [name]);
    await client.query("COMMIT");
    console.info(`Migração ${name} aplicada.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
await client.end();
