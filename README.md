# Nexo

Nexo is a professional networking intelligence platform for contacts you import from Instagram. It turns an authorized list of usernames into an organized networking workflow: enrich available professional context, assess relevance, prioritize opportunities, and keep track of relationship follow-ups.

> Status: functional MVP with a fully self-contained demo mode. The product interface is intentionally in Brazilian Portuguese.

## What it does

Nexo helps you identify people worth getting to know professionally without resorting to bulk outreach or fabricated profile data.

```text
Import contacts → add authorized context → analyze → prioritize → manage the relationship pipeline
```

## MVP capabilities

- Idempotent CSV, JSON, common Instagram export, and manual username imports.
- Brazilian Portuguese dashboard with searchable contacts, contact details, networking opportunities, settings, and a relationship pipeline.
- Manual data enrichment with per-field provenance/evidence and contact deletion.
- Claude-powered structured assessments when configured, plus a deterministic local demo engine when it is not.
- An explainable, configurable scoring engine separate from the AI model.
- An official Instagram Graph API adapter that reports each capability as available, unavailable, unauthorized, unsupported, failed, or rate-limited.
- BullMQ queue definitions with exponential retries, configurable concurrency, rate limits, and partial-failure recovery.
- Fictional demo data: CTO, Staff Engineer, founder, recruiter, engineering manager, developer, technology creator, and a profile with missing information.

## Try it in three minutes

1. Start the project with `pnpm dev` and open `http://localhost:3000`.
2. On first launch, connect an already-authorized official Meta integration, or explicitly choose **Abrir demonstração** to use fictional data.
3. Import your follower export in **Importar**, then validate and confirm it.
4. Go to **Contatos**, select one or more people, then choose **Analisar selecionados**.
5. Open a contact to review evidence, score, opportunities, and the suggested first message. Copy it only after reviewing it.
6. Save the contact to the **Pipeline** and move it through your relationship stages.

Demo mode is opt-in and ships with fictional profiles. It is safe for presentations: it does not call Meta or Claude, and it never sends messages.

## Quick start

Prerequisites: Node.js 24+, pnpm 11+, and Docker (optional for demo mode).

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Open `http://localhost:3000`. With `DEMO_MODE=true`, the API starts at `http://localhost:3001`. The first-run onboarding does not load fictional contacts automatically: choose **Abrir demonstração** to seed its local sample data. No API keys, PostgreSQL, or Redis are required to explore the product.

For persistent infrastructure:

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

With `DEMO_MODE=false`, the API persists contacts, evidence, pipeline state, and assessments in PostgreSQL. Redis powers production batch processing; demo mode does not need either service.

## Architecture

| Layer | Stack | Responsibility |
| --- | --- | --- |
| Web | Next.js App Router, TypeScript, Tailwind, TanStack Query/Table | Dashboard, imports, contacts, opportunities, and pipeline. |
| API | Fastify, Zod | REST API, validation, manual data, assessments, and capability checks. |
| Data | PostgreSQL, Prisma schema/migrations | Contacts, evidence, assessments, pipeline, jobs, and audit records. |
| Processing | Redis and BullMQ | Batch analysis, progress, backoff, and partial recovery. |
| AI | Claude or demo engine | Structured extraction and contextual messaging; final scoring is deterministic. |

## Commands

```bash
pnpm build       # TypeScript validation across all workspaces
pnpm test        # unit and integration tests
pnpm test:e2e    # Playwright end-to-end scenario
pnpm lint
pnpm db:generate # only needed when consuming a generated PrismaClient
pnpm db:migrate
pnpm db:seed
```

## Configuration

Secrets remain server-side in `.env`. Set `ANTHROPIC_API_KEY` and disable `DEMO_MODE` to use Claude. For Meta, configure an eligible Business/Creator account, an access token, account ID, and approved permissions. The settings screen checks each API capability independently—it never assumes a configured integration is authorized.

| Variable | Use |
| --- | --- |
| `DEMO_MODE=true` | Recommended default for trying the product without external services. |
| `DATABASE_URL` | Required for persistence outside demo mode. |
| `REDIS_URL` | Required by the production BullMQ worker. |
| `ANTHROPIC_API_KEY` | Enables server-side Claude assessments. |
| `ANTHROPIC_MODEL` | Selects the Claude model. |
| `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_ACCOUNT_ID` | Enables eligible official Meta capabilities only. |

## Privacy and platform limits

- The official Instagram API is not a complete follower-enumeration endpoint. Follower lists must be imported by the user.
- Nexo does not retrieve arbitrary biographies. Official discovery, when available, is limited to eligible professional accounts and the applicable permissions.
- No scraping, private APIs, browser automation, proxy rotation, CAPTCHA bypassing, or account rotation is used.
- The MVP only generates, reviews, edits, and copies messages. It never sends Instagram DMs automatically.
- Demo mode is intentionally in-memory and opt-in; outside demo mode, data is persisted in PostgreSQL.

## Quality

```bash
pnpm test
pnpm lint
pnpm build
pnpm test:e2e
```

The suite covers username normalization, importing, deduplication, export parsing, scoring, AI output validation, missing information, Instagram capabilities and rate limits, retry policy, and REST workflows. The Playwright scenario walks through import, analysis, assessment review, pipeline save, and message copying with mocked integrations.

For architecture, database, AI classification, security, deployment, LGPD considerations, and Instagram integration research, see [docs](docs/).
