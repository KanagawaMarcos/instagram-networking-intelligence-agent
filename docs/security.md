# Segurança, privacidade e LGPD

- Segredos Meta e Anthropic estão exclusivamente no ambiente do servidor; nenhum é retornado pela API ou empacotado pelo Next.js.
- Integrações de produção devem guardar tokens cifrados com uma chave de rotação (`INTEGRATION_CREDENTIAL_ENCRYPTION_KEY`), usar OAuth/Meta documentado e renovar tokens no servidor.
- Entradas REST são validadas por Zod. Arquivos são limitados a 10 MB e parseados como CSV/JSON; não há execução de conteúdo do arquivo.
- A aplicação registra fontes/evidências e oferece exclusão de contato em cascata. Defina política de retenção, base legal, aviso de privacidade, processo de titular e DPA antes de produção.
- Mensagens são apenas geradas, revisadas e copiadas. Não há endpoint de envio de DM.
- A API deve ser protegida com sessão HTTP-only/OIDC, RBAC, rate limiting, CSRF, CORS restrito, logs sem segredos e TLS na implantação. A sessão fixa existe exclusivamente para a experiência demo local.
- Não inferimos atributos sensíveis e não assumimos que dados visíveis sejam autorizados para coleta ou reutilização ilimitada.
