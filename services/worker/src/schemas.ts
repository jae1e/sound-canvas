import { categoryCodeFor } from "@vlc/travel";
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

/** Provider-agnostic LLM request (M4). The route validates and returns 501 for now. */
export const llmRequest = z
  .object({
    messages: z
      .array(z.object({ role: z.enum(["system", "user", "assistant", "tool"]), content: z.string().max(16000) }))
      .min(1)
      .max(64),
    tools: z
      .array(
        z.object({
          name: z.string().min(1).max(64),
          description: z.string().max(1000).optional(),
          parameters: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .max(32)
      .optional(),
    maxTokens: z.number().int().min(1).max(4096).optional(),
    temperature: z.number().min(0).max(2).optional(),
    lang: z.enum(["ko", "en"]).optional(),
  })
  .strict();
export type LlmRequest = z.infer<typeof llmRequest>;
