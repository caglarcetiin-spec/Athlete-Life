import { afterEach, expect, it, vi } from "vitest";
import { api } from "./contracts";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("waits for an AI response beyond ordinary sync timeout without retrying", async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const c = new AbortController();
    setTimeout(() => c.abort(new DOMException("Timeout", "TimeoutError")), ms);
    return c.signal;
  });
  const fetcher = vi.fn(
    (_url, options: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        options.signal?.addEventListener("abort", () =>
          reject(options.signal?.reason),
        );
        setTimeout(
          () => resolve(new Response(JSON.stringify({ program: "synthetic" }))),
          130000,
        );
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const result = api("ai-program-drafts", { method: "POST" });
  await vi.advanceTimersByTimeAsync(130000);
  expect(await result).toEqual({ program: "synthetic" });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("keeps ordinary requests at 12 seconds and honors caller cancellation", async () => {
  const spy = vi.spyOn(AbortSignal, "timeout");
  const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetcher);
  await api("bootstrap");
  expect(spy).toHaveBeenCalledWith(12000);
  const signal = new AbortController().signal;
  fetcher.mockResolvedValue(new Response("{}"));
  await api("ai-program-drafts", { signal });
  expect(fetcher.mock.calls[1][1].signal).toBe(signal);
});
