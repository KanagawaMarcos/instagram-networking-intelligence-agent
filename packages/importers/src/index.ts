import { parse } from "csv-parse/sync";
import { importRecordSchema, normalizeUsername, type ImportRecord, safeText } from "@ina/shared";

export type ImportResult = {
  records: ImportRecord[];
  duplicateRecords: number;
  invalidRecords: Array<{ row: number; reason: string }>;
  detectedFormat: "csv" | "json" | "instagram-export" | "manual";
};

type RawRecord = Record<string, unknown>;

function firstString(record: RawRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = safeText(record[key]);
    if (value) return value;
  }
  return undefined;
}

function flattenInstagramExport(value: unknown, output: RawRecord[] = []): RawRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) flattenInstagramExport(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    const entry = value as RawRecord;
    const directUsername = firstString(entry, ["username", "user_name", "handle"]);
    const stringList = Array.isArray(entry.string_list_data) ? entry.string_list_data[0] as RawRecord | undefined : undefined;
    const exportValue = firstString(entry, ["value", "title"]) ?? (stringList ? firstString(stringList, ["value"]) : undefined);
    if (directUsername || exportValue) output.push({ ...entry, username: directUsername ?? exportValue });
    for (const nested of Object.values(entry)) {
      if (nested && typeof nested === "object") flattenInstagramExport(nested, output);
    }
  }
  return output;
}

function coerceRecord(raw: RawRecord, source: string): Omit<ImportRecord, "username"> & { username?: string } {
  const username = firstString(raw, ["username", "instagramUsername", "instagram_username", "handle", "user_name", "value", "title"]);
  const displayName = firstString(raw, ["displayName", "display_name", "name", "full_name"]);
  const biography = firstString(raw, ["biography", "bio", "description"]);
  const profileUrl = firstString(raw, ["profileUrl", "profile_url", "url"]);
  return { username, displayName, biography, profileUrl, source };
}

export function parseImport(content: string, filename = "import.csv", source = "FILE_IMPORT"): ImportResult {
  const isJson = filename.toLowerCase().endsWith(".json") || content.trim().startsWith("[") || content.trim().startsWith("{");
  let values: RawRecord[];
  let detectedFormat: ImportResult["detectedFormat"];
  try {
    if (isJson) {
      const decoded = JSON.parse(content) as unknown;
      values = flattenInstagramExport(decoded);
      detectedFormat = values.some((value) => "string_list_data" in value) ? "instagram-export" : "json";
    } else {
      values = parse(content, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }) as RawRecord[];
      detectedFormat = "csv";
    }
  } catch (error) {
    return { records: [], duplicateRecords: 0, invalidRecords: [{ row: 0, reason: error instanceof Error ? error.message : "Arquivo inválido" }], detectedFormat: isJson ? "json" : "csv" };
  }

  const seen = new Set<string>();
  const records: ImportRecord[] = [];
  const invalidRecords: ImportResult["invalidRecords"] = [];
  let duplicateRecords = 0;
  for (const [index, raw] of values.entries()) {
    const candidate = coerceRecord(raw, source);
    const username = candidate.username ? normalizeUsername(candidate.username) : null;
    if (!username) {
      invalidRecords.push({ row: index + 1, reason: "Username ausente ou inválido" });
      continue;
    }
    if (seen.has(username)) {
      duplicateRecords++;
      continue;
    }
    const parsed = importRecordSchema.safeParse({ ...candidate, username });
    if (!parsed.success) {
      invalidRecords.push({ row: index + 1, reason: parsed.error.issues[0]?.message ?? "Registro inválido" });
      continue;
    }
    seen.add(username);
    records.push(parsed.data);
  }
  return { records, duplicateRecords, invalidRecords, detectedFormat };
}

export function parseManualUsernames(input: string): ImportResult {
  const values = input.split(/[\n,;\s]+/).filter(Boolean).map((username) => ({ username }));
  const result = parseImport(JSON.stringify(values), "manual.json", "MANUAL_ENTRY");
  return { ...result, detectedFormat: "manual" };
}
