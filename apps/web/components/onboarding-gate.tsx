"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, DatabaseZap, ShieldCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "../lib/api";

type Onboarding = {
  completed: boolean;
  mode?: "DEMO" | "LIVE";
  demoAvailable: boolean;
  instagramConfigured: boolean;
  instagramConfiguration: IntegrationConfiguration;
  officialLimitations: string[];
};
type IntegrationConfiguration = { configured: boolean; source: "SECURE_LOCAL_STORAGE" | "ENVIRONMENT" | "NONE"; accountIdHint?: string; encryption: "ENVIRONMENT_KEY" | "LOCAL_DEVELOPMENT_KEY" | "NOT_CONFIGURED" };

export function OnboardingGate({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const onboarding = useQuery({ queryKey: ["onboarding"], queryFn: () => api<Onboarding>("/api/onboarding") });
  const complete = useMutation({
    mutationFn: (mode: "demo" | "live") => api<{ contactsImported?: number }>(`/api/onboarding/${mode}`, { method: "POST" }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["onboarding"] });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["dashboard"] }),
        client.invalidateQueries({ queryKey: ["contacts"] })
      ]);
    }
  });
  const saveIntegration = useMutation({
    mutationFn: () => api<IntegrationConfiguration>("/api/integrations/instagram", { method: "PUT", body: JSON.stringify({ accountId, accessToken }) }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["onboarding"] }); }
  });

  async function saveAndConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveIntegration.mutateAsync();
    await complete.mutateAsync("live");
  }

  if (onboarding.isLoading) return <div className="onboarding-loading">Preparando o Nexo…</div>;
  if (onboarding.isError) return <div className="error">Não foi possível preparar o onboarding. Verifique se a API está em execução.</div>;
  if (onboarding.data?.completed) return <>{children}</>;

  const liveReady = onboarding.data?.instagramConfigured;
  const error = saveIntegration.error ?? complete.error;
  return <section className="onboarding" aria-labelledby="onboarding-title">
    <div className="onboarding-intro">
      <span className="eyebrow">Bem-vindo ao nexo.</span>
      <h1 id="onboarding-title">Comece com os dados certos.</h1>
      <p>Conecte uma conta profissional já autorizada pela Meta para consultar os dados oficialmente disponíveis. Se quiser apenas conhecer o produto, use a demonstração com perfis fictícios.</p>
    </div>

    {error ? <p className="error">{error instanceof Error ? error.message : "Não foi possível concluir o onboarding."}</p> : null}

    <div className="onboarding-options">
      <article className="onboarding-option featured">
        <div className="option-icon"><ShieldCheck size={22}/></div>
        <span className="pill high">Recomendado</span>
        <h2>Conectar dados reais</h2>
        <p>Consulta os dados e capacidades que a sua integração oficial da Meta autorizou para a conta conectada.</p>
        {liveReady ? <>
          <p className="integration-saved">Credencial salva com segurança ({onboarding.data?.instagramConfiguration.accountIdHint ?? "conta configurada"}).</p>
          <button className="btn" disabled={complete.isPending} onClick={() => complete.mutate("live")}>
          {complete.isPending ? "Conectando…" : "Conectar e sincronizar"}<ArrowRight size={16}/>
          </button>
          <small>Você poderá substituir ou remover essa credencial em Configurações.</small>
        </> : <form className="integration-form" onSubmit={saveAndConnect}>
          <label>ID da conta profissional do Instagram
            <input className="input" inputMode="numeric" pattern="[0-9]+" required value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="Ex.: 17841400000000000" />
          </label>
          <label>Token de acesso da Meta
            <input className="input" type="password" required value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="Cole o token gerado na Meta" />
          </label>
          <button className="btn" type="submit" disabled={saveIntegration.isPending || complete.isPending}>
            {saveIntegration.isPending || complete.isPending ? "Validando…" : "Salvar e sincronizar"}<ArrowRight size={16}/>
          </button>
        </form>}
      </article>

      <article className="onboarding-option">
        <div className="option-icon demo"><DatabaseZap size={22}/></div>
        <h2>Explorar com dados fictícios</h2>
        <p>Carrega oito perfis profissionais fictícios e locais. Nenhum dado do Instagram será consultado.</p>
        <button className="btn secondary" disabled={complete.isPending} onClick={() => complete.mutate("demo")}>
          {complete.isPending ? "Carregando…" : "Abrir demonstração"}<ArrowRight size={16}/>
        </button>
      </article>
    </div>

    <aside className="credential-guide">
      <strong>Onde encontrar esses valores</strong>
      <ol>
        <li>Em <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta for Developers</a>, crie ou selecione um app e adicione o produto Instagram API para a conta profissional elegível.</li>
        <li>Gere um token no fluxo de login/configuração da Meta ou no <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer">Graph API Explorer</a>, com as permissões aprovadas para o seu caso de uso.</li>
        <li>Obtenha o ID numérico retornado pelo fluxo configurado. No Facebook Login, ele é o <code>instagram_business_account.id</code> da Página vinculada; no Instagram Login, é o <code>id</code> do usuário Instagram. A <a href="https://developers.facebook.com/docs/instagram-platform/" target="_blank" rel="noreferrer">Instagram Platform</a> mostra ambos os fluxos.</li>
      </ol>
      <p>O token nunca volta para o navegador depois de salvo. No desenvolvimento local ele é criptografado em arquivo privado; em produção use <code>INTEGRATION_CREDENTIAL_ENCRYPTION_KEY</code>.</p>
    </aside>

    <aside className="onboarding-limits">
      <strong>Limites da integração oficial</strong>
      <ul>{onboarding.data?.officialLimitations.map((limit) => <li key={limit}>{limit}</li>)}</ul>
      <p>Para montar sua base de contatos, importe uma exportação de seguidores em seguida. O Nexo não faz scraping nem envia mensagens automaticamente.</p>
    </aside>
  </section>;
}
