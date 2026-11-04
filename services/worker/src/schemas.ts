import { categoryCodeFor } from "@vlc/travel";
import { TASK_NAMES, type TaskName } from "@vlc/llm";
import { z } from "zod";

export const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const searchRequest = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    query: z.string().trim().min(1).max(80).optional(),
    /** Category key (`cafe`) or Kakao group code (`CE7`). */
    category: z
      .string()
      .refine((c) => categoryCodeFor(c) !== undefined, "unknown category")
      .optional(),
    radiusM: z.number().int().min(1).max(20000).default(500),
    limit: z.number().int().min(1).max(15).default(5),
  })
  .strict();
export type SearchRequest = z.infer<typeof searchRequest>;

export const whereRequest = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict();
export type WhereRequest = z.infer<typeof whereRequest>;

export const walkRequest = z
  .object({
    from: latLng,
    to: latLng,
    via: z.array(latLng).max(5).optional(),
  })
  .strict();
export type WalkRequest = z.infer<typeof walkRequest>;

/**
 * `POST /llm`. The client sends only the task name and its structured input; the prompt and output schema are built here
 * from the shared `@vlc/llm` task definitions. That keeps prompts in one place and means a leaked token cannot be used as a
 * free general-purpose model proxy. `input` is validated against the task's own schema inside the route.
 */
export const llmRequest = z.object({ task: z.enum(TASK_NAMES as [TaskName, ...TaskName[]]), input: z.unknown() }).strict();
export type LlmRequest = z.infer<typeof llmRequest>;

const langEnum = z.enum(["ko", "en"]);

/** `POST /landmarks/nearby`. `theme` defaults to historic; `any` returns all tourist attractions. */
export const landmarksNearbyRequest = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusM: z.number().int().min(1).max(20000).default(1500),
    lang: langEnum.default("ko"),
    limit: z.number().int().min(1).max(10).default(3),
    theme: z.enum(["historic", "any"]).default("historic"),
  })
  .strict();
export type LandmarksNearbyRequest = z.infer<typeof landmarksNearbyRequest>;

/** `POST /landmarks/detail`. `id` comes from `/landmarks/nearby`; `name` enables the Wikipedia fallback. */
export const landmarkDetailRequest = z
  .object({
    id: z.string().regex(/^(tourapi:\d{1,12}:\d{1,3}|kakao:\d{1,20})$/, "unknown id format"),
    lang: langEnum.default("ko"),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
export type LandmarkDetailRequest = z.infer<typeof landmarkDetailRequest>;
