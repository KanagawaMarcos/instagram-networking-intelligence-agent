"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { CheckSquare, Search, Sparkles } from "lucide-react";
import { api } from "../lib/api";

type Contact = { id: string; instagramUsername: string; displayName?: string; profession?: string; company?: string; biography?: string; pipeline: { status: string }; assessment?: { category: string; confidenceScore: number; analyzedAt: string }; ranking?: { finalScore: number } };
const column = createColumnHelper<Contact>();
const statusNames: Record<string, string> = { DISCOVERED: "Descoberto", ANALYZED: "Analisado", SHORTLISTED: "Selecionado", READY_TO_CONTACT: "Pronto", CONTACTED: "Contatado", REPLIED: "Respondeu", RELATIONSHIP_BUILDING: "Relacionamento", CONNECTED: "Conectado", ARCHIVED: "Arquivado" };
export function ContactsTable() {
  const [search, setSearch] = useState(""); const [category, setCategory] = useState(""); const [selected, setSelected] = useState<Record<string, boolean>>({}); const client = useQueryClient();
  const query = useQuery({ queryKey: ["contacts", search, category], queryFn: () => api<{ data: Contact[]; pagination: { total: number } }>(`/api/contacts?search=${encodeURIComponent(search)}&category=${category}`) });
  const analysis = useMutation({ mutationFn: (contactIds: string[]) => api("/api/analyses", { method: "POST", body: JSON.stringify({ contactIds }) }), onSuccess: () => { client.invalidateQueries({ queryKey: ["contacts"] }); client.invalidateQueries({ queryKey: ["dashboard"] }); setSelected({}); } });
  const data = query.data?.data ?? [];
  const columns = useMemo(() => [
    column.display({ id: "select", header: () => <input aria-label="Selecionar todos" type="checkbox" checked={data.length > 0 && data.every((contact) => selected[contact.id])} onChange={(event) => setSelected(Object.fromEntries(data.map((contact) => [contact.id, event.target.checked])))} />, cell: ({ row }) => <input aria-label={`Selecionar ${row.original.instagramUsername}`} type="checkbox" checked={Boolean(selected[row.original.id])} onChange={(event) => setSelected((state) => ({ ...state, [row.original.id]: event.target.checked }))} /> }),
    column.accessor("instagramUsername", { header: "Contato", cell: ({ row, getValue }) => <div className="person"><span className="avatar">{(row.original.displayName ?? getValue()).charAt(0)}</span><span><strong>{row.original.displayName ?? `@${getValue()}`}</strong><small>@{getValue()}</small></span></div> }),
    column.accessor("profession", { header: "Profissão", cell: ({ getValue }) => getValue() ?? <span className="subtitle">Não informada</span> }),
    column.accessor("company", { header: "Empresa", cell: ({ getValue }) => getValue() ?? "—" }),
    column.display({ id: "category", header: "Categoria", cell: ({ row }) => <span className="pill">{row.original.assessment?.category?.replace("_", " ") ?? "PENDENTE"}</span> }),
    column.display({ id: "relevance", header: "Relevância", cell: ({ row }) => row.original.ranking ? <strong>{row.original.ranking.finalScore}</strong> : "—" }),
    column.display({ id: "confidence", header: "Confiança", cell: ({ row }) => row.original.assessment ? `${Math.round(row.original.assessment.confidenceScore * 100)}%` : "—" }),
    column.display({ id: "status", header: "Status", cell: ({ row }) => <span className="pill unknown">{statusNames[row.original.pipeline.status]}</span> }),
    column.display({ id: "actions", header: "", cell: ({ row }) => <a className="btn secondary" style={{ padding: "6px 9px", fontSize: 12 }} href={`/contatos/${row.original.id}`}>Ver</a> })
  ], [data, selected]);
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const selectedIds = Object.entries(selected).filter(([, checked]) => checked).map(([id]) => id);
  return <><div className="page-head"><div><h1>Contatos</h1><p className="subtitle">Busque, filtre e priorize dados que você importou ou adicionou manualmente.</p></div><button className="btn" disabled={!selectedIds.length || analysis.isPending} onClick={() => analysis.mutate(selectedIds)}><Sparkles size={16}/>{analysis.isPending ? "Analisando…" : `Analisar selecionados${selectedIds.length ? ` (${selectedIds.length})` : ""}`}</button></div>
    <div className="panel"><div className="filters"><label><span className="sr-only">Buscar</span><input className="input" placeholder="Buscar nome, @usuário ou empresa" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select className="select" aria-label="Filtrar categoria" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas as categorias</option><option value="FOUNDER">Founders</option><option value="RECRUITER">Recrutadores</option><option value="TECH_LEADER">Liderança técnica</option><option value="ENGINEER">Engenheiros</option><option value="CREATOR">Criadores</option></select><span className="subtitle" style={{ alignSelf: "center" }}><Search size={14} style={{ verticalAlign: "-2px" }}/> {query.data?.pagination.total ?? 0} contatos</span></div>{analysis.error && <p className="error">{analysis.error.message}</p>}
      <div className="table-wrap"><table className="table"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table>{query.isLoading && <p className="empty">Carregando contatos…</p>}{!query.isLoading && !data.length && <p className="empty">Nenhum contato encontrado.</p>}</div></div>
  </>;
}
