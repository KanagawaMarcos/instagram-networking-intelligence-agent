import { describe, expect, it } from "vitest";
import { normalizeUsername } from "./index.js";

describe("normalização de username", () => {
  it("remove arroba, normaliza caixa e espaços", () => {
    expect(normalizeUsername(" @Ana.Dev ")).toBe("ana.dev");
  });
  it("rejeita usernames inválidos", () => {
    expect(normalizeUsername("ana dev!")).toBeNull();
  });
});
