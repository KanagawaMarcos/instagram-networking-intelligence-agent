# Banco de dados

O schema Prisma em `packages/database/prisma/schema.prisma` usa PostgreSQL e define constraints/índices para os acessos do produto.

| Entidade | Papel |
| --- | --- |
| `Contact` | Username único por usuário e contexto profissional autorizado. |
| `ContactEvidence` | Proveniência por campo, valor e data de observação. |
| `ContactInteraction` | Interações autorizadas; comentários não alteram `followerStatus`. |
| `NetworkingAssessment` | Saída validada, evidências, versão do modelo e hash de entrada. |
| `NetworkingPipeline` | Uma etapa por contato, prioridade, notas e follow-up. |
| `ImportJob` / `AnalysisJob` | Progresso, erro, cancelamento, tokens e custo. |
| `NetworkingGoalConfig` | Objetivos e pesos por usuário. |
| `AuditLog` | Eventos sensíveis de mudança/exclusão. |

Execute `pnpm db:migrate` com `DATABASE_URL` apontando para PostgreSQL. O comando aplica os SQLs versionados em `prisma/migrations` e registra a execução em `_ina_migrations`, sem depender de um binário nativo durante desenvolvimento. `pnpm db:generate` gera o cliente Prisma quando o engine Prisma estiver disponível no ambiente de build. A chave única `(userId, instagramUsername)` torna a importação idempotente. Exclusões em `Contact` fazem cascade em evidências, interações, avaliações e pipeline para atender pedidos de eliminação de dados.

Em NixOS, a versão do Prisma usada no ambiente de desenvolvimento não publicou o schema engine para o alvo `linux-nixos`; por isso a migração SQL é o caminho verificado localmente. Em uma imagem Linux suportada pelo Prisma, `pnpm db:generate` segue sendo o comando esperado para gerar o client.

O modo demo não conecta ao banco por decisão de produto: é efêmero e evita que dados de exemplo sejam persistidos por acidente.

Com `DEMO_MODE=false`, a API inicializa `PostgresStore`, hidrata contatos/pipeline/evidências/interações/avaliação mais recente e persiste importações, edições, análises, movimentações e exclusões. O teste local verificou uma importação, reinicialização da API e leitura do mesmo contato antes de removê-lo ao fim do teste.
