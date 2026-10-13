"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, DatabaseZap, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../lib/api";

type Onboarding = {
  completed: boolean;
  mode?: "DEMO" | "LIVE";
  demoAvailable: boolean;
  instagramConfigured: boolean;
  officialLimitations: string[];
};

export function OnboardingGate({ children }: { children: ReactNode }) {
  const client = useQueryClient();
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

  if (onboarding.isLoading) return <div className="onboarding-loading">Preparando o Nexo…</div>;
  if (onboarding.isError) return <div className="error">Não foi possível preparar o onboarding. Verifique se a API está em execução.</div>;
  if (onboarding.data?.completed) return <>{children}</>;

  const liveReady = onboarding.data?.instagramConfigured;
  return <section className="onboarding" aria-labelledby="onboarding-title">
    <div className="onboarding-intro">
      <span className="eyebrow">Bem-vindo ao nexo.</span>
      <h1 id="onboarding-title">Comece com os dados certos.</h1>
      <p>Conecte uma conta profissional já autorizada pela Meta para consultar os dados oficialmente disponíveis. Se quiser apenas conhecer o produto, use a demonstração com perfis fictícios.</p>
    </div>

    {complete.error ? <p className="error">{complete.error instanceof Error ? complete.error.message : "Não foi possível concluir o onboarding."}</p> : null}

    <div className="onboarding-options">
      <article className="onboarding-option featured">
        <div className="option-icon"><ShieldCheck size={22}/></div>
        <span className="pill high">Recomendado</span>
        <h2>Conectar dados reais</h2>
        <p>Consulta os dados e capacidades que a sua integração oficial da Meta autorizou para a conta conectada.</p>
        {liveReady ? <button className="btn" disabled={complete.isPending} onClick={() => complete.mutate("live")}>
          {complete.isPending ? "Conectando…" : "Conectar e sincronizar"}<ArrowRight size={16}/>
        </button> : <>
          <button className="btn" disabled>Configure a integração da Meta</button>
          <small>Defina <code>INSTAGRAM_ACCESS_TOKEN</code> e <code>INSTAGRAM_ACCOUNT_ID</code> no servidor para habilitar esta opção.</small>
        </>}
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

    <aside className="onboarding-limits">
      <strong>Limites da integração oficial</strong>
      <ul>{onboarding.data?.officialLimitations.map((limit) => <li key={limit}>{limit}</li>)}</ul>
      <p>Para montar sua base de contatos, importe uma exportação de seguidores em seguida. O Nexo não faz scraping nem envia mensagens automaticamente.</p>
    </aside>
  </section>;
}
