# Arquitetura

```text
Next.js (apps/web) ── REST ──> Fastify (apps/api) ──> PostgreSQL
                                      │                  │
                                      ├── BullMQ/Redis ── worker
                                      ├── Claude (opcional, servidor)
                                      └── Meta Graph API (opcional, oficial)
```

O monorepo pnpm separa `importers`, `instagram`, `ai`, `scoring`, `shared`, `database` e `config`. O pacote `database` mantém o schema e as migrações Prisma; o `PostgresStore` da API usa esse mesmo contrato para leitura/escrita. Essa fronteira impede que uma UI acesse credenciais ou faça uma chamada de enriquecimento diretamente.

## Fluxo

1. O importador normaliza `@username`, deduplica dentro do arquivo e a API deduplica novamente contra o armazenamento.
2. Um contato começa em `DISCOVERED`; importação não afirma nada sobre biografia, profissão ou status de seguidor além do que a fonte forneceu.
3. Dados manuais e resultados autorizados registram `ContactEvidence`.
4. A análise usa somente esses dados e valida a resposta do Claude com Zod.
5. O motor `scoring` calcula uma prioridade separada e reproduzível; a IA não decide o score final.
6. O pipeline registra o relacionamento, sem envio automático de mensagens.

## Processamento em lote

Em produção, a API cria uma `AnalysisJob` e coloca lotes no BullMQ. O worker usa concorrência e tamanho de lote configuráveis, limite de taxa, quatro tentativas com backoff exponencial, atualização de progresso, custos/tokens e recuperação parcial. Um job cancelado não inicia novos itens. O modo demonstração processa sincronicamente para funcionar sem Redis; não substitui o worker de produção.

## Autenticação e implantação

A primeira abertura passa por onboarding: a integração oficial já configurada é a rota principal e a demonstração com perfis fictícios só é carregada após escolha explícita. A integração guarda a conta conectada e as capacidades detectadas, mas a exportação de seguidores continua sendo necessária porque a API oficial não os enumera. A camada atual de demo fixa uma sessão de demonstração. Antes de uma implantação multiusuário, conecte um provedor de autenticação com sessões HTTP-only, hash de senha/OIDC, isolamento obrigatório por `userId`, CSRF e rate limits de borda. O esquema já inclui `User`, `ApplicationSetting`, `AuditLog` e todas as entidades sob um proprietário; o armazenamento de produção usa um proprietário local até essa camada de login ser conectada.
