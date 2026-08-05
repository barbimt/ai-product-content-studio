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
  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/api/orchestra/history")) {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  });
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
      if (url.includes("/api/orchestra/history")) {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
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
      if (url.includes("/api/orchestra/history")) {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
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
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      expect(screen.getByText(/description ready/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Ready draft from status.")).toBeInTheDocument();
  });

  it("returns to the live draft when re-selecting the active history run", async () => {
    const user = userEvent.setup();
    const historyItem = {
      runId: "run-live",
      product: {
        productName: "BrightSip Glass Bottle 750ml",
        category: "Reusable bottles",
        features: "750ml borosilicate glass, silicone sleeve",
        tone: "Friendly" as const,
      },
      draft: null,
      review: null,
      phase: "generating" as const,
      createdAt: "2026-08-05T18:00:00.000Z",
    };

    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/orchestra/history")) {
        return new Response(JSON.stringify({ items: [historyItem] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/wait")) {
        return new Response(
          JSON.stringify({
            runId: "run-live",
            phase: "awaiting_approval",
            product: historyItem.product,
            draft: "BrightSip draft from live wait.",
            review: { status: "passed", reason: "Looks good." },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/api/orchestra/runs/") && !url.includes("/wait")) {
        return new Response(
          JSON.stringify({
            runId: "run-live",
            phase: "awaiting_approval",
            product: historyItem.product,
            draft: "BrightSip draft from live wait.",
            review: { status: "passed", reason: "Looks good." },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          runId: "run-live",
          status: "triggered",
          message: "The product content workflow has started.",
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      );
    });

    render(<ProductContentWorkflow />);
    expect(
      await screen.findByRole("button", {
        name: /brightsip glass bottle 750ml/i,
      }),
    ).toBeInTheDocument();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /generate description/i }));
    expect(await screen.findByText(/description ready/i)).toBeInTheDocument();
    expect(
      screen.getByText("BrightSip draft from live wait."),
    ).toBeInTheDocument();

    // Stale history snapshot without draft should not trap the UI.
    await user.click(
      screen.getByRole("button", { name: /brightsip glass bottle 750ml/i }),
    );
    expect(await screen.findByText(/description ready/i)).toBeInTheDocument();
    expect(
      screen.getByText("BrightSip draft from live wait."),
    ).toBeInTheDocument();
  });

  it("shows loading while hydrating a history item draft", async () => {
    const user = userEvent.setup();
    const statusGate: {
      resolve: ((value: Response) => void) | null;
    } = { resolve: null };

    vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/orchestra/history")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                runId: "run-old",
                product: {
                  productName: "QuietCharge Pad",
                  category: "Accessories",
                  features: "MagSafe compatible",
                  tone: "Professional",
                },
                draft: null,
                review: null,
                phase: "generating",
                createdAt: "2026-08-05T17:00:00.000Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/api/orchestra/runs/run-old")) {
        return new Promise<Response>((resolve) => {
          statusGate.resolve = resolve;
        });
      }
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(<ProductContentWorkflow />);
    const historyButton = await screen.findByRole("button", {
      name: /quietcharge pad/i,
    });
    await user.click(historyButton);

    expect(
      await screen.findByText(/loading this description from orchestra/i),
    ).toBeInTheDocument();

    statusGate.resolve?.(
      new Response(
        JSON.stringify({
          runId: "run-old",
          phase: "approved",
          product: {
            productName: "QuietCharge Pad",
            category: "Accessories",
            features: "MagSafe compatible",
            tone: "Professional",
          },
          draft: "QuietCharge pad draft text.",
          review: { status: "passed", reason: "Good." },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      expect(
        screen.getAllByText("QuietCharge pad draft text.").length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(
      screen.queryByText(/loading this description from orchestra/i),
    ).not.toBeInTheDocument();
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
