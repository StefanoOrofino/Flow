import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "@/src/api";

export type SaveState = "idle" | "unsaved" | "saving" | "saved" | "offline" | "recovering" | "error";

const rid = () => Math.random().toString(36).slice(2, 12);
const SERVER_KEYS = ["id", "user_id", "_id"];

// ---------------------------------------------------------------------------
// Validation + auto-repair. Runs on every state transition so a project can
// never become internally inconsistent (single source of truth guarantees).
// ---------------------------------------------------------------------------
export function normalizeProject(p: any): any {
  if (!p) return p;
  const scenes = Array.isArray(p.scenes) ? p.scenes : [];
  const seenScene = new Set<string>();
  const fixedScenes = scenes.map((sc: any, i: number) => {
    let id = sc?.id || rid();
    if (seenScene.has(id)) id = rid();
    seenScene.add(id);
    const scene: any = { ...sc, id, scene_number: i + 1 };

    let shots = Array.isArray(scene.shots) ? scene.shots.filter((s: any) => s && (s.id || s.label)) : [];
    const seenShot = new Set<string>();
    let primarySeen = false;
    shots = shots.map((s: any, j: number) => {
      let sid = s.id || `${id}-${j}`;
      if (seenShot.has(sid)) sid = rid();
      seenShot.add(sid);
      let is_primary = !!s.is_primary;
      if (is_primary) { if (primarySeen) is_primary = false; else primarySeen = true; }
      return { ...s, id: sid, is_primary, data: s.data || {}, checklist: s.checklist || {} };
    });
    if (shots.length && !primarySeen) shots[0] = { ...shots[0], is_primary: true };

    scene.shots = shots;
    scene.comment_list = Array.isArray(scene.comment_list) ? scene.comment_list : [];
    scene.frames = Array.isArray(scene.frames) ? scene.frames : [];
    if (!scene.active_frame_id) scene.active_frame_id = "";
    if (!scene.status) scene.status = "Draft";
    return scene;
  });
  return { ...p, scenes: fixedScenes };
}

function serialize(p: any): any {
  const out: any = { ...p };
  SERVER_KEYS.forEach((k) => delete out[k]);
  return out;
}

const isOnline = () => (typeof navigator !== "undefined" && "onLine" in navigator ? navigator.onLine : true);

// ---------------------------------------------------------------------------
export function useProjectStore(id: string) {
  const [project, setProjectState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [histTick, setHistTick] = useState(0); // forces canUndo/canRedo recompute

  const ref = useRef<any>(null);
  const past = useRef<any[]>([]);
  const future = useRef<any[]>([]);
  const saveTimer = useRef<any>(null);
  const retryTimer = useRef<any>(null);
  const savedTimer = useRef<any>(null);
  const retries = useRef(0);
  const dirty = useRef(false); // there are local changes not yet confirmed saved

  const apply = useCallback((next: any) => { ref.current = next; setProjectState(next); }, []);
  const bumpHist = () => setHistTick((t) => t + 1);

  const doSave = useCallback(async () => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    if (!ref.current) return;
    if (!isOnline()) { setSaveState("offline"); return; }
    setSaveState((s) => (s === "recovering" ? "recovering" : "saving"));
    const snapshot = ref.current;
    try {
      await api.updateProject(id, serialize(snapshot));
      // If new edits arrived while saving, ref.current changed -> keep dirty, save again.
      if (ref.current !== snapshot) { dirty.current = true; saveTimer.current = setTimeout(() => doSave(), 0); return; }
      retries.current = 0;
      dirty.current = false;
      setSaveState("saved");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1400);
    } catch {
      // Never lose work: keep local changes, retry with backoff.
      retries.current += 1;
      setSaveState(isOnline() ? "recovering" : "offline");
      const delay = Math.min(30000, 1500 * 2 ** Math.min(retries.current - 1, 4));
      retryTimer.current = setTimeout(() => doSave(), delay);
    }
  }, [id]);

  const scheduleSave = useCallback((delay = 700) => {
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(), delay);
  }, [doSave]);

  // ---- public mutators ----
  const mutate = useCallback((updater: (p: any) => any) => {
    const prev = ref.current;
    if (!prev) return;
    const next = normalizeProject(updater(prev));
    past.current.push(prev);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    bumpHist();
    apply(next);
    setSaveState("unsaved");
    scheduleSave();
  }, [apply, scheduleSave]);

  // Server already persisted this (AI regen / frames) -> record history, no save.
  const applyServer = useCallback((pr: any) => {
    const prev = ref.current;
    if (prev) { past.current.push(prev); if (past.current.length > 100) past.current.shift(); future.current = []; bumpHist(); }
    apply(normalizeProject(pr));
    dirty.current = false;
    setSaveState("saved");
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1400);
  }, [apply]);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current.pop();
    future.current.push(ref.current);
    bumpHist();
    apply(prev);
    setSaveState("unsaved");
    scheduleSave(200);
  }, [apply, scheduleSave]);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    const next = future.current.pop();
    past.current.push(ref.current);
    bumpHist();
    apply(next);
    setSaveState("unsaved");
    scheduleSave(200);
  }, [apply, scheduleSave]);

  const load = useCallback(async () => {
    try {
      const pr = normalizeProject(await api.getProject(id));
      apply(pr);
      past.current = []; future.current = []; bumpHist();
      setSaveState("idle");
    } catch (e) {
      throw e;
    } finally { setLoading(false); }
  }, [id, apply]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  // Online / offline recovery: flush pending work as soon as we reconnect.
  useEffect(() => {
    if (typeof window === "undefined" || !window.addEventListener) return;
    const onOnline = () => { if (dirty.current) { setSaveState("recovering"); doSave(); } };
    const onOffline = () => { if (dirty.current) setSaveState("offline"); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [doSave]);

  useEffect(() => () => {
    [saveTimer, retryTimer, savedTimer].forEach((t) => t.current && clearTimeout(t.current));
  }, []);

  return {
    project, loading, saveState,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    mutate, applyServer, undo, redo, reload: load,
    _histTick: histTick,
  };
}
