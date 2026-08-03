import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const br = (s: any) => esc(s).replace(/\n/g, "<br/>");

export function buildHtml(p: any): string {
  const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const scenes = p.scenes || [];

  const sceneCards = scenes.map((s: any) => `
    <div class="scene">
      <div class="frame"><span>SCENE</span><b>${esc(s.scene_number)}</b><small>${esc(s.duration)}</small></div>
      <div class="sb">
        <h3>${esc(s.title)}</h3>
        <p class="desc">${esc(s.visual_description)}</p>
        <div class="tags">
          <span>${esc(s.shot_size)}</span><span>${esc(s.camera_angle)}</span><span>${esc(s.camera_movement)}</span>
          <span>${esc(s.focal_length)}</span><span>${esc(s.location)} · ${esc(s.time_of_day)}</span>
        </div>
        ${s.dialogue ? `<p><b>Dialogue.</b> ${esc(s.dialogue)}</p>` : ""}
        ${s.voice_over ? `<p><b>VO.</b> ${esc(s.voice_over)}</p>` : ""}
        <p class="prompt"><b>AI Image Prompt.</b> ${esc(s.image_prompt)}</p>
      </div>
    </div>`).join("");

  const rows = scenes.map((s: any, i: number) => `
    <tr><td>${i + 1}</td><td>${esc(s.scene_number)}</td><td>${esc(s.visual_description)}</td>
    <td>${esc(s.shot_size)}</td><td>${esc(s.focal_length)}</td><td>${esc(s.camera_movement)}</td>
    <td>${esc(s.frame_rate)}</td><td>${esc(s.resolution)}</td><td>${esc(s.location)}</td>
    <td>${esc(s.sound_notes)}</td><td>${esc(s.lighting)}</td><td>${esc(s.equipment)}</td>
    <td>${esc(s.estimated_time)}</td><td>${esc(s.crew_notes)}</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    @page { margin: 48px 40px; }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #17140d; margin: 0; }
    .cover { height: 660px; background: #0A0A0A; color: #F2F2F2; padding: 56px; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .cover .kicker { color: #C5A059; letter-spacing: 5px; font-size: 12px; }
    .cover h1 { font-family: Georgia, serif; font-size: 52px; margin: 12px 0 0; font-weight: 500; line-height: 1.05; }
    .cover .client { color: #A3A3A3; font-size: 15px; margin-top: 10px; }
    .cover .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 20px; }
    .cover .grid div { border-top: 1px solid #333; padding-top: 8px; }
    .cover .grid span { color: #777; font-size: 10px; letter-spacing: 1px; display: block; }
    .cover .grid b { color: #F2F2F2; font-size: 14px; font-weight: 500; }
    h2 { font-family: Georgia, serif; color: #8C7335; font-size: 22px; border-bottom: 2px solid #C5A059; padding-bottom: 6px; margin: 30px 0 12px; }
    p { font-size: 12.5px; line-height: 1.6; }
    .scene { display: flex; gap: 14px; border: 1px solid #e4e0d6; border-radius: 10px; padding: 14px; margin-bottom: 12px; page-break-inside: avoid; }
    .frame { width: 96px; min-height: 78px; background: #0A0A0A; color: #C5A059; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .frame span { font-size: 9px; letter-spacing: 2px; } .frame b { font-size: 24px; font-family: Georgia, serif; } .frame small { color: #A3A3A3; font-size: 10px; margin-top: 4px; }
    .sb { flex: 1; } .sb h3 { margin: 0 0 4px; font-size: 15px; } .desc { margin: 0 0 8px; }
    .tags span { display: inline-block; background: #f1ede2; border-radius: 20px; padding: 3px 9px; font-size: 10px; margin: 2px 5px 2px 0; }
    .prompt { background: #faf5e9; border-left: 3px solid #C5A059; padding: 8px 10px; border-radius: 4px; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 8px; }
    th, td { border: 1px solid #d8d3c6; padding: 5px; text-align: left; vertical-align: top; }
    th { background: #0A0A0A; color: #C5A059; font-size: 8.5px; letter-spacing: .5px; }
    .foot { text-align: center; color: #999; font-size: 10px; margin-top: 24px; }
  </style></head><body>
    <div class="cover">
      <div><div class="kicker">FRAMEFLOW STUDIO · PRE-PRODUCTION PACKAGE</div>
        <h1>${esc(p.title)}</h1>
        <div class="client">${esc(p.client || "—")}${p.campaign ? " · " + esc(p.campaign) : ""}</div></div>
      <div class="grid">
        <div><span>VIDEO TYPE</span><b>${esc(p.video_type)}</b></div>
        <div><span>PLATFORM</span><b>${esc(p.platform)}</b></div>
        <div><span>DURATION</span><b>${esc(p.duration)}</b></div>
        <div><span>ASPECT</span><b>${esc(p.aspect_ratio)}</b></div>
        <div><span>SCENES</span><b>${scenes.length}</b></div>
        <div><span>EXPORTED</span><b>${date}</b></div>
      </div>
    </div>
    <h2>Creative Concept</h2><p>${br(p.concept)}</p>
    ${p.creative_summary ? `<h2>Creative Summary</h2><p>${br(p.creative_summary)}</p>` : ""}
    <h2>Director's Treatment</h2><p>${br(p.treatment)}</p>
    <h2>Visual Direction</h2><p>${br(p.visual_direction)}</p>
    <h2>Script</h2><p>${br(p.script)}</p>
    <h2>Storyboard</h2>${sceneCards}
    <h2>Technical Shot List</h2>
    <table><thead><tr><th>#</th><th>Scene</th><th>Description</th><th>Shot</th><th>Lens</th><th>Move</th><th>FPS</th><th>Res</th><th>Location</th><th>Audio</th><th>Lighting</th><th>Equipment</th><th>Est.</th><th>Crew</th></tr></thead><tbody>${rows}</tbody></table>
    ${p.production_notes ? `<h2>Production Notes</h2><p>${br(p.production_notes)}</p>` : ""}
    <div class="foot">FrameFlow Studio · ${esc(p.title)} · Generated ${date}</div>
  </body></html>`;
}

function openPrintWindow(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
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
  const header = ["Shot", "Scene", "Description", "Shot Size", "Lens", "Movement", "Frame Rate", "Resolution",
    "Location", "Audio", "Lighting", "Equipment", "Estimated Time", "Crew Notes"];
  const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.map(q).join(",")];
  (p.scenes || []).forEach((s: any, i: number) => {
    lines.push([i + 1, s.scene_number, s.visual_description, s.shot_size, s.focal_length, s.camera_movement,
      s.frame_rate, s.resolution, s.location, s.sound_notes, s.lighting, s.equipment, s.estimated_time, s.crew_notes]
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
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const uri = (FileSystem as any).cacheDirectory + name;
  await (FileSystem as any).writeAsStringAsync(uri, csv);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/csv" });
}
