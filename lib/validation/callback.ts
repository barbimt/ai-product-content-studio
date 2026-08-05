import { z } from "zod";

export const orchestraCallbackSchema = z.object({
  runId: z.string().trim().min(1),
  description: z.string().trim().min(1),
  review: z.object({
    status: z.enum(["APPROVE", "REVIEW"]),
    reason: z.string().trim().min(1),
  }),
});

export type OrchestraCallbackInput = z.infer<typeof orchestraCallbackSchema>;
