import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { InMemoryCredentialStore } from "./credential-store.js";
import { MockInstagramProvider } from "@ina/instagram";

const config = { NODE_ENV: "test" as const, DEMO_MODE: true, API_PORT: 0, ANTHROPIC_MODEL: "demo", INSTAGRAM_GRAPH_API_VERSION: "v24.0", WORKER_CONCURRENCY: 1, ANALYSIS_BATCH_SIZE: 10 };
describe("API workflow", () => {
  it("mantém a demonstração opcional e não semeia dados antes da escolha", async () => {
    const app = await buildApp({ config });
    expect((await app.inject("/api/onboarding")).json().completed).toBe(false);
    expect((await app.inject("/api/contacts")).json().pagination.total).toBe(0);
    expect((await app.inject({ method: "POST", url: "/api/onboarding/live" })).statusCode).toBe(409);
    const demo = await app.inject({ method: "POST", url: "/api/onboarding/demo" });
    expect(demo.statusCode).toBe(200); expect(demo.json().contactsImported).toBe(8);
    expect((await app.inject("/api/onboarding")).json().mode).toBe("DEMO");
    await app.close();
  });
  it("salva a configuração da integração pela API sem expor o token", async () => {
    const credentials = new InMemoryCredentialStore();
    const app = await buildApp({ config, credentialStore: credentials, provider: new MockInstagramProvider() });
    const saved = await app.inject({ method: "PUT", url: "/api/integrations/instagram", payload: { accountId: "17841400000000000", accessToken: "token-de-teste-comprido" } });
    expect(saved.statusCode).toBe(200); expect(saved.json().configured).toBe(true); expect(saved.body).not.toContain("token-de-teste-comprido");
    expect((await credentials.get())?.accessToken).toBe("token-de-teste-comprido");
    expect((await app.inject({ method: "POST", url: "/api/onboarding/live" })).statusCode).toBe(200);
    await app.close();
  });
  it("importa, deduplica, analisa e move um contato", async () => {
    const app = await buildApp({ config });
    const imported = await app.inject({ method: "POST", url: "/api/imports", payload: { filename: "followers.csv", content: "username,display_name,bio\n@novo.dev,Novo Dev,Desenvolvedor backend" } });
    expect(imported.statusCode).toBe(200); expect(imported.json().job.importedRecords).toBe(1);
    const contacts = await app.inject("/api/contacts?search=novo.dev"); const contact = contacts.json().data[0];
    const analysis = await app.inject({ method: "POST", url: "/api/analyses", payload: { contactIds: [contact.id] } }); expect(analysis.json().processedContacts).toBe(1);
    const updated = await app.inject({ method: "PATCH", url: `/api/contacts/${contact.id}/pipeline`, payload: { status: "SHORTLISTED" } }); expect(updated.json().pipeline.status).toBe("SHORTLISTED");
    await app.close();
  });
  it("não permite cancelar job já concluído", async () => {
    const app = await buildApp({ config }); await app.inject({ method: "POST", url: "/api/onboarding/demo" }); const contact = (await app.inject("/api/contacts")).json().data[0]; const job = (await app.inject({ method: "POST", url: "/api/analyses", payload: { contactIds: [contact.id] } })).json();
    expect((await app.inject({ method: "POST", url: `/api/analyses/${job.id}/cancel` })).statusCode).toBe(409); await app.close();
  });
});
