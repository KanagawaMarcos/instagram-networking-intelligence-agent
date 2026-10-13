import { randomUUID } from "node:crypto";
import type { AnalysisResponse } from "@ina/ai";
import { defaultScoringWeights, type Assessment, type NetworkingGoal, type PipelineStatus } from "@ina/shared";

export type Contact = {
  id: string; instagramUsername: string; instagramUserId?: string; displayName?: string; biography?: string;
  profession?: string; jobTitle?: string; company?: string; professionalInterests: string[]; accountType: "PERSONAL" | "BUSINESS" | "CREATOR" | "UNKNOWN";
  profileUrl?: string; followerStatus: "KNOWN" | "UNKNOWN"; dataSource: string; profileLastCheckedAt?: string;
  personalNotes?: string; createdAt: string; updatedAt: string; pipeline: Pipeline; assessment?: StoredAssessment; evidence: Evidence[]; interactions: Interaction[];
};
export type Evidence = { id: string; sourceType: string; sourceUrl?: string; fieldName: string; observedValue: string; observedAt: string };
export type Interaction = { id: string; interactionType: string; externalId?: string; content?: string; occurredAt: string };
export type StoredAssessment = Assessment & { id: string; modelVersion: string; analyzedAt: string; inputHash: string; scoreExplanation: unknown; usage: AnalysisResponse["usage"] };
export type Pipeline = { status: PipelineStatus; priority: number; personalNotes?: string; lastContactedAt?: string; nextFollowUpAt?: string; updatedAt: string };
export type ImportJob = { id: string; filename: string; status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"; totalRecords: number; importedRecords: number; duplicateRecords: number; invalidRecords: number; errors: unknown[]; createdAt: string; completedAt?: string };
export type AnalysisJob = { id: string; status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"; totalContacts: number; processedContacts: number; failedContacts: number; tokenUsage: number; estimatedCostUsd: number; actualCostUsd: number; errors: unknown[]; createdAt: string; completedAt?: string };
export type GoalConfig = { id: string; name: string; goals: NetworkingGoal[]; weights: typeof defaultScoringWeights; active: boolean };

export class MemoryStore {
  contacts = new Map<string, Contact>();
  imports = new Map<string, ImportJob>();
  analyses = new Map<string, AnalysisJob>();
  goals: GoalConfig[] = [{ id: "default", name: "Networking em tecnologia", goals: ["FOUNDERS", "TECH_LEADERS", "SENIOR_ENGINEERS", "RECRUITERS"], weights: defaultScoringWeights, active: true }];
  audit: Array<{ action: string; entity: string; entityId?: string; at: string }> = [];

  addContact(input: Omit<Contact, "id" | "createdAt" | "updatedAt" | "pipeline" | "evidence" | "interactions" | "professionalInterests"> & Partial<Pick<Contact, "professionalInterests" | "pipeline" | "evidence" | "interactions">>): Contact {
    const existing = [...this.contacts.values()].find((contact) => contact.instagramUsername === input.instagramUsername);
    if (existing) return existing;
    const now = new Date().toISOString();
    const contact: Contact = { id: randomUUID(), professionalInterests: [], evidence: [], interactions: [], pipeline: { status: "DISCOVERED", priority: 0, updatedAt: now }, ...input, createdAt: now, updatedAt: now };
    this.contacts.set(contact.id, contact);
    this.audit.push({ action: "CONTACT_CREATED", entity: "Contact", entityId: contact.id, at: now });
    return contact;
  }
  updateContact(id: string, values: Partial<Contact>) { const contact = this.contacts.get(id); if (!contact) return undefined; Object.assign(contact, values, { updatedAt: new Date().toISOString() }); this.audit.push({ action: "CONTACT_UPDATED", entity: "Contact", entityId: id, at: new Date().toISOString() }); return contact; }
  listContacts() { return [...this.contacts.values()]; }
  deleteContact(id: string) { const removed = this.contacts.delete(id); if (removed) this.audit.push({ action: "CONTACT_DELETED", entity: "Contact", entityId: id, at: new Date().toISOString() }); return removed; }
  async persistContact(_contact: Contact): Promise<void> { /* armazenamento efêmero no modo demo */ }
  async removeContact(id: string): Promise<boolean> { return this.deleteContact(id); }
  async close(): Promise<void> { /* sem recursos externos no modo demo */ }
}

const demoProfiles: Array<Partial<Contact> & Pick<Contact, "instagramUsername" | "displayName">> = [
  { instagramUsername: "livia.arq", displayName: "Lívia Andrade", biography: "CTO na Aurora Cloud. Engenharia de plataforma, sistemas distribuídos e comunidades open source.", profession: "Tecnologia", jobTitle: "CTO", company: "Aurora Cloud", professionalInterests: ["Sistemas distribuídos", "Open source"], accountType: "BUSINESS" },
  { instagramUsername: "caio.builds", displayName: "Caio Nunes", biography: "Staff Engineer | Backend e confiabilidade | escrevo sobre arquitetura de software", profession: "Engenharia de Software", jobTitle: "Staff Engineer", company: "Norte Labs", professionalInterests: ["Backend", "Arquitetura"], accountType: "CREATOR" },
  { instagramUsername: "marina.founder", displayName: "Marina Costa", biography: "Founder da Vetta. Construindo ferramentas para times de produto. Empreendedorismo e IA aplicada.", profession: "Empreendedora", jobTitle: "Founder", company: "Vetta", professionalInterests: ["Startups", "IA"], accountType: "BUSINESS" },
  { instagramUsername: "rafa.talent", displayName: "Rafael Melo", biography: "Tech Recruiter | conectando pessoas excelentes a produtos com propósito", profession: "Recrutamento", jobTitle: "Technical Recruiter", company: "People First", professionalInterests: ["Carreira", "Talentos"], accountType: "BUSINESS" },
  { instagramUsername: "bia.engmanager", displayName: "Beatriz Lima", biography: "Engineering Manager. Pessoas, produto e plataformas que escalam.", profession: "Tecnologia", jobTitle: "Engineering Manager", company: "Nuvem", professionalInterests: ["Liderança", "Produto"], accountType: "BUSINESS" },
  { instagramUsername: "diego.codigo", displayName: "Diego Santos", biography: "Desenvolvedor de software · JavaScript, backend e comunidades dev.", profession: "Desenvolvimento de Software", jobTitle: "Software Developer", professionalInterests: ["Backend", "Comunidade"], accountType: "CREATOR" },
  { instagramUsername: "nanda.tech", displayName: "Fernanda Alves", biography: "Criadora de conteúdo sobre tecnologia e carreira. Newsletter semanal.", profession: "Criação de conteúdo", jobTitle: "Technology Creator", professionalInterests: ["Conteúdo", "Carreira"], accountType: "CREATOR" },
  { instagramUsername: "perfil.sem.dados", displayName: "Perfil sem dados", accountType: "UNKNOWN" }
];

export function seedDemo(store: MemoryStore) {
  for (const profile of demoProfiles) {
    const contact = store.addContact({
      instagramUsername: profile.instagramUsername!, displayName: profile.displayName, biography: profile.biography, profession: profile.profession, jobTitle: profile.jobTitle, company: profile.company,
      professionalInterests: profile.professionalInterests ?? [], accountType: profile.accountType ?? "UNKNOWN", profileUrl: `https://instagram.com/${profile.instagramUsername}`, followerStatus: "KNOWN", dataSource: "DEMO_FIXTURE"
    });
    if (contact.biography) contact.evidence.push({ id: randomUUID(), sourceType: "IMPORT", fieldName: "biography", observedValue: contact.biography, observedAt: contact.createdAt });
  }
}
