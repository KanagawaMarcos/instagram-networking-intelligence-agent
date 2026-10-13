import { describe, expect, it } from "vitest";
import { calculateRanking } from "./index.js";

describe("ranking determinístico", () => {
  it("explica o score e não trata informação ausente como evidência negativa", () => {
    const score = calculateRanking({ category: "FOUNDER", aiRelevance: 80, confidence: 0.8, opportunities: 3, interactions: 0, hasBiography: false, hasProfessionalFields: 0, goals: ["FOUNDERS"] });
    expect(score.finalScore).toBeGreaterThan(40);
    expect(score.explanation.find((item) => item.factor === "Evidência de interação")?.rawScore).toBe(50);
  });
  it("rejeita pesos que não fecham 100%", () => {
    expect(() => calculateRanking({ category: "UNKNOWN", aiRelevance: 0, confidence: 0, opportunities: 0, interactions: 0, hasBiography: false, hasProfessionalFields: 0, goals: [] }, { professionalRelevance: 0.3, collaborationValue: 0.3, interactionEvidence: 0.3, informationQuality: 0.3 })).toThrow();
  });
});
