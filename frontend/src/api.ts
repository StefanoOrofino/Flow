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
    const detail = data && data.detail;
    if (detail && typeof detail === "object") {
      const err: any = new Error(detail.message || `Request failed (${res.status})`);
      err.detail = detail;
      err.status = res.status;
      if (detail.code === "plan_limit_reached" || detail.code === "storage_limit_reached") {
        err.planLimit = true;
      }
      throw err;
    }
    const msg = (typeof detail === "string" && detail) || `Request failed (${res.status})`;
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
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
  deleteAccount: () => req("/auth/account", "DELETE"),

  listProjects: () => req("/projects"),
  createProject: (b: any) => req("/projects", "POST", b),
  getProject: (id: string) => req(`/projects/${id}`),
  updateProject: (id: string, data: any) => req(`/projects/${id}`, "PUT", { data }),
  deleteProject: (id: string) => req(`/projects/${id}`, "DELETE"),
  duplicateProject: (id: string) => req(`/projects/${id}/duplicate`, "POST"),
  markExported: (id: string) => req(`/projects/${id}/exported`, "POST"),
  generate: (id: string) => req(`/projects/${id}/generate`, "POST"),
  regenScene: (id: string, sid: string) => req(`/projects/${id}/scenes/${sid}/regenerate`, "POST"),
  regenImagePrompt: (id: string, sid: string) =>
    req(`/projects/${id}/scenes/${sid}/regenerate-image-prompt`, "POST"),
  regenDialogue: (id: string, sid: string) =>
    req(`/projects/${id}/scenes/${sid}/regenerate-dialogue`, "POST"),
  regenCamera: (id: string, sid: string) =>
    req(`/projects/${id}/scenes/${sid}/regenerate-camera`, "POST"),
  regenDescription: (id: string, sid: string) =>
    req(`/projects/${id}/scenes/${sid}/regenerate-description`, "POST"),
  regenVoiceOver: (id: string, sid: string) =>
    req(`/projects/${id}/scenes/${sid}/regenerate-voiceover`, "POST"),
  regenLighting: (id: string, sid: string) =>
    req(`/projects/${id}/scenes/${sid}/regenerate-lighting`, "POST"),
  // Storyboard image frames (provider-agnostic; mock/none until a real provider is wired)
  imageProvider: () => req("/image-provider"),
  getSettings: () => req("/settings"),
  updateSettings: (image_model: string) => req("/settings", "PUT", { image_model }),
  assistantChat: (body: { messages: any[]; project_id?: string | null; language?: string }) =>
    req("/assistant/chat", "POST", body),
  generateFrame: (id: string, sid: string, body: any = {}) =>
    req(`/projects/${id}/scenes/${sid}/frames/generate`, "POST", body),
  regenerateFrame: (id: string, sid: string, fid: string, body: any = {}) =>
    req(`/projects/${id}/scenes/${sid}/frames/${fid}/regenerate`, "POST", body),
  setActiveFrame: (id: string, sid: string, fid: string) =>
    req(`/projects/${id}/scenes/${sid}/frames/${fid}/active`, "POST"),
  deleteFrame: (id: string, sid: string, fid: string) =>
    req(`/projects/${id}/scenes/${sid}/frames/${fid}`, "DELETE"),
  templates: () => req("/templates"),
  // AI Director (provider-agnostic revision engine)
  directorRevise: (id: string, instruction: string, scope: string) =>
    req(`/projects/${id}/director/revise`, "POST", { instruction, scope }),
  directorApply: (id: string, preview: any, summary: string) =>
    req(`/projects/${id}/director/apply`, "POST", { preview, summary }),
  listVersions: (id: string) => req(`/projects/${id}/versions`),
  restoreVersion: (id: string, vid: string) => req(`/projects/${id}/versions/${vid}/restore`, "POST"),
  renameVersion: (id: string, vid: string, name: string) => req(`/projects/${id}/versions/${vid}`, "PUT", { name }),
  deleteVersion: (id: string, vid: string) => req(`/projects/${id}/versions/${vid}`, "DELETE"),
  // Billing (Stripe checkout — Emergent test key)
  billingSummary: () => req("/billing/summary"),
  startCheckout: (plan: string, origin_url: string) => req("/billing/checkout", "POST", { plan, origin_url }),
  checkoutStatus: (sid: string) => req(`/billing/checkout/status/${sid}`),
  cancelPlan: () => req("/billing/cancel", "POST"),
  paypalCreateOrder: (plan: string, origin_url: string) => req("/billing/paypal/order", "POST", { plan, origin_url }),
  paypalCapture: (orderId: string) => req(`/billing/paypal/capture/${orderId}`, "POST"),
  // Create Project from Client Brief (Run 1)
  analyzeBrief: (body: { documents: any[]; images: any[] }) => req("/briefs/analyze", "POST", body),
  createProjectFromBrief: (body: any) => req("/briefs/create-project", "POST", body),
  // Admin Console (RBAC — server enforced)
  adminStatus: () => req("/admin/status"),
  adminClaimOwner: () => req("/admin/claim-owner", "POST"),
  adminSummary: () => req("/admin/summary"),
  adminUsers: () => req("/admin/users"),
  adminSetRole: (uid: string, role: string) => req(`/admin/users/${uid}/role`, "PATCH", { role }),
  adminProjects: () => req("/admin/projects"),
  adminAudit: () => req("/admin/audit"),
};
