import { describe, expect, it } from "vitest";

import { productDescriptionSchema } from "@/lib/validation/product-description";

const validInput = {
  productName: "TrailFlex Running Shoes",
  category: "Sports footwear",
  features: "Lightweight mesh upper, cushioned sole and rubber grip",
  tone: "Friendly",
};

describe("productDescriptionSchema", () => {
  it("accepts valid input", () => {
    const result = productDescriptionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects a short product name", () => {
    const result = productDescriptionSchema.safeParse({
      ...validInput,
      productName: "AB",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid tone", () => {
    const result = productDescriptionSchema.safeParse({
      ...validInput,
      tone: "Sarcastic",
    });
    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const result = productDescriptionSchema.safeParse({
      ...validInput,
      productName: "  TrailFlex Running Shoes  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productName).toBe("TrailFlex Running Shoes");
    }
  });

  it("rejects excessively long features", () => {
    const result = productDescriptionSchema.safeParse({
      ...validInput,
      features: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
