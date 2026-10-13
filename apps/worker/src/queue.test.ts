import { describe, expect, it } from "vitest";
import { analysisJobOptions } from "./queue.js";
describe("política de retry da fila", () => {
  it("usa retry exponencial e preserva falhas para recuperação parcial", () => {
    expect(analysisJobOptions.attempts).toBe(4);
    expect(analysisJobOptions.backoff).toEqual({ type: "exponential", delay: 1000 });
    expect(analysisJobOptions.removeOnFail).toBeGreaterThan(0);
  });
});
