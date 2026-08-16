/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة "من نحن" (القرار 9.5) — صفحة عامة مستقلة،
 * جزء من التنقّل الحي الثماني (تحل محل صفحة #7 القديمة، القرار 9.6).
 *
 * يُشغَّل بـ: node src/ui/pages/09-about/tests/page-smoke.test.mjs
 * يتطلب خادمًا محليًا يخدم جذر المستودع.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/09-about/index.html";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  try {
    await page.goto(BASE_URL, { waitUntil: "load" });
    await fn(page, consoleErrors);
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  } finally {
    await browser.close();
  }
}

await test("الصفحة تُحمَّل بلا أخطاء JS، والعنوان صحيح", async (page, errs) => {
  assert.equal(errs.length, 0, `أخطاء: ${errs.join(" | ")}`);
  assert.equal((await page.locator("h1").textContent()).trim(), "من نحن");
});

await test("رابط المستودع يظهر ويشير للعنوان الصحيح", async (page) => {
  const link = page.locator(".about-repo-link");
  await assert.doesNotReject(link.waitFor({ state: "visible", timeout: 2000 }));
  assert.equal(await link.getAttribute("href"), "https://github.com/orphanai2026/miran-platform");
});

await test("قائمة المساهمين تعرض عنصرًا واحدًا على الأقل (المالك)", async (page) => {
  const items = page.locator(".about-contributor");
  assert.ok((await items.count()) >= 1);
  const firstName = await items.first().locator(".about-contributor-name").textContent();
  assert.equal(firstName.trim(), "orphanai2026");
});

await test("رابط التنقّل الحالي (about) مُبرَز بشكل صحيح", async (page) => {
  const active = page.locator(".nav-item.active");
  assert.equal(await active.getAttribute("data-nav-key"), "about");
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
