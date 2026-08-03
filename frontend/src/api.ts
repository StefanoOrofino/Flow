import { storage } from "@/src/utils/storage";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
export const TOKEN_KEY = "storyboard_token";

let memToken: string | null = null;

export async function setToken(t: string | null) {
  memToken = t;
  if (t) await storage.secureSet(TOKEN_KEY, t);
  else await storage.secureRemove(TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  if (memToken) return memToken;
  const t = await storage.secureGet<string>(TOKEN_KEY, "");
  memToken = t || null;
  return memToken;
}

async function req(path: string, method = "GET", body?: any) {
  const token = await getToken();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const detail = (data && data.detail) || `Request failed (${res.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export const api = {
  register: (b: any) => req("/auth/register", "POST", b),
  login: (b: any) => req("/auth/login", "POST", b),
  me: () => req("/auth/me"),
  googleSession: (session_id: string) => req("/auth/session", "POST", { session_id }),
  resetRequest: (email: string) => req("/auth/password-reset/request", "POST", { email }),
  resetConfirm: (token: string, new_password: string) =>
    req("/auth/password-reset/confirm", "POST", { token, new_password }),

  listProjects: () => req("/projects"),
  createProject: (b: any) => req("/projects", "POST", b),
  getProject: (id: string) => req(`/projects/${id}`),
  updateProject: (id: string, data: any) => req(`/projects/${id}`, "PUT", { data }),
  deleteProject: (id: string) => req(`/projects/${id}`, "DELETE"),
  duplicateProject: (id: string) => req(`/projects/${id}/duplicate`, "POST"),
  generate: (id: string) => req(`/projects/${id}/generate`, "POST"),
  regenScene: (id: string, sid: string) => req(`/projects/${id}/scenes/${sid}/regenerate`, "POST"),
  regenImagePrompt: (id: string, sid: string) =>
    req(`/projects/${id}/scenes/${sid}/regenerate-image-prompt`, "POST"),
  templates: () => req("/templates"),
};
