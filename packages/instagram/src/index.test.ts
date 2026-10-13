import { describe, expect, it } from "vitest";
import { InstagramGraphProvider, MockInstagramProvider } from "./index.js";

describe("capabilidades da API Instagram", () => {
  it("declara indisponível sem credenciais", async () => {
    const states = await new InstagramGraphProvider().getCapabilities();
    expect(states.every((state) => state.status === "UNAVAILABLE")).toBe(true);
  });
  it("converte 429 em rate limit", async () => {
    const provider = new InstagramGraphProvider({ accessToken: "x", accountId: "1", fetcher: async () => new Response("{}", { status: 429, headers: { "retry-after": "60" } }) });
    const states = await provider.getCapabilities();
    expect(states[0]?.status).toBe("RATE_LIMITED");
  });
  it("não alega descoberta no modo demo", async () => {
    const states = await new MockInstagramProvider().getCapabilities();
    expect(states.find((state) => state.capability === "business_discovery")?.status).toBe("UNAVAILABLE");
  });
});
