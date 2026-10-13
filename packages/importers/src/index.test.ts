import { describe, expect, it } from "vitest";
import { parseImport, parseManualUsernames } from "./index.js";

describe("importação", () => {
  it("deduplica CSV e preserva origem", () => {
    const result = parseImport("username,display_name\n@Ana.Dev,Ana\nana.dev,Ana repetida\ninválido!,X", "seguidores.csv");
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({ username: "ana.dev", source: "FILE_IMPORT" });
    expect(result.duplicateRecords).toBe(1);
    expect(result.invalidRecords).toHaveLength(1);
  });
  it("lê formato de exportação do Instagram sem assumir biografia", () => {
    const data = JSON.stringify({ relationships_followers: [{ string_list_data: [{ value: "dev.br" }] }] });
    expect(parseImport(data, "followers_1.json").records[0]?.username).toBe("dev.br");
  });
  it("aceita entrada manual", () => {
    expect(parseManualUsernames("@primeiro, segundo\nprimeiro").records.map((x) => x.username)).toEqual(["primeiro", "segundo"]);
  });
});
