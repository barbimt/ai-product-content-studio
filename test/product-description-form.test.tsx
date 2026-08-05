import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductDescriptionForm } from "@/components/product-description-form";

describe("ProductDescriptionForm", () => {
  it("shows validation messages and does not submit when fields are empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProductDescriptionForm onSubmit={onSubmit} isSubmitting={false} />);

    await user.click(screen.getByRole("button", { name: /generate description/i }));

    expect(
      await screen.findByText(/product name must be at least 3 characters/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the submit button and announces progress while submitting", () => {
    render(<ProductDescriptionForm onSubmit={vi.fn()} isSubmitting />);

    const button = screen.getByRole("button", { name: /generate description/i });
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/starting generation/i);
  });
});
