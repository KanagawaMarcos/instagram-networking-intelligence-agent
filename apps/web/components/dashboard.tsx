"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "../lib/api";

type Dashboard = { totalContacts: number; totalAnalyzed: number; withProfessionalInfo: number; highPriority: number; categoryCounts: Record<string, number>; pipeline: Record<string, number>; pendingFollowUps: number; jobs: Array<{ status: string; processedContacts: number; totalContacts: number }> };
const categoryNames: Record<string, string> = { TECH_LEADER: "Liderança técnica", FOUNDER: "Founders", RECRUITER: "Recrutadores", ENGINEER: "Engenheiros", CREATOR: "Criadores", EXECUTIVE: "Executivos", COLLABORATOR: "Colaboradores", UNKNOWN: "Sem classificação" };
export function DashboardView() {
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/api/dashboard") });
  if (isLoading) return <p className="subtitle">Carregando inteligência de networking…</p>;
  if (error || !data) return <p className="error">Não foi possível carregar o painel. Verifique se a API está em execução.</p>;
  const max = Math.max(1, ...Object.values(data.categoryCounts));
  return <>
    <div className="page-head"><div><h1>Seu networking, com contexto.</h1><p className="subtitle">Encontre conexões profissionais relevantes entre os contatos que você autorizou importar.</p></div><Link className="btn" href="/importar">Importar contatos <ArrowRight size={16}/></Link></div>
    <div className="notice">O Nexo usa somente dados importados ou autorizados. Nenhum perfil é coletado automaticamente e nenhuma mensagem é enviada pela plataforma.</div>
    <div className="cards" style={{ marginTop: 18 }}>
      <div className="card"><div className="label">Contatos importados</div><div className="metric">{data.totalContacts}</div><div className="hint">Base disponível</div></div>
      <div className="card"><div className="label">Perfis analisados</div><div className="metric">{data.totalAnalyzed}</div><div className="hint">Com avaliação estruturada</div></div>
      <div className="card"><div className="label">Informação profissional</div><div className="metric">{data.withProfessionalInfo}</div><div className="hint">Dados disponíveis</div></div>
      <div className="card"><div className="label">Alta prioridade</div><div className="metric">{data.highPriority}</div><div className="hint">Score de 75 ou mais</div></div>
    </div>
    <div className="grid-two"><section className="panel"><div className="section-title"><div><h2>Quem está na sua rede</h2><p className="subtitle">Classificação baseada em informação profissional disponível.</p></div><Link href="/oportunidades" className="btn secondary">Ver oportunidades</Link></div><div className="category-list">{Object.entries(data.categoryCounts).filter(([, n]) => n > 0).map(([category, count]) => <div className="category-row" key={category}><span>{categoryNames[category] ?? category}</span><div className="bar"><span style={{ width: `${count / max * 100}%` }}/></div><strong>{count}</strong></div>)}</div></section>
      <section className="panel"><div className="section-title"><div><h2>Acompanhamento</h2><p className="subtitle">Próximas ações que merecem atenção.</p></div><Sparkles color="#6d4aff" size={21}/></div><div style={{ display: "grid", gap: 13, marginTop: 14 }}><div><span className="pill high">{data.pipeline.READY_TO_CONTACT ?? 0} prontos para contato</span><p className="subtitle">Revise a mensagem sugerida antes de copiar.</p></div><div><span className="pill warn">{data.pendingFollowUps} follow-ups pendentes</span><p className="subtitle">A data é definida por você, nunca por automação de mensagens.</p></div><div><span className="pill">{data.jobs.at(0)?.processedContacts ?? 0}/{data.jobs.at(0)?.totalContacts ?? 0} última análise</span><p className="subtitle">Processamento em lotes com progresso e recuperação de falhas.</p></div></div></section>
    </div>
  </>;
}
