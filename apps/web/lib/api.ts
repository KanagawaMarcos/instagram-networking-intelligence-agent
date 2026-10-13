const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? `Erro ${response.status}`); }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export { API_URL };
