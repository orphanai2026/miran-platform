/**
 * nav-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) للتنقّل العام الموحَّد (`src/ui/shared/nav.js`) —
 * أول ملف مشترك في `src/ui/shared/`. يستورده كل الصفحات الحية عبر JS
 * (صفحة #8 وحدها بلا JS، لها نسخة HTML ثابتة يدويًا من نفس البنية —
 * مُختبرة بشكل منفصل هنا أيضًا).
 *
 * **تحديث (القرار 9.6):** صفحة #7 (الإعدادات) أُزيلت من التنقّل الحي —
 * الرابط الثامن الآن "من نحن" (`09-about/`، القرار 9.5) بدلها. العدد
 * الإجمالي يبقى 8 روابط.
 *
 * **نطاق مقصود:** كل الروابط الثمانية موجودة بمساراتها الصحيحة على صفحتين
 * ممثلتين (الرئيسية والمقامات)، تمييز الصفحة الحالية صحيح على كل منهما،
 * وتنقّل فعلي حقيقي عبر الشريط من صفحة لأخرى يصل بنجاح، بالإضافة لتحقق من
 * نسخة صفحة #8 الثابتة يدويًا، وتأكيد صريح إن رابط "settings" لم يعد موجودًا.
 *
 * يُشغَّل بـ: node src/ui/shared/tests/nav-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع:
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const ORIGIN = "http://127.0.0.1:8934";
const PAGES_ROOT = `${ORIGIN}/src/ui/pages`;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await fn(page);
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

const EXPECTED_KEYS = [
  "home",
  "calibration",
  "exercises",
  "maqamat",
  "metronome",
  "library",
  "teaching",
  "about",
];

await test("صفحة #1 (الرئيسية): كل روابط التنقّل الثمانية موجودة، والحالية (home) مُبرَزة", async (page) => {
  await page.goto(`${PAGES_ROOT}/01-home/index.html`, { waitUntil: "load" });
  const links = page.locator(".site-nav-link");
  assert.equal(await links.count(), 8);
  for (const key of EXPECTED_KEYS) {
    await assert.doesNotReject(
      page.locator(`.site-nav-link[data-nav-key="${key}"]`).waitFor({ state: "visible", timeout: 2000 }),
      `رابط مفقود: ${key}`
    );
  }
  const active = page.locator(".site-nav-link.active");
  assert.equal(await active.count(), 1);
  assert.equal(await active.getAttribute("data-nav-key"), "home");
});

await test("صفحة #4 (المقامات): الرابط الحالي المُبرَز هو maqamat لا home", async (page) => {
  await page.goto(`${PAGES_ROOT}/04-maqamat-guide/index.html`, { waitUntil: "load" });
  const active = page.locator(".site-nav-link.active");
  assert.equal(await active.count(), 1);
  assert.equal(await active.getAttribute("data-nav-key"), "maqamat");
});

await test(
  "تنقّل فعلي: الضغط على رابط 'من نحن' من صفحة الرئيسية يصل فعليًا لصفحة #9 العاملة",
  async (page) => {
    await page.goto(`${PAGES_ROOT}/01-home/index.html`, { waitUntil: "load" });
    await page.locator('.site-nav-link[data-nav-key="about"]').click();
    await page.waitForURL(/09-about\/index\.html/, { timeout: 5000 });
    await page.waitForLoadState("load");
    await assert.doesNotReject(page.locator(".about-repo-link").waitFor({ state: "visible", timeout: 3000 }));
    const active = page.locator(".site-nav-link.active");
    assert.equal(await active.getAttribute("data-nav-key"), "about");
  }
);

await test(
  "القرار 9.6: صفحة #7 (الإعدادات) لم تعد في شريط التنقّل — لا رابط settings إطلاقًا",
  async (page) => {
    await page.goto(`${PAGES_ROOT}/01-home/index.html`, { waitUntil: "load" });
    assert.equal(await page.locator('.site-nav-link[data-nav-key="settings"]').count(), 0);
  }
);

await test(
  "صفحة #8 (الدليل التعليمي): نسخة التنقّل الثابتة يدويًا موجودة بنفس الروابط الثمانية، والحالية (teaching) مُبرَزة، وبلا سكربتات",
  async (page) => {
    await page.goto(`${PAGES_ROOT}/08-teaching-guide/index.html`, { waitUntil: "load" });
    const links = page.locator(".site-nav-link");
    assert.equal(await links.count(), 8);
    const active = page.locator(".site-nav-link.active");
    assert.equal(await active.count(), 1);
    assert.equal(await active.getAttribute("data-nav-key"), "teaching");
    const scriptTags = await page.locator("script").count();
    assert.equal(scriptTags, 0, "صفحة #8 يجب أن تبقى بلا أي وسم <script> (القرار 6)");
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
