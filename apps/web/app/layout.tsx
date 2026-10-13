import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "../components/nav";
import { OnboardingGate } from "../components/onboarding-gate";
import { Providers } from "../components/providers";
export const metadata: Metadata = { title: "Nexo — Inteligência de Networking", description: "Networking profissional com dados autorizados" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><Providers><div className="shell"><Nav/><main className="main"><OnboardingGate>{children}</OnboardingGate></main></div></Providers></body></html>; }
