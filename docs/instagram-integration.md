# Integração com Instagram: limites e decisão

## Decisão do produto

O Nexo implementa seu próprio adaptador para a Instagram Graph API (`packages/instagram`). Ele não usa API privada, scraping, sessão de navegador, proxy, CAPTCHA ou rotação de conta. A lista de seguidores entra por exportação/CSV/JSON/manualmente, pois a API oficial não fornece uma enumeração completa de seguidores para este caso de uso.

Cada capability é verificada de forma independente e devolve um dos estados: `AVAILABLE`, `UNAVAILABLE`, `UNAUTHORIZED`, `UNSUPPORTED_ACCOUNT`, `API_ERROR` ou `RATE_LIMITED`. Portanto, uma conta conectada não implica descoberta, comentários, insights ou metadata de mensagem disponíveis.

| Necessidade | Implementado | Limite |
| --- | --- | --- |
| Dados da conta conectada | Sim | Exige token/conta profissional compatíveis. |
| Insights relevantes | Sim, por capability | Métricas, escopos e elegibilidade variam. |
| Comentários de mídia própria | Sim, por capability | Não são prova de `followerStatus`. |
| Descoberta profissional autorizada | Sim | Apenas contas Business/Creator elegíveis; não há perfil pessoal/privado arbitrário. |
| Metadados de mensagem autorizados | Sim, por capability | Depende de permissão/revisão/janela aplicável. |
| Listar todos seguidores / bios arbitrárias | Não | Não suportado oficialmente para este produto. |
| Enviar DM | Não | O MVP só gera/copia mensagem. |

## OAuth e configuração

Use uma conta Business/Creator, app Meta, fluxo OAuth documentado e token de longa duração no servidor. O onboarding e a página **Configurações** explicam onde obter os dois valores: em [Meta for Developers](https://developers.facebook.com/apps/) crie/selecione a app e adicione Instagram API; gere o token pelo fluxo apropriado ou [Graph API Explorer](https://developers.facebook.com/tools/explorer/); obtenha o ID numérico retornado pelo seu fluxo. No Facebook Login ele é `instagram_business_account.id` da Página vinculada; no Instagram Login é o `id` retornado para o usuário Instagram. A [Instagram Platform](https://developers.facebook.com/docs/instagram-platform/) documenta as duas variações.

Os valores podem ser fornecidos pela UI. O token não retorna ao navegador depois do envio e fica em um arquivo local criptografado e ignorado pelo Git (`.nexo/instagram-credentials.enc`); em produção, `INTEGRATION_CREDENTIAL_ENCRYPTION_KEY` é obrigatória. `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_ACCOUNT_ID` continuam como alternativa de configuração de servidor. Nunca exponha `META_APP_SECRET` ou token ao navegador. Caso uma capability retorne `429`, o worker deve respeitar `Retry-After`, backoff e a política de taxa da plataforma.

## Avaliação dos repositórios solicitados

| Projeto | Achados | Compatibilidade/segurança | Decisão |
| --- | --- | --- | --- |
| [thenavidm/instagram-mcp](https://github.com/thenavidm/instagram-mcp) | Python, MIT, 31 commits na inspeção; tem caminho oficial e um tier opcional `instagrapi` não oficial. Declara suporte a Claude Code/MCP. | O tier oficial é uma referência útil; o tier privado enumera seguidores/perfis e viola os limites do produto. | Não integrar como dependência. Usar somente aprendizado do caminho oficial; adaptador próprio, sem tier privado. |
| [adelaidasofia/instagram-mcp](https://github.com/adelaidasofia/instagram-mcp) | Python/FastMCP, MIT, testes e cerca de 30 commits; focado em Graph API oficial, contas Business/Creator e DM sujeito a revisão. | É a referência mais alinhada com API oficial e MCP/Claude. Ainda adicionaria runtime Python e superfície de publicação/DM fora do escopo. | Não copiar nem integrar. Manter adaptador TypeScript de superfície menor. |
| [sanjaykhanssk/instagram-mcp](https://github.com/sanjaykhanssk/instagram-mcp) | Plugin/MCP hospedado de InstantDM, MIT, apenas 6 commits na inspeção; expõe automação de comentários/DM, requer API key de terceiro. | Compatível com MCP/Claude/Codex segundo o README, mas terceiriza dados, inclui automação de DM e cria dependência comercial. | Não integrar no MVP. Contraria a decisão explícita de não enviar DMs. |

As contagens e afirmações acima são uma fotografia da inspeção em 13/10/2026, não uma auditoria de segurança. Antes de uma integração futura, revisar commit fixado, licença, dependências transitivas, política de privacidade, armazenamento de credenciais, postura de vulnerabilidades e escopos Meta.

## Limitações oficiais que moldam o MVP

Contas pessoais não recebem a mesma superfície da Graph API; Business Discovery atende apenas contas profissionais elegíveis; uma DM fria não é uma permissão que este produto usa. As respostas oficiais podem depender de permissões, App Review e da combinação do fluxo Instagram/Facebook Login. O painel declara essas restrições em vez de ocultá-las ou preencher dados fictícios.
