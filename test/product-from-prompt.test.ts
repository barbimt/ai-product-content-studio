import { describe, expect, it } from "vitest";

import { productFromGeneratePrompt } from "@/lib/orchestra/product-from-prompt";

const samplePrompt = `Write a concise ecommerce product description.

Product name:
TrailFlex Running Shoes

Category:
Sports footwear

Verified product features:
Lightweight mesh upper, cushioned midsole, rubber outsole with grip

Tone:
Friendly

Requirements:
- Write between 60 and 90 words`;

describe("productFromGeneratePrompt", () => {
  it("extracts product fields from the generate task prompt", () => {
    expect(productFromGeneratePrompt(samplePrompt)).toEqual({
      productName: "TrailFlex Running Shoes",
      category: "Sports footwear",
      features:
        "Lightweight mesh upper, cushioned midsole, rubber outsole with grip",
      tone: "Friendly",
    });
  });
});
