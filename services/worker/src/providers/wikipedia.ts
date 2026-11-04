import type { Lang } from "@vlc/travel";
import type { Deps } from "../env";
import { fetchJson } from "./types";

export interface WikiSummary {
  extract: string;
  pageUrl?: string;
}

/**
 * Wikipedia REST `page/summary/{title}` (CC BY-SA 4.0). Best effort: any failure, a missing page or a
 * disambiguation page returns null. No key; Wikimedia asks clients to send a descriptive User-Agent.
 */
export async function wikipediaSummary(deps: Deps, lang: Lang, title: string): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.trim().replace(/\s+/g, "_"))}`;
  try {
    const json = (await fetchJson("wikipedia", deps.fetch, url, {
      headers: { Accept: "application/json", "User-Agent": "VoiceLifeCompanion/0.1 (https://github.com/jae1e/sound-canvas)" },
    })) as { type?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
    const extract = (json.extract ?? "").trim();
    if (json.type === "disambiguation" || extract.length < 30) return null;
    return { extract, pageUrl: json.content_urls?.desktop?.page };
  } catch {
    return null;
  }
}
