import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductContentWorkflow } from "@/components/product-content-workflow";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/product name/i), "TrailFlex Running Shoes");
  await user.type(screen.getByLabelText(/category/i), "Sports footwear");
  await user.type(
    screen.getByLabelText(/features/i),
    "Lightweight mesh upper, cushioned sole and rubber grip",
  );
  await user.click(screen.getByLabelText(/tone/i));
  await user.click(await screen.findByRole("option", { name: "Friendly" }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ProductContentWorkflow", () => {
  it("shows the empty state before submission", () => {
    render(<ProductContentWorkflow />);
    expect(
      screen.getByText(/submit a product to generate a description/i),
    ).toBeInTheDocument();
  });

  it("waits for the draft with a single wait request after submit", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/wait")) {
        return new Response(
          JSON.stringify({
            runId: "run-42",
            phase: "awaiting_approval",
            product: {
              productName: "TrailFlex Running Shoes",
              category: "Sports footwear",
              features: "Lightweight mesh upper, cushioned sole and rubber grip",
              tone: "Friendly",
            },
            draft: "A clear product description.",
            review: { status: "passed", reason: "Looks good." },
            approvalUrl: "https://app.getorchestra.io/pipeline-runs/run-42/lineage",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          runId: "run-42",
          status: "triggered",
          message: "The product content workflow has started.",
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      );
    });

    render(<ProductContentWorkflow />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /generate description/i }));

    expect(
      await screen.findByText(/description ready/i),
    ).toBeInTheDocument();
    expect(screen.getByText("A clear product description.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download \.txt/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /generate another/i }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      const urls = vi.mocked(globalThis.fetch).mock.calls.map((call) => String(call[0]));
      expect(urls.some((url) => url.includes("/wait"))).toBe(true);
    });

    const summary = screen.getByText(/submitted product/i).closest("div");
    expect(summary).not.toBeNull();
    if (summary) {
      expect(
        within(summary).getByText("TrailFlex Running Shoes"),
      ).toBeInTheDocument();
    }
  });

  it("does not let a late wait timeout overwrite a ready draft", async () => {
    const user = userEvent.setup();
    const waitGate: {
      resolve: ((value: Response) => void) | null;
    } = { resolve: null };

    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/wait")) {
        // Intentionally ignore abort so we can assert merge guards against a late timeout body.
        return new Promise<Response>((resolve) => {
          waitGate.resolve = resolve;
        });
      }
      if (url.includes("/api/orchestra/runs/") && !url.includes("/wait")) {
        return new Response(
          JSON.stringify({
            runId: "run-99",
            phase: "awaiting_approval",
            product: {
              productName: "TrailFlex Running Shoes",
              category: "Sports footwear",
              features: "Lightweight mesh upper, cushioned sole and rubber grip",
              tone: "Friendly",
            },
            draft: "Ready draft from status.",
            review: { status: "passed", reason: "Looks good." },
            approvalUrl:
              "https://app.getorchestra.io/pipeline-runs/run-99/lineage",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          runId: "run-99",
          status: "triggered",
          message: "The product content workflow has started.",
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      );
    });

    render(<ProductContentWorkflow />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /generate description/i }));

    expect(
      await screen.findByRole("button", { name: /check status/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /check status/i }));

    expect(await screen.findByText(/description ready/i)).toBeInTheDocument();

    waitGate.resolve?.(
      new Response(
        JSON.stringify({
          runId: "run-99",
          phase: "generating",
          product: {
            productName: "",
            category: "",
            features: "",
            tone: "Professional",
          },
          draft: null,
          review: null,
          approvalUrl: null,
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      expect(screen.getByText(/description ready/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Ready draft from status.")).toBeInTheDocument();
  });

  it("renders a safe error message when the request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "unavailable",
            message: "Orchestra is temporarily unavailable. Please try again.",
          },
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<ProductContentWorkflow />);
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /generate description/i }));

    expect(
      await screen.findByText(/orchestra is temporarily unavailable/i),
    ).toBeInTheDocument();
  });
});
