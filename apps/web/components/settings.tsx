"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { api } from "../lib/api";

type Integration = { configured: boolean; source: "SECURE_LOCAL_STORAGE" | "ENVIRONMENT" | "NONE"; accountIdHint?: string; encryption: "ENVIRONMENT_KEY" | "LOCAL_DEVELOPMENT_KEY" | "NOT_CONFIGURED" };
type Settings = { demoMode: boolean; goals: Array<{ name: string; goals: string[]; weights: { professionalRelevance: number; collaborationValue: number; interactionEvidence: number; informationQuality: number } }>; integration: Integration; capabilities: Array<{ capability: string; status: string; detail: string }>; ai: { configured: boolean; model: string; activeEngine: string } };
const schema = z.object({ name: z.string().min(3), goals: z.array(z.string()).min(1), professionalRelevance: z.number().min(0).max(1), collaborationValue: z.number().min(0).max(1), interactionEvidence: z.number().min(0).max(1), informationQuality: z.number().min(0).max(1) }).refine((value) => Math.abs(value.professionalRelevance + value.collaborationValue + value.interactionEvidence + value.informationQuality - 1) < .001, "Os pesos devem totalizar 1");
type Form = z.infer<typeof schema>;
const goalOptions = [["FOUNDERS", "Conectar com founders"], ["RECRUITERS", "Relacionar-se com recrutadores"], ["SENIOR_ENGINEERS", "Conhecer engenheiros seniores"], ["TECH_LEADERS", "Encontrar líderes técnicos"], ["TECH_CREATORS", "Conhecer criadores de tecnologia"], ["COLLABORATION", "Descobrir colaborações"]] as const;

export function SettingsView() {
  const client = useQueryClient();
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => api<Settings>("/api/settings") });
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: "Networking em tecnologia", goals: ["FOUNDERS", "TECH_LEADERS"], professionalRelevance: .35, collaborationValue: .30, interactionEvidence: .20, informationQuality: .15 } });
  const mutation = useMutation({ mutationFn: (value: Form) => api("/api/settings/goals", { method: "PUT", body: JSON.stringify({ name: value.name, goals: value.goals, weights: { professionalRelevance: value.professionalRelevance, collaborationValue: value.collaborationValue, interactionEvidence: value.interactionEvidence, informationQuality: value.informationQuality } }) }), onSuccess: () => { client.invalidateQueries({ queryKey: ["settings"] }); client.invalidateQueries({ queryKey: ["contacts"] }); } });
  const credentials = useMutation({ mutationFn: () => api<Integration>("/api/integrations/instagram", { method: "PUT", body: JSON.stringify({ accountId, accessToken }) }), onSuccess: () => { setAccessToken(""); client.invalidateQueries({ queryKey: ["settings"] }); client.invalidateQueries({ queryKey: ["onboarding"] }); } });
  const removeCredentials = useMutation({ mutationFn: () => api<Integration>("/api/integrations/instagram", { method: "DELETE" }), onSuccess: () => { setAccountId(""); client.invalidateQueries({ queryKey: ["settings"] }); client.invalidateQueries({ queryKey: ["onboarding"] }); } });

  if (isLoading || !data) return <p className="subtitle">Carregando configurações…</p>;
  const configuredLabel = data.integration.source === "ENVIRONMENT" ? "variável do servidor" : data.integration.source === "SECURE_LOCAL_STORAGE" ? "armazenamento criptografado local" : "não configurada";

  return <>
    <div className="page-head"><div><h1>Configurações</h1><p className="subtitle">Integrações, metas e critérios de priorização permanecem sob seu controle.</p></div></div>
    <div className="grid-two">
      <section style={{ display: "grid", gap: 18 }}>
        <div className="panel">
          <div className="section-title"><div><h2>Integração do Instagram</h2><p className="subtitle">A credencial fica exclusivamente no servidor e não é devolvida à interface.</p></div><ShieldCheck color="#0eaa94"/></div>
          <p className="notice">{data.integration.configured ? `Conta ${data.integration.accountIdHint ?? "configurada"} usando ${configuredLabel}.` : "Nenhuma conta profissional foi configurada."}</p>
          <form className="settings-integration-form" onSubmit={(event) => { event.preventDefault(); credentials.mutate(); }}>
            <label>ID da conta profissional do Instagram
              <input className="input" inputMode="numeric" pattern="[0-9]+" required value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="Ex.: 17841400000000000" />
            </label>
            <label>Token de acesso da Meta
              <input className="input" type="password" required value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="Cole um novo token para salvar ou substituir" />
            </label>
            {credentials.error ? <p className="error">{credentials.error instanceof Error ? credentials.error.message : "Não foi possível salvar a credencial."}</p> : null}
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button className="btn" type="submit" disabled={credentials.isPending}>{credentials.isPending ? "Salvando…" : data.integration.configured ? "Substituir credencial" : "Salvar credencial"}</button>
              {data.integration.source === "SECURE_LOCAL_STORAGE" ? <button className="btn secondary" type="button" disabled={removeCredentials.isPending} onClick={() => removeCredentials.mutate()}>{removeCredentials.isPending ? "Removendo…" : "Remover credencial"}</button> : null}
            </div>
          </form>
          <p className="subtitle">Encontre ambos em <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta for Developers</a>: gere o token no fluxo da sua app ou no <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer">Graph API Explorer</a>. No Facebook Login, use <code>instagram_business_account.id</code> da Página vinculada; no Instagram Login, use o <code>id</code> retornado para o usuário Instagram. Veja a <a href="https://developers.facebook.com/docs/instagram-platform/" target="_blank" rel="noreferrer">documentação da Instagram Platform</a>.</p>
        </div>
        <div className="panel">
          <div className="section-title"><div><h2>Capacidades autorizadas</h2><p className="subtitle">Cada recurso é conferido separadamente; uma credencial não concede acesso implícito.</p></div><ShieldCheck color="#0eaa94"/></div>
          <p className="subtitle">Claude: {data.ai.configured ? `configurado (${data.ai.model})` : "não configurado — motor demo ativo"}</p>
          <table className="table"><thead><tr><th>Capacidade Instagram</th><th>Status</th></tr></thead><tbody>{data.capabilities.map((capability) => <tr key={capability.capability}><td><strong>{capability.capability}</strong><small style={{ display: "block", color: "#637086", marginTop: 2 }}>{capability.detail}</small></td><td><span className={`pill ${capability.status === "AVAILABLE" ? "high" : "unknown"}`}>{capability.status}</span></td></tr>)}</tbody></table>
        </div>
        <div className="panel"><h2>Privacidade e dados</h2><p className="subtitle">A exclusão de um contato apaga seus dados, evidências, interações e pipeline associados. A plataforma não considera visibilidade pública como autorização irrestrita para coleta.</p><button className="btn secondary">Solicitar exportação de dados</button></div>
      </section>
      <section className="panel"><h2>Metas e ranking</h2><p className="subtitle">Os pesos determinam o score final. Valores desconhecidos recebem tratamento neutro, não penalidade automática.</p><form onSubmit={form.handleSubmit((value) => mutation.mutate(value))}><div className="detail-item"><dt>Nome da configuração</dt><dd><input className="input" {...form.register("name")}/></dd></div><div className="detail-item"><dt>Objetivos</dt><dd>{goalOptions.map(([value, label]) => <label key={value} style={{ display: "block", margin: "8px 0", fontSize: 14 }}><input type="checkbox" value={value} {...form.register("goals")}/> {label}</label>)}</dd></div>{([ ["professionalRelevance", "Relevância profissional"], ["collaborationValue", "Valor de colaboração"], ["interactionEvidence", "Evidência de interação"], ["informationQuality", "Qualidade e atualidade"] ] as const).map(([name, label]) => <div className="detail-item" key={name}><dt>{label}</dt><dd><input className="input" type="number" step="0.05" min="0" max="1" {...form.register(name, { valueAsNumber: true })}/></dd></div>)}{form.formState.errors.root && <p className="error">{form.formState.errors.root.message}</p>}<button className="btn" type="submit" disabled={mutation.isPending}>{mutation.isSuccess ? <Check size={16}/> : null}{mutation.isPending ? "Salvando…" : "Salvar configuração"}</button></form></section>
    </div>
  </>;
}
