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

  const scriptBlocks = scenes.map((s: any) => `
    <div class="sc-block">
      <h4>Scene ${esc(s.scene_number)} — ${esc(s.title)}</h4>
      ${s.narrative ? `<p>${br(s.narrative)}</p>` : ""}
      ${s.dialogue ? `<p class="dlg"><b>DIALOGUE.</b> ${esc(s.dialogue)}</p>` : ""}
      ${s.voice_over ? `<p class="dlg"><b>V.O.</b> ${esc(s.voice_over)}</p>` : ""}
      ${s.on_screen_text ? `<p class="dlg"><b>ON SCREEN.</b> ${esc(s.on_screen_text)}</p>` : ""}
    </div>`).join("");

  const sceneCards = scenes.map((s: any) => `
    <div class="scene">
      <div class="frame"><span>SCENE</span><b>${esc(s.scene_number)}</b><small>${esc(s.duration)}</small></div>
      <div class="sb"><h3>${esc(s.title)}</h3><p class="desc">${esc(s.visual_description)}</p>
        <div class="tags"><span>${esc(s.shot_size)}</span><span>${esc(s.camera_angle)}</span><span>${esc(s.camera_movement)}</span><span>${esc(s.focal_length)}</span><span>${esc(s.location)} · ${esc(s.time_of_day)}</span></div>
        ${s.dialogue ? `<p><b>Dialogue.</b> ${esc(s.dialogue)}</p>` : ""}
        ${s.director_notes ? `<p><b>Director.</b> ${esc(s.director_notes)}</p>` : ""}
        <p class="prompt"><b>AI Image Prompt.</b> ${esc(s.image_prompt)}</p></div>
    </div>`).join("");

  const rows = scenes.map((s: any, i: number) => `
    <tr><td>${i + 1}</td><td>${esc(s.scene_number)}</td><td>${esc(s.visual_description)}</td>
    <td>${esc(s.camera_position)}</td><td>${esc(s.shot_size)}</td><td>${esc(s.focal_length)}</td>
    <td>${esc(s.camera_movement)}</td><td>${esc(s.frame_rate)}</td><td>${esc(s.resolution)}</td>
    <td>${esc(s.equipment)}</td><td>${esc(s.lighting)}</td><td>${esc(s.sound_notes)}</td>
    <td>${esc(s.crew_notes)}</td><td>${esc(s.estimated_time)}</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    @page { margin: 44px 40px; }
    * { box-sizing: border-box; } body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #17140d; margin: 0; }
    .cover { height: 660px; background: #0A0A0A; color: #F2F2F2; padding: 56px; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .cover .kicker { color: #C5A059; letter-spacing: 5px; font-size: 12px; }
    .cover h1 { font-family: Georgia, serif; font-size: 52px; margin: 12px 0 0; font-weight: 500; line-height: 1.05; }
    .cover .client { color: #A3A3A3; font-size: 15px; margin-top: 10px; }
    .cover .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 20px; }
    .cover .grid div { border-top: 1px solid #333; padding-top: 8px; } .cover .grid span { color: #777; font-size: 10px; letter-spacing: 1px; display: block; } .cover .grid b { color: #F2F2F2; font-size: 14px; font-weight: 500; }
    .toc { page-break-after: always; padding-top: 10px; } .toc ol { font-size: 14px; line-height: 2.1; color: #333; }
    h2 { font-family: Georgia, serif; color: #8C7335; font-size: 22px; border-bottom: 2px solid #C5A059; padding-bottom: 6px; margin: 30px 0 12px; }
    h4 { margin: 14px 0 4px; font-size: 14px; } p { font-size: 12.5px; line-height: 1.6; } .dlg { margin: 3px 0; } .sc-block { border-left: 2px solid #e4e0d6; padding-left: 12px; margin-bottom: 10px; page-break-inside: avoid; }
    table.def { width: 100%; border-collapse: collapse; margin-top: 6px; } table.def th { text-align: left; width: 170px; color: #8C7335; font-size: 11px; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #eee; } table.def td { font-size: 12.5px; padding: 6px 8px; border-bottom: 1px solid #eee; }
    .scene { display: flex; gap: 14px; border: 1px solid #e4e0d6; border-radius: 10px; padding: 14px; margin-bottom: 12px; page-break-inside: avoid; }
    .frame { width: 96px; min-height: 78px; background: #0A0A0A; color: #C5A059; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; } .frame span { font-size: 9px; letter-spacing: 2px; } .frame b { font-size: 24px; font-family: Georgia, serif; } .frame small { color: #A3A3A3; font-size: 10px; margin-top: 4px; }
    .sb { flex: 1; } .sb h3 { margin: 0 0 4px; font-size: 15px; } .desc { margin: 0 0 8px; }
    .tags span { display: inline-block; background: #f1ede2; border-radius: 20px; padding: 3px 9px; font-size: 10px; margin: 2px 5px 2px 0; }
    .prompt { background: #faf5e9; border-left: 3px solid #C5A059; padding: 8px 10px; border-radius: 4px; margin-top: 6px; }
    table.grid2 { width: 100%; border-collapse: collapse; font-size: 11px; } table.grid2 th, table.grid2 td { border: 1px solid #d8d3c6; padding: 6px 8px; text-align: left; } table.grid2 th { background: #f7f2e7; width: 150px; color: #8C7335; }
    table.shot { width: 100%; border-collapse: collapse; font-size: 8.5px; margin-top: 8px; } table.shot th, table.shot td { border: 1px solid #d8d3c6; padding: 5px; text-align: left; vertical-align: top; } table.shot th { background: #0A0A0A; color: #C5A059; font-size: 8px; }
    .foot { text-align: center; color: #999; font-size: 10px; margin-top: 24px; }
  </style></head><body>
    <div class="cover">
      <div><div class="kicker">FRAMEFLOW STUDIO · PRE-PRODUCTION PACKAGE</div>
        <h1>${esc(p.title)}</h1><div class="client">${esc(p.client || "—")}${p.campaign ? " · " + esc(p.campaign) : ""}</div></div>
      <div class="grid">
        <div><span>VIDEO TYPE</span><b>${esc(p.video_type)}</b></div><div><span>PLATFORM</span><b>${esc(p.platform)}</b></div>
        <div><span>DURATION</span><b>${esc(p.duration)}</b></div><div><span>ASPECT</span><b>${esc(p.aspect_ratio)}</b></div>
        <div><span>SCENES</span><b>${scenes.length}</b></div><div><span>EXPORTED</span><b>${date}</b></div></div>
    </div>
    <div class="toc"><h2>Table of Contents</h2><ol>
      <li>Project Information</li><li>Creative Concept</li><li>Director's Treatment</li><li>Script</li>
      <li>Storyboard</li><li>Shot List</li><li>Equipment</li><li>Crew</li><li>Shooting Schedule</li><li>Budget Estimation</li>
    </ol></div>
    <h2>Project Information</h2>${defRows({ client: p.client, campaign: p.campaign, brand: p.brand, goal: p.goal, audience: p.target_audience, language: p.language, crew_size: p.crew_size, location: p.location_type, actors: p.num_actors, deliverables: p.deliverables })}
    <h2>Creative Concept</h2>${defRows(p.concept, ["title", "elevator_pitch", "main_message", "emotional_goal", "audience", "communication_objective"])}
    <h2>Director's Treatment</h2>${defRows(p.treatment, ["visual_style", "narrative_style", "camera_language", "editing_style", "lighting_style", "color_palette", "sound_design", "overall_mood"])}
    <h2>Script</h2>${scriptBlocks || (p.script ? `<p>${br(p.script)}</p>` : "")}
    <h2>Storyboard</h2>${sceneCards}
    <h2>Technical Shot List</h2>
    <table class="shot"><thead><tr><th>#</th><th>Scene</th><th>Description</th><th>Camera Pos</th><th>Shot</th><th>Lens</th><th>Move</th><th>FPS</th><th>Res</th><th>Equipment</th><th>Lighting</th><th>Audio</th><th>Crew</th><th>Est.</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>Equipment</h2><table class="grid2">${p.equipment ? Object.keys(p.equipment).filter((k) => p.equipment[k]).map((k) => `<tr><th>${esc(cap(k))}</th><td>${esc(p.equipment[k])}</td></tr>`).join("") : ""}</table>
    <h2>Crew</h2><table class="grid2">${p.crew ? Object.keys(p.crew).filter((k) => p.crew[k]).map((k) => `<tr><th>${esc(cap(k))}</th><td>${esc(p.crew[k])}</td></tr>`).join("") : ""}</table>
    <h2>Shooting Schedule</h2>${defRows(p.schedule, ["recommendation", "estimated_hours", "breakdown"])}
    <h2>Budget Estimation</h2>${defRows(p.budget, ["low", "medium", "commercial", "premium", "notes"])}
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
