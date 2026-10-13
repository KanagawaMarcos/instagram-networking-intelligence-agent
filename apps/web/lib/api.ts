const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? `Erro ${response.status}`); }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export { API_URL };
