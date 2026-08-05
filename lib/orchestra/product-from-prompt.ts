import { toneValues, type ProductDescriptionInput } from "@/lib/validation/product-description";

function section(prompt: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = prompt.match(
    new RegExp(`${escaped}:\\n([\\s\\S]*?)(?:\\n\\n[A-Z][\\w ]+:|\\n\\nRequirements:|$)`),
  );
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
}

export function productFromGeneratePrompt(
  prompt: string | null,
): ProductDescriptionInput | null {
  if (!prompt) return null;

  const productName = section(prompt, "Product name");
  const category = section(prompt, "Category");
  const features =
    section(prompt, "Verified product features") ??
    section(prompt, "product features");
  const toneRaw = section(prompt, "Tone");

  if (!productName || !category || !features || !toneRaw) return null;
  if (!(toneValues as readonly string[]).includes(toneRaw)) return null;

  return {
    productName,
    category,
    features,
    tone: toneRaw as ProductDescriptionInput["tone"],
  };
}
