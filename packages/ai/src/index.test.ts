import { describe, expect, it } from "vitest";
import { DemoAnalysisEngine } from "./index.js";

describe("motor de análise", () => {
  it("valida saída estruturada e reconhece evidência disponível", async () => {
    const output = await new DemoAnalysisEngine().analyze({ username: "livia", biography: "CTO e engenheira de software. Sistemas distribuídos.", goals: ["TECH_LEADERS"] });
    expect(output.assessment.category).toBe("TECH_LEADER");
    expect(output.assessment.evidence[0]?.field).toBe("biography");
  });
  it("não inventa informação sem biografia", async () => {
    const output = await new DemoAnalysisEngine().analyze({ username: "sem_dados", goals: [] });
    expect(output.assessment.category).toBe("UNKNOWN");
    expect(output.assessment.missingInformation).toContain("biografia");
  });
});
