# Nexo — Instagram Networking Intelligence Agent

Uma plataforma de inteligência para networking profissional a partir de contatos do Instagram fornecidos pelo usuário. Ela importa usernames, permite enriquecimento manual autorizado, classifica contexto profissional disponível, calcula uma prioridade explicável e acompanha relações — sem scraping, sem automação de DMs e sem inventar dados.

> Status: MVP funcional com modo demonstração. Interface e documentação em português do Brasil.

## Para que serve

O Nexo transforma uma lista de contatos que você já possui em uma fila de networking profissional mais fácil de administrar. Em vez de abordar pessoas em massa, o produto ajuda a encontrar contexto disponível, organizar oportunidades e preparar uma conversa breve baseada em evidências reais.

```text
Importar contatos → complementar informação autorizada → analisar → priorizar → acompanhar no pipeline
```

## O que funciona no MVP

- Importação idempotente de CSV, JSON, formatos comuns de exportação do Instagram e usernames manuais.
- Dashboard em português do Brasil, lista pesquisável e filtrável, detalhes do contato, quadro de pipeline, oportunidades e configurações.
- Dados manuais com proveniência/evidência e exclusão de contatos.
- Avaliação estruturada por Claude quando há chave configurada; motor determinístico de demonstração quando não há.
- Ranking separado da IA, com pesos configuráveis e explicação por fator.
- Adaptador oficial Instagram Graph API que declara cada capacidade como disponível, indisponível, não autorizada, não suportada, com erro ou limitada por taxa.
- Fila BullMQ com tentativas exponenciais, concorrência e limite configuráveis. No modo demo, a API executa o pequeno lote localmente para não exigir Redis.
- Perfis totalmente fictícios de CTO, Staff Engineer, founder, recrutador, engineering manager, desenvolvedor, criadora e perfil sem informação.

## Teste em três minutos

1. Inicie o projeto com `pnpm dev` e abra `http://localhost:3000`.
2. Em **Importar**, valide o CSV de exemplo já preenchido e confirme a importação.
3. Em **Contatos**, selecione um ou mais perfis e escolha **Analisar selecionados**.
4. Abra um contato para revisar evidências, score, oportunidades e a mensagem sugerida; copie a mensagem somente depois de revisá-la.
5. Salve o perfil no **Pipeline** e avance-o pelas etapas de relacionamento.

O modo demonstração já inclui perfis fictícios. Ele é seguro para apresentações: não chama Meta, Claude nem envia mensagens.

## Início rápido

Pré-requisitos: Node.js 24+, pnpm 11+ e Docker (opcional para o modo demonstração).

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Abra `http://localhost:3000`. Com `DEMO_MODE=true`, a API inicia em `http://localhost:3001` e carrega dados fictícios; não são necessárias chaves, Postgres nem Redis para experimentar o fluxo.

Para infraestrutura persistente:

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Ao usar `DEMO_MODE=false`, a API persiste contatos, evidências, pipeline e avaliações no PostgreSQL. Redis é usado pelo worker para processamentos em lote; o modo demonstração dispensa os dois serviços.

## Arquitetura

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Web | Next.js App Router, TypeScript, Tailwind, TanStack Query/Table | Dashboard, importação, contatos, oportunidades e pipeline. |
| API | Fastify, Zod | REST, validação, dados manuais, análise e autorização de capabilities. |
| Dados | PostgreSQL, schema/migrations Prisma | Contatos, evidências, avaliações, pipeline, jobs e auditoria. |
| Processamento | Redis e BullMQ | Análise em lote, progresso, backoff e recuperação parcial. |
| IA | Claude ou motor demo | Extração estruturada e mensagem contextual; score final é determinístico. |

## Comandos

```bash
pnpm build       # valida TypeScript em todos os pacotes
pnpm test        # testes unitários e de integração
pnpm test:e2e    # cenário Playwright (requer navegadores instalados)
pnpm lint
pnpm db:generate # necessário somente para consumir PrismaClient gerado
pnpm db:migrate
pnpm db:seed
```

## Configuração de integrações

As chaves vivem somente em `.env` no servidor. Preencha `ANTHROPIC_API_KEY` e desative `DEMO_MODE` para usar Claude. Para Meta, configure uma conta Business/Creator elegível, token, ID da conta e as permissões aprovadas. O painel mostra a checagem individual de capacidades; a aplicação não trata uma integração configurada como automaticamente autorizada.

Veja a documentação em [docs](docs/architecture.md): arquitetura, banco, classificação, segurança, integração Instagram e implantação.

### Variáveis principais

| Variável | Quando usar |
| --- | --- |
| `DEMO_MODE=true` | Padrão recomendado para experimentar sem serviços externos. |
| `DATABASE_URL` | Necessária para persistência fora do modo demo. |
| `REDIS_URL` | Necessária para o worker BullMQ de produção. |
| `ANTHROPIC_API_KEY` | Habilita análise por Claude somente no servidor. |
| `ANTHROPIC_MODEL` | Escolhe o modelo Claude. |
| `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_ACCOUNT_ID` | Habilitam apenas capabilities oficiais elegíveis da Meta. |

## Limitações importantes

- A API oficial não é um endpoint de enumeração completa de seguidores. A lista deve ser importada pelo usuário.
- Não são buscadas biografias arbitrárias. Descoberta oficial, quando disponível, restringe-se a contas profissionais elegíveis e permissões/caminho de autenticação adequados.
- Não há scraping, APIs privadas, automação de navegador, proxies, bypass de CAPTCHA ou rotação de contas.
- O MVP só gera, permite editar e copiar mensagens; nunca envia DMs automaticamente.
- O modo demo deliberadamente usa memória para poder iniciar sem infraestrutura; fora dele, os dados são persistidos no PostgreSQL.

## Desenvolvimento e qualidade

```bash
pnpm test
pnpm lint
pnpm build
pnpm test:e2e
```

Os testes cobrem normalização, importação, deduplicação, exportação, ranking, saída de IA, informações ausentes, capabilities e rate limit do Instagram, política de retries e workflow REST. O cenário Playwright percorre importação, análise, detalhe, pipeline e cópia de mensagem com integrações simuladas.

Para detalhes de privacidade, LGPD, implantação e limites da integração Instagram, consulte a pasta [docs](docs/).
