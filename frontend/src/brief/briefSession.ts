/**
 * Ephemeral in-memory handoff between the Create-Project upload screen and the
 * Review Analysis screen (same JS runtime — survives navigation, cleared after
 * a project is created). Keeps large base64 payloads out of route params.
 */
export type BriefImageThumb = { name: string; uri: string };

export type BriefSessionData = {
  analysis: any;          // { fields, visual, summary }
  documents: any[];       // metadata returned by backend
  documentErrors: any[];
  images: any[];          // backend image metadata
  imageErrors: any[];
  imageThumbs: BriefImageThumb[]; // local uris for previews on review
  mockMode: boolean;
};

let _session: BriefSessionData | null = null;

export const briefSession = {
  set(data: BriefSessionData) { _session = data; },
  get(): BriefSessionData | null { return _session; },
  clear() { _session = null; },
};
