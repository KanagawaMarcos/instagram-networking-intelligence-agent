"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Columns3, Download, Settings, Users } from "lucide-react";
const links = [{ href: "/", label: "Visão geral", icon: BarChart3 }, { href: "/contatos", label: "Contatos", icon: Users }, { href: "/oportunidades", label: "Oportunidades", icon: BriefcaseBusiness }, { href: "/quadro", label: "Pipeline", icon: Columns3 }, { href: "/importar", label: "Importar", icon: Download }, { href: "/configuracoes", label: "Configurações", icon: Settings }];
export function Nav() { const path = usePathname(); return <aside className="nav"><div className="brand"><span className="brand-mark">N</span><span>nexo<span style={{ color: "#51d1bf" }}>.</span></span></div><nav>{links.map(({ href, label, icon: Icon }) => <Link className={path === href ? "active" : ""} href={href} key={href}><Icon size={17}/>{label}</Link>)}</nav><div className="nav-foot"><span className="status-dot"/> Modo demonstração<br/><span style={{ fontSize: 11 }}>Dados fictícios e locais</span></div></aside>; }
