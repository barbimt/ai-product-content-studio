import { z } from "zod";

export const toneValues = [
  "Professional",
  "Friendly",
  "Premium",
  "Technical",
  "Playful",
] as const;

export const toneSchema = z.enum(toneValues, {
  message: "Choose a tone for the description.",
});

export type Tone = z.infer<typeof toneSchema>;

export const productDescriptionSchema = z.object({
  productName: z
    .string()
    .trim()
    .min(3, "Product name must be at least 3 characters.")
    .max(100, "Product name must be 100 characters or fewer."),
  category: z
    .string()
    .trim()
    .min(2, "Category must be at least 2 characters.")
    .max(80, "Category must be 80 characters or fewer."),
  features: z
    .string()
    .trim()
    .min(10, "Describe at least 10 characters of product features.")
    .max(500, "Features must be 500 characters or fewer."),
  tone: toneSchema,
});

export type ProductDescriptionInput = z.infer<typeof productDescriptionSchema>;
