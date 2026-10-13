import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppConfig } from "@ina/config";

export type InstagramCredentials = { accessToken: string; accountId: string; updatedAt: string };
export type CredentialStorageSource = "SECURE_LOCAL_STORAGE" | "ENVIRONMENT" | "NONE";
export type CredentialStatus = { configured: boolean; source: CredentialStorageSource; accountIdHint?: string; encryption: "ENVIRONMENT_KEY" | "LOCAL_DEVELOPMENT_KEY" | "NOT_CONFIGURED" };

type EncryptedPayload = { version: 1; iv: string; tag: string; ciphertext: string };

export interface CredentialStore {
  get(): Promise<InstagramCredentials | undefined>;
  save(credentials: Omit<InstagramCredentials, "updatedAt">): Promise<void>;
  clear(): Promise<void>;
  status(): Promise<CredentialStatus>;
}

const accountIdHint = (accountId: string) => accountId.length <= 6 ? accountId : `••••${accountId.slice(-6)}`;

export class InMemoryCredentialStore implements CredentialStore {
  private credentials?: InstagramCredentials;
  async get() { return this.credentials; }
  async save(credentials: Omit<InstagramCredentials, "updatedAt">) { this.credentials = { ...credentials, updatedAt: new Date().toISOString() }; }
  async clear() { this.credentials = undefined; }
  async status(): Promise<CredentialStatus> { return this.credentials ? { configured: true, source: "SECURE_LOCAL_STORAGE", accountIdHint: accountIdHint(this.credentials.accountId), encryption: "LOCAL_DEVELOPMENT_KEY" } : { configured: false, source: "NONE", encryption: "NOT_CONFIGURED" }; }
}

export class FileCredentialStore implements CredentialStore {
  private readonly settingsPath: string;
  private readonly keyPath: string;
  constructor(private readonly options: { settingsPath?: string; encryptionKey?: string; nodeEnv: AppConfig["NODE_ENV"] }) {
    this.settingsPath = options.settingsPath ?? join(process.cwd(), ".nexo", "instagram-credentials.enc");
    this.keyPath = `${this.settingsPath}.key`;
  }

  private async encryptionKey() {
    if (this.options.encryptionKey) return { key: createHash("sha256").update(this.options.encryptionKey).digest(), encryption: "ENVIRONMENT_KEY" as const };
    if (this.options.nodeEnv === "production") throw new Error("Defina INTEGRATION_CREDENTIAL_ENCRYPTION_KEY no servidor de produção antes de salvar credenciais.");
    try {
      const existing = await readFile(this.keyPath, "utf8");
      return { key: Buffer.from(existing.trim(), "base64"), encryption: "LOCAL_DEVELOPMENT_KEY" as const };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(dirname(this.keyPath), { recursive: true, mode: 0o700 });
      const key = randomBytes(32);
      await writeFile(this.keyPath, key.toString("base64"), { mode: 0o600 });
      await chmod(this.keyPath, 0o600);
      return { key, encryption: "LOCAL_DEVELOPMENT_KEY" as const };
    }
  }

  async get(): Promise<InstagramCredentials | undefined> {
    let serialized: string;
    try { serialized = await readFile(this.settingsPath, "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
    const payload = JSON.parse(serialized) as EncryptedPayload;
    if (payload.version !== 1) throw new Error("Formato de credencial local não suportado.");
    const { key } = await this.encryptionKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as InstagramCredentials;
  }

  async save(credentials: Omit<InstagramCredentials, "updatedAt">) {
    const { key } = await this.encryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify({ ...credentials, updatedAt: new Date().toISOString() }));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const payload: EncryptedPayload = { version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
    await mkdir(dirname(this.settingsPath), { recursive: true, mode: 0o700 });
    await writeFile(this.settingsPath, JSON.stringify(payload), { mode: 0o600 });
    await chmod(this.settingsPath, 0o600);
  }

  async clear() {
    try { await unlink(this.settingsPath); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }

  async status(): Promise<CredentialStatus> {
    const credentials = await this.get();
    const encryption = credentials ? (await this.encryptionKey()).encryption : "NOT_CONFIGURED";
    return credentials ? { configured: true, source: "SECURE_LOCAL_STORAGE", accountIdHint: accountIdHint(credentials.accountId), encryption } : { configured: false, source: "NONE", encryption };
  }
}

export function createCredentialStore(config: AppConfig): CredentialStore {
  if (config.NODE_ENV === "test") return new InMemoryCredentialStore();
  return new FileCredentialStore({ settingsPath: config.NEXO_INTEGRATION_SETTINGS_PATH, encryptionKey: config.INTEGRATION_CREDENTIAL_ENCRYPTION_KEY, nodeEnv: config.NODE_ENV });
}
