import { expect, it } from "bun:test";
import { runWithWorker } from "./index";

it("runs a simple computation", async () => {
  const res = await runWithWorker((a, b) => a + b, [1, 2]);
  expect(res).toBe(3);
});

it("supports imports in dependency array", async () => {
  const res = await runWithWorker(
    ({ multiply }, a, b) => multiply(a, b),
    [import("./index.test_import.test"), 7, 8],
  );
  expect(res).toBe(56);
});

it("supports Promises", async () => {
  expect(
    await runWithWorker(
      () =>
        new Promise((resolve) => {
          resolve("resolved");
        }),
    ),
  ).toBe("resolved");
});

it("terminates when cancelled", async () => {
  const res = runWithWorker(() => {
    while (true) {}
  });
  res.cancel();
  const err = await res.catch(() => "threw");
  expect(err).toBe("threw");
});

it("terminates on timeout", async () => {
  const res = await runWithWorker(
    () => {
      while (true) {}
    },
    [],
    {
      executionTimeoutMs: 0,
    },
  ).catch(() => "threw");
  expect(res).toBe("threw");
});

it("can't access outer scope", async () => {
  // For some reason this is required in Bun to make it not use the global scope?
  Bun.isMainThread;
  const x = 1;
  expect(await runWithWorker(() => x).catch(() => "threw")).toBe("threw");
});

it("runs on other thread", async () => {
  expect(Bun.isMainThread).toBe(true);
  expect(await runWithWorker(() => Bun.isMainThread)).toBe(false);
});
