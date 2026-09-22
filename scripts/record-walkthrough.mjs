import { chromium } from "../.qa/node_modules/playwright/index.mjs";
import { mkdirSync, renameSync, rmSync } from "node:fs";

const videoDir = "evidence/walkthrough-video";
mkdirSync(videoDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const pause = (ms = 1600) => page.waitForTimeout(ms);
async function caption(text) {
  await page.evaluate((message) => {
    document.querySelector("#walkthrough-caption")?.remove();
    const element = document.createElement("div");
    element.id = "walkthrough-caption";
    element.textContent = message;
    Object.assign(element.style, {
      position: "fixed",
      left: "24px",
      right: "24px",
      bottom: "24px",
      zIndex: "99999",
      padding: "14px 18px",
      borderRadius: "10px",
      background: "#153e34",
      color: "white",
      font: "600 18px/1.4 Arial, sans-serif",
      boxShadow: "0 4px 18px #0005",
    });
    document.body.append(element);
  }, text);
  await pause();
}

await page.goto("http://localhost:5173/", {
  waitUntil: "networkidle",
  timeout: 60_000,
});
await caption(
  "TableTalk: photo and voice input with deterministic receipt splitting.",
);
await page
  .getByRole("button", { name: "Browse receipt templates", exact: true })
  .click();
await caption(
  "The reproducible set includes receipt photos and recorded voice scenarios.",
);
const allocationOnly = page
  .getByRole("button", { name: /Explore allocation only|Open sample split/ })
  .first();
await allocationOnly.click();
await page.locator(".receipt-row").first().waitFor();
await caption(
  "Repeated items keep stable identities. Final totals stay hidden until every row is allocated.",
);

const rows = page.locator(".receipt-row");
for (const [index, owner] of [
  [0, "Alex"],
  [1, "Sam"],
  [2, "Alex"],
  [3, "Sam"],
  [4, "Lee"],
]) {
  await rows
    .nth(index)
    .getByRole("button", { name: owner, exact: true })
    .click();
}
await rows.nth(5).getByRole("button", { name: "Share", exact: true }).click();
await page
  .getByRole("button", { name: "Apply equal split", exact: true })
  .click();
await page.locator(".status.settled").waitFor();
await caption(
  "Shared fries and service are apportioned in integer cents. The €47.75 total reconciles exactly.",
);

await rows.nth(1).getByRole("button", { name: "Alex", exact: true }).click();
await caption(
  "A correction replaces Coffee #2 ownership. The item count remains unchanged.",
);
await page.getByRole("button", { name: "Undo", exact: true }).click();
await caption("Undo restores the prior allocation and the same people roster.");

await rows
  .nth(0)
  .getByRole("button", { name: "Clear owners of Coffee #1", exact: true })
  .click();
await caption(
  "An unresolved row immediately removes the Balanced state and hides all final shares.",
);
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page.locator(".status.settled").waitFor();

await page.getByText("Session evidence", { exact: true }).click();
await caption(
  "Session evidence exports timings, operations, retries, pricing assumptions and exact verification.",
);
await page.evaluate(() =>
  document.querySelector("#walkthrough-caption")?.remove(),
);
await pause(1200);

const video = page.video();
await context.close();
await browser.close();
const source = await video.path();
const target = "evidence/tabletalk-walkthrough.webm";
rmSync(target, { force: true });
renameSync(source, target);
rmSync(videoDir, { recursive: true, force: true });
console.log(`Wrote ${target}`);
