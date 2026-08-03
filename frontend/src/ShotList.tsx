import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, S, R, F, MAX_W } from "@/src/theme";
import { exportShotListPdf, exportShotListCsv, exportShotListExcel, printShotList } from "@/src/exporter";

// Shared fields = single source of truth living on the SCENE (two-way sync with Storyboard).
// Editing the PRIMARY shot writes straight to the scene; editing a secondary shot stores a
// shot-level value (a genuinely different shot of the same scene — not duplicated data).
const SHARED: Record<string, string> = {
  description: "visual_description", location: "location", day_night: "time_of_day",
  shot_type: "shot_size", camera_angle: "camera_angle", camera_height: "camera_height",
  camera_direction: "camera_direction", camera_movement: "camera_movement", lens: "focal_length",
  frame_rate: "frame_rate", resolution: "resolution", est_duration: "duration", est_shoot_time: "estimated_time",
  characters: "characters", props: "props", wardrobe: "wardrobe", audio: "sound_notes",
  lighting: "lighting", equipment: "equipment", director_notes: "director_notes", production_notes: "production_notes",
};

export const SHOT_STATUSES = ["Draft", "Ready", "Approved", "Shot", "Needs Review"];
const STATUS_COLOR: Record<string, string> = {
  "Draft": C.onSurface2, "Ready": C.warning, "Approved": C.brand, "Shot": C.success, "Needs Review": C.error,
};
const CHECKLIST = [
  ["camera", "Camera"], ["lens", "Lens"], ["lighting", "Lighting"], ["audio", "Audio"],
  ["talent", "Talent"], ["location", "Location"], ["props", "Props"],
] as const;

const letter = (i: number) => String.fromCharCode(65 + i);
const rid = () => Math.random().toString(36).slice(2, 10);
const parseNum = (s: any) => { const m = String(s || "").match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; };
const minutesOf = (row: any) => parseNum(row.est_shoot_time) || 45;

function newShot(i: number, isPrimary: boolean): any {
  return { id: rid(), label: letter(i), is_primary: isPrimary, name: "", status: "Draft",
    int_ext: "", music: "", aspect_ratio: "", shooting_order: 0, checklist: {}, data: {} };
}
function ensureShots(scene: any): any[] {
  if (scene.shots && scene.shots.length) return scene.shots;
  return [{ ...newShot(0, true), id: scene.id + "-A" }];
}

// ---------------------------------------------------------------------------
export default function ShotList({ project, commitScene, onEditInStoryboard }: any) {
  const scenes = project.scenes || [];
  const { width } = useWindowDimensions();
  const wide = width > 900;
  const projectAspect = project.aspect_ratio || "16:9";

  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<"scene" | "location" | "day" | "status" | "none">("scene");
  const [sortBy, setSortBy] = useState<"storyboard" | "shooting" | "location" | "time" | "status">("storyboard");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showControls, setShowControls] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // ---- value getter / setter (two-way sync) ----
  const getVal = useCallback((scene: any, shot: any, key: string): string => {
    if (SHARED[key]) {
      if (shot.is_primary) return String(scene[SHARED[key]] ?? "");
      const ov = shot.data?.[key];
      return String((ov !== undefined && ov !== "") ? ov : (scene[SHARED[key]] ?? ""));
    }
    if (key === "name") return shot.name || scene.title || "";
    if (key === "int_ext") return shot.int_ext || "INT";
    if (key === "aspect_ratio") return shot.aspect_ratio || projectAspect;
    if (key === "shooting_order") return shot.shooting_order ? String(shot.shooting_order) : "";
    if (key === "status") return shot.status || "Draft";
    return String(shot[key] ?? "");
  }, [projectAspect]);

  const setShots = useCallback((sceneId: string, shots: any[]) => commitScene(sceneId, { shots }), [commitScene]);

  const setVal = useCallback((scene: any, shot: any, key: string, value: string) => {
    if (SHARED[key] && shot.is_primary) {
      // Also materialize scene.shots so the primary shot metadata persists
      const shots = ensureShots(scene);
      commitScene(scene.id, { [SHARED[key]]: value, shots });
      return;
    }
    const shots = ensureShots(scene).map((s: any) => {
      if (s.id !== shot.id) return s;
      if (SHARED[key]) return { ...s, data: { ...(s.data || {}), [key]: value } };
      if (key === "shooting_order") return { ...s, shooting_order: parseInt(value, 10) || 0 };
      return { ...s, [key]: value };
    });
    setShots(scene.id, shots);
  }, [commitScene, setShots]);

  const toggleCheck = (scene: any, shot: any, item: string) => {
    const shots = ensureShots(scene).map((s: any) => s.id === shot.id
      ? { ...s, checklist: { ...(s.checklist || {}), [item]: !(s.checklist || {})[item] } } : s);
    setShots(scene.id, shots);
  };
  const addShot = (scene: any) => {
    const cur = ensureShots(scene);
    setShots(scene.id, [...cur, newShot(cur.length, false)]);
  };
  const duplicateShot = (scene: any, shot: any) => {
    const cur = ensureShots(scene);
    const idx = cur.findIndex((s: any) => s.id === shot.id);
    const copy = { ...shot, id: rid(), label: letter(cur.length), is_primary: false, data: { ...(shot.data || {}) }, checklist: { ...(shot.checklist || {}) } };
    // A duplicate of the primary must capture the scene's current shared values so it stays distinct
    if (shot.is_primary) { copy.data = {}; Object.keys(SHARED).forEach((k) => { copy.data[k] = getVal(scene, shot, k); }); }
    const next = [...cur]; next.splice(idx + 1, 0, copy);
    setShots(scene.id, next);
  };
  const deleteShot = (scene: any, shot: any) => {
    const cur = ensureShots(scene).filter((s: any) => s.id !== shot.id);
    setShots(scene.id, cur.length ? cur : ensureShots({ ...scene, shots: [] }));
  };

  // ---- build flat rows ----
  const rows = useMemo(() => {
    const out: any[] = [];
    let running = 0;
    scenes.forEach((scene: any, si: number) => {
      ensureShots(scene).forEach((shot: any) => {
        running += 1;
        const r: any = { scene, shot, sceneIndex: si, storyboard_order: scene.scene_number || si + 1,
          shot_code: `${scene.scene_number || si + 1}${shot.label}` };
        Object.keys(SHARED).forEach((k) => { r[k] = getVal(scene, shot, k); });
        r.name = getVal(scene, shot, "name");
        r.int_ext = getVal(scene, shot, "int_ext");
        r.aspect_ratio = getVal(scene, shot, "aspect_ratio");
        r.music = getVal(scene, shot, "music");
        r.status = getVal(scene, shot, "status");
        r.shooting_order = shot.shooting_order || running;
        r.checklist = shot.checklist || {};
        r._running = running;
        out.push(r);
      });
    });
    return out;
  }, [scenes, getVal]);

  // ---- filters / search / sort ----
  const uniq = (key: string) => Array.from(new Set(rows.map((r) => String(r[key] || "").trim()).filter(Boolean)));
  const filterDefs = [
    { key: "location", label: "Location" }, { key: "status", label: "Status" },
    { key: "shot_code_scene", label: "Scene", vals: Array.from(new Set(rows.map((r) => String(r.storyboard_order)))) },
    { key: "lens", label: "Lens" }, { key: "camera_angle", label: "Camera" },
    { key: "camera_movement", label: "Movement" }, { key: "int_ext", label: "Int/Ext" },
    { key: "day_night", label: "Day/Night" },
  ];

  const filtered = useMemo(() => {
    let r = rows;
    const q = query.trim().toLowerCase();
    if (q) r = r.filter((x) => [x.name, x.description, x.location, x.shot_code, x.lens, x.characters, x.props, x.director_notes]
      .some((v) => String(v || "").toLowerCase().includes(q)));
    Object.entries(filters).forEach(([k, v]) => {
      if (!v) return;
      if (k === "shot_code_scene") r = r.filter((x) => String(x.storyboard_order) === v);
      else r = r.filter((x) => String(x[k] || "").trim() === v);
    });
    const cmp: Record<string, (a: any, b: any) => number> = {
      storyboard: (a, b) => a.storyboard_order - b.storyboard_order || a._running - b._running,
      shooting: (a, b) => a.shooting_order - b.shooting_order,
      location: (a, b) => String(a.location).localeCompare(String(b.location)),
      time: (a, b) => minutesOf(b) - minutesOf(a),
      status: (a, b) => SHOT_STATUSES.indexOf(a.status) - SHOT_STATUSES.indexOf(b.status),
    };
    return [...r].sort(cmp[sortBy]);
  }, [rows, query, filters, sortBy]);

  // ---- grouping ----
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "All Shots", rows: filtered }];
    const map = new Map<string, any[]>();
    filtered.forEach((r) => {
      const g = groupBy === "scene" ? `Scene ${r.storyboard_order} · ${r.scene.title}`
        : groupBy === "location" ? (r.location || "No location")
        : groupBy === "day" ? (r.day_night || "Unscheduled")
        : (r.status || "Draft");
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    });
    return Array.from(map.entries()).map(([key, rs]) => ({ key, rows: rs, scene: rs[0]?.scene }));
  }, [filtered, groupBy]);

  // ---- stats ----
  const stats = useMemo(() => {
    const totalShots = rows.length;
    const totalMin = rows.reduce((n, r) => n + minutesOf(r), 0);
    const durs = rows.map((r) => parseNum(r.est_duration)).filter(Boolean);
    const avgDur = durs.length ? (durs.reduce((a, b) => a + b, 0) / durs.length) : 0;
    const sceneMins = new Map<number, number>();
    rows.forEach((r) => sceneMins.set(r.storyboard_order, (sceneMins.get(r.storyboard_order) || 0) + minutesOf(r)));
    const sceneArr = Array.from(sceneMins.entries());
    const longest = sceneArr.sort((a, b) => b[1] - a[1])[0];
    const shortest = sceneArr.sort((a, b) => a[1] - b[1])[0];
    const done = rows.filter((r) => r.status === "Approved" || r.status === "Shot").length;
    const fmtH = (m: number) => m >= 60 ? `${Math.round(m / 6) / 10} hrs` : `${Math.round(m)} min`;
    return {
      totalShots, wrap: fmtH(totalMin), avgDur: avgDur ? `${Math.round(avgDur)}s` : "—",
      longest: longest ? `Scene ${longest[0]}` : "—", shortest: shortest ? `Scene ${shortest[0]}` : "—",
      locations: uniq("location").length, lenses: uniq("lens"), movements: uniq("camera_movement"),
      completion: totalShots ? Math.round((done / totalShots) * 100) : 0,
    };
  }, [rows]);

  const flatForExport = () => filtered.map((r) => ({
    shot_code: r.shot_code, storyboard_order: r.storyboard_order, shooting_order: r.shooting_order,
    name: r.name, description: r.description, location: r.location, int_ext: r.int_ext, day_night: r.day_night,
    shot_type: r.shot_type, camera_angle: r.camera_angle, camera_movement: r.camera_movement, lens: r.lens,
    frame_rate: r.frame_rate, resolution: r.resolution, aspect_ratio: r.aspect_ratio,
    est_duration: r.est_duration, est_shoot_time: r.est_shoot_time, characters: r.characters, props: r.props,
    wardrobe: r.wardrobe, audio: r.audio, music: r.music, lighting: r.lighting, equipment: r.equipment,
    director_notes: r.director_notes, production_notes: r.production_notes, status: r.status,
  }));

  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: f[k] === v ? "" : v }));

  return (
    <View style={{ flex: 1 }}>
      {/* Toolbar */}
      <View style={s.toolbar}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={15} color={C.onSurface2} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search shots…" placeholderTextColor={C.onSurface2}
            style={s.search} testID="shot-search" />
        </View>
        <Pressable style={[s.ctrlBtn, showControls && s.ctrlBtnOn]} onPress={() => setShowControls((v) => !v)} testID="shot-controls">
          <Ionicons name="options-outline" size={16} color={showControls ? C.onBrand : C.onSurface} />
        </Pressable>
      </View>

      {showControls && (
        <View style={s.controls}>
          <Text style={s.ctrlLabel}>GROUP BY</Text>
          <Seg options={[["scene", "Scene"], ["location", "Location"], ["day", "Day/Night"], ["status", "Status"], ["none", "None"]]} value={groupBy} onChange={setGroupBy as any} idp="group" />
          <Text style={s.ctrlLabel}>SORT BY</Text>
          <Seg options={[["storyboard", "Storyboard #"], ["shooting", "Shooting #"], ["location", "Location"], ["time", "Shoot Time"], ["status", "Status"]]} value={sortBy} onChange={setSortBy as any} idp="sort" />
          <Text style={s.ctrlLabel}>FILTERS</Text>
          {filterDefs.map((fd) => {
            const vals = fd.vals || uniq(fd.key);
            if (!vals.length) return null;
            return (
              <View key={fd.key} style={{ marginBottom: 6 }}>
                <Text style={s.filterName}>{fd.label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {vals.map((v) => (
                    <Pressable key={v} onPress={() => setFilter(fd.key, v)} style={[s.fChip, filters[fd.key] === v && s.fChipOn]} testID={`filter-${fd.key}-${v}`}>
                      <Text style={[s.fChipText, filters[fd.key] === v && { color: C.brand }]} numberOfLines={1}>{v}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            );
          })}
          {Object.values(filters).some(Boolean) && (
            <Pressable onPress={() => setFilters({})} style={s.clearBtn} testID="filter-clear"><Text style={s.clearText}>Clear filters</Text></Pressable>
          )}
        </View>
      )}

      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: S.lg, paddingBottom: 140, maxWidth: MAX_W, width: "100%", alignSelf: "center" }}>
          {!wide && <StatsCard stats={stats} mobile />}
          <View style={s.syncNote}>
            <Ionicons name="sync-outline" size={13} color={C.brand} />
            <Text style={s.syncText}>Live two-way sync with Storyboard. Storyboard Order and Shooting Order are independent.</Text>
          </View>
          <View style={s.exportRow}>
            <ExpBtn icon="document-text-outline" label="PDF" onPress={() => exportShotListPdf(project, flatForExport())} testID="sl-pdf" />
            <ExpBtn icon="grid-outline" label="Excel" onPress={() => exportShotListExcel(project, flatForExport())} testID="sl-excel" />
            <ExpBtn icon="download-outline" label="CSV" onPress={() => exportShotListCsv(project, flatForExport())} testID="sl-csv" />
            <ExpBtn icon="print-outline" label="Print" onPress={() => printShotList(project, flatForExport())} testID="sl-print" />
          </View>

          {rows.length === 0 && <Text style={s.empty}>Generate the storyboard to populate the shot list.</Text>}

          {groups.map((g) => (
            <View key={g.key} style={{ marginBottom: S.md }}>
              <View style={s.groupHead}>
                <Text style={s.groupTitle} numberOfLines={1}>{g.key}</Text>
                <Text style={s.groupCount}>{g.rows.length} shot{g.rows.length !== 1 ? "s" : ""}</Text>
                {groupBy === "scene" && g.scene && (
                  <Pressable style={s.addShotBtn} onPress={() => addShot(g.scene)} testID={`add-shot-${g.scene.scene_number}`}>
                    <Ionicons name="add" size={14} color={C.brand} /><Text style={s.addShotText}>Add shot</Text>
                  </Pressable>
                )}
              </View>
              {g.rows.map((r) => (
                <ShotRow key={r.shot.id} row={r} wide={wide} open={!!open[r.shot.id]}
                  onToggle={() => setOpen((o) => ({ ...o, [r.shot.id]: !o[r.shot.id] }))}
                  setVal={setVal} toggleCheck={toggleCheck} duplicateShot={duplicateShot} deleteShot={deleteShot}
                  addShot={addShot} onEditInStoryboard={onEditInStoryboard} />
              ))}
            </View>
          ))}
        </ScrollView>
        {wide && <ScrollView style={s.sidebar} contentContainerStyle={{ padding: S.lg }}><StatsCard stats={stats} /></ScrollView>}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
const GROUPS: { title: string; fields: [string, string, boolean?][] }[] = [
  { title: "IDENTITY", fields: [["name", "Shot Name"], ["description", "Description", true]] },
  { title: "LOCATION & TIME", fields: [["location", "Location"], ["int_ext", "Interior / Exterior"], ["day_night", "Day / Night"], ["est_duration", "Estimated Duration"], ["est_shoot_time", "Est. Shooting Time"]] },
  { title: "CAMERA", fields: [["shot_type", "Shot Type"], ["camera_angle", "Camera Angle"], ["camera_height", "Camera Height"], ["camera_direction", "Camera Direction"], ["camera_movement", "Camera Movement"]] },
  { title: "TECHNICAL", fields: [["lens", "Lens"], ["frame_rate", "Frame Rate"], ["resolution", "Resolution"], ["aspect_ratio", "Aspect Ratio"]] },
  { title: "CAST & ART", fields: [["characters", "Characters"], ["props", "Props"], ["wardrobe", "Wardrobe"]] },
  { title: "SOUND & LIGHT", fields: [["audio", "Audio"], ["music", "Music"], ["lighting", "Lighting Setup", true], ["equipment", "Equipment"]] },
  { title: "NOTES", fields: [["director_notes", "Director Notes", true], ["production_notes", "Production Notes", true]] },
];

const ShotRow = React.memo(function ShotRow({ row, wide, open, onToggle, setVal, toggleCheck, duplicateShot, deleteShot, onEditInStoryboard }: any) {
  const { scene, shot } = row;
  const color = STATUS_COLOR[row.status] || C.onSurface2;
  const checkDone = CHECKLIST.filter(([k]) => row.checklist[k]).length;
  return (
    <View style={[s.card, open && s.cardOpen]} testID={`shot-${row.shot_code}`}>
      <Pressable style={s.rowHead} onPress={onToggle} testID={`shot-toggle-${row.shot_code}`}>
        <View style={s.codeBox}><Text style={s.codeText}>{row.shot_code}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowName} numberOfLines={1}>{row.name || "Untitled shot"}</Text>
          <View style={s.metaRow}>
            <Meta>{row.shot_type || "—"}</Meta><Meta>{row.lens || "—"}</Meta>
            {wide && <><Meta>{row.camera_movement || "—"}</Meta><Meta>{row.location || "—"}</Meta></>}
            <Meta>{row.est_duration || "—"}</Meta>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <View style={[s.statusBadge, { borderColor: color }]}><View style={[s.dot, { backgroundColor: color }]} /><Text style={[s.statusText, { color }]}>{row.status}</Text></View>
          <Text style={s.orderText}>SB {row.storyboard_order} · SH {row.shooting_order}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.onSurface2} />
      </Pressable>

      {open && (
        <View style={s.body}>
          {/* Ordering */}
          <View style={s.orderRow}>
            <View style={s.orderCol}><Text style={s.efLabel}>Storyboard Order</Text><View style={s.orderLocked}><Text style={s.orderLockedText}>{row.storyboard_order}</Text><Text style={s.orderHint}>narrative</Text></View></View>
            <View style={s.orderCol}><Text style={s.efLabel}>Shooting Order</Text>
              <Field value={String(row.shooting_order)} onCommit={(v: string) => setVal(scene, shot, "shooting_order", v)} keyboard="numeric" testID={`shot-shooting-${row.shot_code}`} /></View>
          </View>

          {/* Status */}
          <Text style={s.efLabel}>Status</Text>
          <View style={s.statusPickRow}>
            {SHOT_STATUSES.map((st) => (
              <Pressable key={st} onPress={() => setVal(scene, shot, "status", st)}
                style={[s.statusChip, row.status === st && { borderColor: STATUS_COLOR[st], backgroundColor: "rgba(197,160,89,0.12)" }]} testID={`shot-status-${row.shot_code}-${st}`}>
                <Text style={[s.statusChipText, row.status === st && { color: STATUS_COLOR[st] }]}>{st}</Text>
              </Pressable>
            ))}
          </View>

          {/* Field groups */}
          {GROUPS.map((g) => (
            <View key={g.title} style={s.group}>
              <Text style={s.groupLabel}>{g.title}</Text>
              {g.fields.map(([k, l, ml]) => (
                <View key={k} style={{ marginBottom: 6 }}>
                  <Text style={s.efLabel}>{l}</Text>
                  <Field value={row[k]} onCommit={(v: string) => setVal(scene, shot, k, v)} multiline={ml} testID={`shot-field-${row.shot_code}-${k}`} />
                </View>
              ))}
            </View>
          ))}

          {/* Checklist */}
          <View style={s.group}>
            <Text style={s.groupLabel}>PRODUCTION CHECKLIST · {checkDone}/{CHECKLIST.length}</Text>
            <View style={s.checkWrap}>
              {CHECKLIST.map(([k, l]) => {
                const on = !!row.checklist[k];
                return (
                  <Pressable key={k} onPress={() => toggleCheck(scene, shot, k)} style={[s.checkItem, on && s.checkItemOn]} testID={`shot-check-${row.shot_code}-${k}`}>
                    <Ionicons name={on ? "checkbox" : "square-outline"} size={16} color={on ? C.success : C.onSurface2} />
                    <Text style={[s.checkText, on && { color: C.onSurface }]}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <ActBtn icon="copy-outline" label="Duplicate" onPress={() => duplicateShot(scene, shot)} testID={`shot-dup-${row.shot_code}`} />
            <ActBtn icon="film-outline" label="Open in Storyboard" onPress={() => onEditInStoryboard(scene.id)} testID={`shot-open-${row.shot_code}`} />
            {!shot.is_primary && <ActBtn icon="trash-outline" label="Delete" color={C.error} onPress={() => deleteShot(scene, shot)} testID={`shot-del-${row.shot_code}`} />}
          </View>
        </View>
      )}
    </View>
  );
});

// ---- small pieces ----
function Field({ value, onCommit, multiline, keyboard, testID }: any) {
  const [v, setV] = useState(value ?? "");
  const focused = useRef(false);
  const last = useRef(value ?? "");
  const t = useRef<any>(null);
  useEffect(() => { if (!focused.current) { setV(value ?? ""); last.current = value ?? ""; } }, [value]);
  const fire = (nv: string) => { if (nv === last.current) return; last.current = nv; onCommit(nv); };
  const change = (nv: string) => { setV(nv); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => fire(nv), 450); };
  return (
    <TextInput value={v} onChangeText={change} multiline={multiline} keyboardType={keyboard || "default"}
      onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; if (t.current) clearTimeout(t.current); fire(v); }}
      placeholder="Empty…" placeholderTextColor={C.onSurface2}
      style={[s.input, multiline && { minHeight: 54, textAlignVertical: "top", paddingTop: 8 }]} testID={testID} />
  );
}
function Seg({ options, value, onChange, idp }: any) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 4 }}>
      {options.map(([val, label]: any) => (
        <Pressable key={val} onPress={() => onChange(val)} style={[s.seg, value === val && s.segOn]} testID={`${idp}-${val}`}>
          <Text style={[s.segText, value === val && { color: C.onBrand }]}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
function Meta({ children }: any) { return <View style={s.meta}><Text style={s.metaText}>{children}</Text></View>; }
function ActBtn({ icon, label, onPress, color, testID }: any) {
  return <Pressable style={s.actBtn} onPress={onPress} testID={testID}><Ionicons name={icon} size={15} color={color || C.onSurface} /><Text style={[s.actText, color && { color }]}>{label}</Text></Pressable>;
}
function ExpBtn({ icon, label, onPress, testID }: any) {
  return <Pressable style={s.expBtn} onPress={onPress} testID={testID}><Ionicons name={icon} size={15} color={C.brand} /><Text style={s.expText}>{label}</Text></Pressable>;
}
function StatRow({ label, value }: any) { return <View style={s.statRow}><Text style={s.statLabel}>{label}</Text><Text style={s.statVal}>{value}</Text></View>; }
function StatsCard({ stats, mobile }: any) {
  return (
    <View style={[s.stats, mobile && { marginBottom: S.md }]}>
      <Text style={s.statsTitle}>PRODUCTION SUMMARY</Text>
      <StatRow label="Total Shots" value={String(stats.totalShots)} />
      <StatRow label="Locations" value={String(stats.locations)} />
      <StatRow label="Lenses Used" value={String(stats.lenses.length)} />
      <StatRow label="Movements Used" value={String(stats.movements.length)} />
      <StatRow label="Avg Shot Duration" value={stats.avgDur} />
      <StatRow label="Longest Scene" value={stats.longest} />
      <StatRow label="Shortest Scene" value={stats.shortest} />
      <StatRow label="Est. Wrap Time" value={stats.wrap} />
      <View style={{ marginTop: 8 }}>
        <View style={s.statRow}><Text style={s.statLabel}>Completion</Text><Text style={s.statVal}>{stats.completion}%</Text></View>
        <View style={s.barTrack}><View style={[s.barFill, { width: `${stats.completion}%` }]} /></View>
      </View>
      {stats.lenses.length > 0 && <Text style={s.statsFoot} numberOfLines={2}>Lenses: {stats.lenses.join(", ")}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface2 },
  searchWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, height: 40 },
  search: { flex: 1, color: C.onSurface, fontFamily: F.text, fontSize: 13.5, height: 40 },
  ctrlBtn: { width: 40, height: 40, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  ctrlBtnOn: { backgroundColor: C.brand, borderColor: C.brand },
  controls: { padding: S.lg, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface2 },
  ctrlLabel: { color: C.brand, fontFamily: F.text, fontSize: 10.5, letterSpacing: 1.2, marginTop: 8, marginBottom: 4 },
  filterName: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, marginBottom: 3 },
  seg: { borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.surface },
  segOn: { backgroundColor: C.brand, borderColor: C.brand },
  segText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  fChip: { borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.surface, maxWidth: 160 },
  fChipOn: { borderColor: C.brand, backgroundColor: C.brandTint },
  fChipText: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5 },
  clearBtn: { marginTop: 8, alignSelf: "flex-start" },
  clearText: { color: C.error, fontFamily: F.text, fontSize: 12 },
  sidebar: { width: 300, borderLeftWidth: 1, borderLeftColor: C.border, backgroundColor: C.surface2 },
  syncNote: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.sm, marginBottom: S.sm },
  syncText: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, flex: 1 },
  exportRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: S.md },
  expBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.surface2 },
  expText: { color: C.brand, fontFamily: F.text, fontSize: 12.5 },
  empty: { color: C.onSurface2, fontFamily: F.text, fontSize: 13, textAlign: "center", marginTop: S.xl },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, marginTop: 4 },
  groupTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 16, flexShrink: 1 },
  groupCount: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, flex: 1 },
  addShotBtn: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderColor: C.brand, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 },
  addShotText: { color: C.brand, fontFamily: F.text, fontSize: 11.5 },
  card: { backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, marginBottom: S.sm, overflow: "hidden" },
  cardOpen: { borderColor: C.borderStrong },
  rowHead: { flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md },
  codeBox: { minWidth: 40, height: 34, borderRadius: R.sm, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  codeText: { color: C.brand, fontFamily: F.display, fontSize: 15 },
  rowName: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "600" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  meta: { backgroundColor: C.surface3, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 },
  metaText: { color: C.onSurface3, fontFamily: F.text, fontSize: 10.5 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: F.text, fontSize: 10 },
  orderText: { color: C.onSurface2, fontFamily: F.text, fontSize: 10 },
  body: { paddingHorizontal: S.md, paddingBottom: S.md, borderTopWidth: 1, borderTopColor: C.border },
  orderRow: { flexDirection: "row", gap: S.md, marginTop: S.sm },
  orderCol: { flex: 1 },
  orderLocked: { backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderLockedText: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "600" },
  orderHint: { color: C.onSurface2, fontFamily: F.text, fontSize: 10 },
  efLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4, marginTop: 6 },
  input: { backgroundColor: C.surface, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, color: C.onSurface, fontFamily: F.text, fontSize: 13.5, paddingHorizontal: 10, paddingVertical: 8, minHeight: 40 },
  statusPickRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  statusChip: { borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  statusChipText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  group: { marginTop: S.md, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.border },
  groupLabel: { color: C.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 1.2, marginBottom: 2 },
  checkWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  checkItem: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.surface },
  checkItemOn: { borderColor: C.success, backgroundColor: "rgba(62,102,70,0.15)" },
  checkText: { color: C.onSurface2, fontFamily: F.text, fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: S.md },
  actBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.surface3 },
  actText: { color: C.onSurface, fontFamily: F.text, fontSize: 12.5 },
  stats: { backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg },
  statsTitle: { color: C.brand, fontFamily: F.text, fontSize: 11, letterSpacing: 1.4, marginBottom: 6 },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 },
  statLabel: { color: C.onSurface2, fontFamily: F.text, fontSize: 13 },
  statVal: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "600" },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.surface3, marginTop: 6, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.brand },
  statsFoot: { color: C.onSurface2, fontFamily: F.text, fontSize: 10.5, marginTop: 8, lineHeight: 15 },
});
