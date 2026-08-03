import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const br = (s: any) => esc(s).replace(/\n/g, "<br/>");
const cap = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function defRows(obj: any, order?: string[]): string {
  if (!obj) return "";
  if (typeof obj === "string") return `<p>${br(obj)}</p>`;
  const keys = order || Object.keys(obj);
  return `<table class="def">${keys.filter((k) => obj[k]).map((k) =>
    `<tr><th>${esc(cap(k))}</th><td>${br(obj[k])}</td></tr>`).join("")}</table>`;
}

export function buildHtml(p: any): string {
  const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const scenes = p.scenes || [];

  const activeFrame = (s: any) => {
    const frames = s.frames || [];
    if (s.active_frame_id) { const f = frames.find((x: any) => x.id === s.active_frame_id); if (f) return f; }
    return frames[frames.length - 1] || null;
  };
  const frameImg = (s: any) => {
    const f = activeFrame(s);
    return (f && f.image_url) ? f.image_url : (s.image_url || "");
  };

  const scriptBlocks = scenes.map((s: any) => `
    <div class="sc-block">
      <h4>Scene ${esc(s.scene_number)} — ${esc(s.title)}</h4>
      ${s.narrative ? `<p>${br(s.narrative)}</p>` : ""}
      ${s.dialogue ? `<p class="dlg"><b>DIALOGUE.</b> ${esc(s.dialogue)}</p>` : ""}
      ${s.voice_over ? `<p class="dlg"><b>V.O.</b> ${esc(s.voice_over)}</p>` : ""}
      ${s.on_screen_text ? `<p class="dlg"><b>ON SCREEN.</b> ${esc(s.on_screen_text)}</p>` : ""}
    </div>`).join("");

  // Storyboard — one page per scene, large 16:9 frame
  const boardPages = scenes.map((s: any) => {
    const img = frameImg(s);
    const frame = img
      ? `<div class="board-frame"><img src="${img}"/></div>`
      : `<div class="board-frame empty"><span>STORYBOARD FRAME</span><small>${esc(s.aspect_ratio || p.aspect_ratio || "16:9")} · frame not generated</small></div>`;
    const field = (label: string, val: any) => val ? `<div class="bf"><span>${esc(label)}</span><p>${br(val)}</p></div>` : "";
    return `<section class="board-page">
      <div class="board-head"><div class="bn">${esc(s.scene_number)}</div><h3>${esc(s.title)}</h3><span class="bdur">${esc(s.duration)} · ${esc(s.location)} · ${esc(s.time_of_day)}</span></div>
      ${frame}
      <div class="board-grid">
        ${field("Scene Description", s.visual_description)}
        ${field("Dialogue", s.dialogue)}
        ${field("Voice Over", s.voice_over)}
        ${field("Camera Setup", [s.shot_size, s.camera_angle].filter(Boolean).join(" · "))}
        ${field("Lens", s.focal_length)}
        ${field("Camera Movement", s.camera_movement)}
        ${field("Lighting", s.lighting)}
        ${field("Production Notes", s.production_notes)}
      </div>
    </section>`;
  }).join("");

  const rows = scenes.map((s: any, i: number) => `
    <tr><td>${i + 1}</td><td>${esc(s.scene_number)}</td><td>${esc(s.visual_description)}</td>
    <td>${esc(s.shot_size)}</td><td>${esc(s.camera_angle)}</td><td>${esc(s.focal_length)}</td>
    <td>${esc(s.camera_movement)}</td><td>${esc(s.frame_rate)}</td><td>${esc(s.resolution)}</td>
    <td>${esc(s.location)}</td><td>${esc(s.duration)}</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    @page { margin: 44px 40px; }
    * { box-sizing: border-box; } body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #17140d; margin: 0; }
    .cover { height: 940px; background: #0A0A0A; color: #F2F2F2; padding: 60px; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .cover .kicker { color: #C5A059; letter-spacing: 5px; font-size: 12px; }
    .cover h1 { font-family: Georgia, serif; font-size: 58px; margin: 14px 0 0; font-weight: 500; line-height: 1.04; }
    .cover .client { color: #C9C9C9; font-size: 17px; margin-top: 14px; }
    .cover .meta { color: #777; font-size: 12px; letter-spacing: 1px; }
    .cover .rule { height: 1px; background: #333; margin: 22px 0; }
    .toc { page-break-after: always; padding-top: 10px; } .toc ol { font-size: 15px; line-height: 2.3; color: #333; }
    h2 { font-family: Georgia, serif; color: #8C7335; font-size: 23px; border-bottom: 2px solid #C5A059; padding-bottom: 6px; margin: 30px 0 14px; page-break-after: avoid; }
    h4 { margin: 14px 0 4px; font-size: 14px; } p { font-size: 12.5px; line-height: 1.6; } .dlg { margin: 3px 0; }
    .sc-block { border-left: 2px solid #e4e0d6; padding-left: 12px; margin-bottom: 10px; page-break-inside: avoid; }
    table.def { width: 100%; border-collapse: collapse; margin-top: 6px; } table.def th { text-align: left; width: 175px; color: #8C7335; font-size: 11px; vertical-align: top; padding: 7px 8px; border-bottom: 1px solid #eee; } table.def td { font-size: 12.5px; padding: 7px 8px; border-bottom: 1px solid #eee; }
    /* Storyboard pages */
    .board-page { page-break-before: always; page-break-inside: avoid; }
    .board-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .board-head .bn { width: 40px; height: 40px; border-radius: 8px; background: #0A0A0A; color: #C5A059; font-family: Georgia, serif; font-size: 22px; display: flex; align-items: center; justify-content: center; }
    .board-head h3 { font-family: Georgia, serif; font-size: 22px; margin: 0; flex: 1; }
    .board-head .bdur { color: #999; font-size: 11px; }
    .board-frame { width: 100%; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; background: #0A0A0A; margin-bottom: 14px; display: flex; align-items: center; justify-content: center; flex-direction: column; border: 1px solid #e4e0d6; }
    .board-frame img { width: 100%; height: 100%; object-fit: cover; }
    .board-frame.empty span { color: #C5A059; font-family: Georgia, serif; font-size: 20px; letter-spacing: 2px; }
    .board-frame.empty small { color: #777; font-size: 11px; margin-top: 6px; }
    .board-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
    .bf { page-break-inside: avoid; } .bf span { color: #8C7335; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 2px; } .bf p { margin: 0; font-size: 12px; line-height: 1.55; }
    table.shot { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 8px; } table.shot th, table.shot td { border: 1px solid #d8d3c6; padding: 5px; text-align: left; vertical-align: top; } table.shot th { background: #0A0A0A; color: #C5A059; font-size: 8.5px; }
    .notes { border: 1px solid #e4e0d6; border-radius: 10px; padding: 16px 18px; background: #faf7f0; }
    .foot { text-align: center; color: #999; font-size: 10px; margin-top: 30px; }
  </style></head><body>
    <div class="cover">
      <div><div class="kicker">FRAMEFLOW STUDIO</div>
        <div class="meta" style="margin-top:6px">STORYBOARD & PRE-PRODUCTION PACKAGE</div></div>
      <div>
        <h1>${esc(p.title)}</h1>
        <div class="client">${esc(p.client || "—")}${p.campaign ? " · " + esc(p.campaign) : ""}</div>
        <div class="rule"></div>
        <div class="meta">${scenes.length} SCENES · ${esc(p.video_type || "Video")} · ${esc(p.aspect_ratio || "16:9")}</div>
      </div>
      <div class="meta">Created ${date} · FrameFlow Studio</div>
    </div>
    <div class="toc"><h2>Table of Contents</h2><ol>
      <li>Project Summary</li><li>Script</li><li>Storyboard</li><li>Shot List</li><li>Final Notes</li>
    </ol></div>
    <h2>Project Summary</h2>
    <h4 style="color:#8C7335">Creative Concept</h4>${defRows(p.concept, ["title", "elevator_pitch", "main_message", "emotional_goal", "audience", "communication_objective"])}
    <h4 style="color:#8C7335;margin-top:16px">Director's Treatment</h4>${defRows(p.treatment, ["visual_style", "narrative_style", "camera_language", "editing_style", "lighting_style", "color_palette", "sound_design", "overall_mood"])}
    <h4 style="color:#8C7335;margin-top:16px">Target Audience</h4><p>${esc(p.target_audience || p.concept?.audience || "—")}</p>
    <h4 style="color:#8C7335;margin-top:16px">Video Specifications</h4>${defRows({ video_type: p.video_type, platform: p.platform, duration: p.duration, aspect_ratio: p.aspect_ratio, language: p.language, scenes: String(scenes.length) })}
    <h2>Script</h2>${scriptBlocks || (p.script ? `<p>${br(p.script)}</p>` : "<p>—</p>")}
    <h2>Storyboard</h2>${boardPages}
    <section style="page-break-before: always;"><h2>Shot List</h2>
    <table class="shot"><thead><tr><th>#</th><th>Scene</th><th>Description</th><th>Shot</th><th>Angle</th><th>Lens</th><th>Movement</th><th>FPS</th><th>Res</th><th>Location</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table></section>
    <h2>Final Notes</h2>
    <div class="notes"><p>This storyboard and pre-production package was prepared with FrameFlow Studio. All scenes, shot specifications and creative direction are provided as a production-ready reference for the crew and client. Timings are estimates and may be refined on set.</p></div>
    <div class="foot">FrameFlow Studio · ${esc(p.title)} · Generated ${date}</div>
  </body></html>`;
}

function openPrintWindow(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => w.print(), 500);
}

export async function exportPdf(p: any) {
  const html = buildHtml(p);
  if (Platform.OS === "web") { openPrintWindow(html); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
}

export async function printProject(p: any) {
  const html = buildHtml(p);
  if (Platform.OS === "web") { openPrintWindow(html); return; }
  await Print.printAsync({ html });
}

export function buildCsv(p: any): string {
  const header = ["Shot", "Scene", "Description", "Camera Position", "Shot Size", "Lens", "Movement", "Frame Rate",
    "Resolution", "Equipment", "Lighting", "Audio", "Crew Notes", "Estimated Time"];
  const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.map(q).join(",")];
  (p.scenes || []).forEach((s: any, i: number) => {
    lines.push([i + 1, s.scene_number, s.visual_description, s.camera_position, s.shot_size, s.focal_length,
      s.camera_movement, s.frame_rate, s.resolution, s.equipment, s.lighting, s.sound_notes, s.crew_notes, s.estimated_time]
      .map(q).join(","));
  });
  return lines.join("\n");
}

export async function exportCsv(p: any) {
  const csv = buildCsv(p);
  const name = `${(p.title || "shotlist").replace(/[^a-z0-9]/gi, "_")}.csv`;
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const uri = (FileSystem as any).cacheDirectory + name;
  await (FileSystem as any).writeAsStringAsync(uri, csv);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/csv" });
}
