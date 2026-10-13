# Implantação

## Local

1. Copie `.env.example` para `.env`.
2. Use `DEMO_MODE=true` para rodar sem integrações.
3. Para serviços persistentes, `docker compose up -d`, então `pnpm db:generate`, `pnpm db:migrate` e `pnpm dev`.

## Produção

Execute web, API e worker como processos separados. Use PostgreSQL gerenciado com backup, Redis gerenciado, `NODE_ENV=production`, TLS, monitoramento, logs estruturados e migrações em etapa de release. Faça health checks em `/health` e escale workers conforme os limites documentados das APIs.

Defina `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, a chave de criptografia, `ANTHROPIC_API_KEY` e as credenciais Meta no cofre de segredos da plataforma. Não habilite demo em produção. Restrinja CORS ao domínio da web e implemente a autenticação de produção descrita em `security.md`.

## Meta

Crie um app Meta e conecte uma conta profissional elegível. Os escopos e a revisão dependem das capacidades escolhidas. Configure callback de OAuth, URL de desautorização e URL de exclusão de dados quando o app for usado por pessoas externas ao time. Rode a verificação de capabilities após conectar: ela é a fonte de verdade operacional.
