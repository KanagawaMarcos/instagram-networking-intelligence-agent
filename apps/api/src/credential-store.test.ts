import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileCredentialStore } from "./credential-store.js";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("cofre local de credenciais", () => {
  it("criptografa token em disco e o recupera sem expô-lo", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nexo-credentials-"));
    directories.push(directory);
    const settingsPath = join(directory, "instagram-credentials.enc");
    const store = new FileCredentialStore({ settingsPath, encryptionKey: "a-secure-development-key-with-more-than-32-characters", nodeEnv: "test" });
    await store.save({ accountId: "17841400000000000", accessToken: "super-secret-token" });
    expect(await store.get()).toMatchObject({ accountId: "17841400000000000", accessToken: "super-secret-token" });
    expect(await readFile(settingsPath, "utf8")).not.toContain("super-secret-token");
    await store.clear();
    expect(await store.get()).toBeUndefined();
  });
});
