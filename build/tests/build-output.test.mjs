/**
 * build-output.test.mjs
 * ============================================================
 * الاختبار الحقيقي لوعد "بلا خادم" — يفتح مخرجات `build/dist/` عبر بروتوكول
 * `file://` مباشرة، **بلا أي خادم HTTP محلي إطلاقًا** (بخلاف كل اختبارات
 * الصفحات الأخرى في المستودع التي تحتاج `python3 -m http.server` لأنها
 * تختبر المصدر غير المدموج، حيث وحدات ES تحتاج أصل HTTP). لو نجح هذا
 * الاختبار، الوعد التأسيسي ("ملف واحد نهائي، بلا خادم، بلا اعتماديات
 * تشغيل") محقَّق فعليًا لا نظريًا فقط.
 *
 * **مطلوب تشغيل `node build/build.mjs` أولًا** لإنتاج `build/dist/` قبل
 * تشغيل هذا الاختبار.
 *
 * يُشغَّل بـ: node build/tests/build-output.test.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");

if (!existsSync(DIST_DIR)) {
  console.error("✗ build/dist/ غير موجود — شغّل `node build/build.mjs` أولًا.");
  process.exit(1);
}

function fileUrl(relPath) {
  return `file://${path.join(DIST_DIR, relPath)}`;
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  try {
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

function realErrors(consoleErrors) {
  return consoleErrors.filter(
    (e) => !e.includes("fonts.googleapis.com") && !e.includes("fonts.gstatic.com") && !e.includes("403")
  );
}

// ==================== الصفحات الست المدموجة (كانت وحدات ES) ====================

await test("01-home عبر file:// بلا خادم: تُحمَّل بلا أخطاء، تعرض تقدّمًا وروابط تنقّل", async (page, errs) => {
  await page.goto(fileUrl("01-home/index.html"), { waitUntil: "load" });
  await page.waitForTimeout(300);
  assert.equal(realErrors(errs).length, 0, `أخطاء: ${realErrors(errs).join(" | ")}`);
  assert.equal((await page.locator("h1").textContent()).trim(), "مِران");
  assert.equal((await page.locator("#homeCurriculumDone").textContent()).trim(), "0");
  assert.equal(await page.locator(".home-quick-link").count(), 7);
  assert.equal(await page.locator(".site-nav-link").count(), 8);
});

await test("02-calibration عبر file://: تُحمَّل بلا أخطاء، المترونوم المصغّر يعمل", async (page, errs) => {
  await page.goto(fileUrl("02-calibration/index.html"), { waitUntil: "load" });
  await page.waitForTimeout(300);
  assert.equal(realErrors(errs).length, 0, `أخطاء: ${realErrors(errs).join(" | ")}`);
  await assert.doesNotReject(page.locator("#calibRecordBtn").waitFor({ state: "visible", timeout: 3000 }));
  const toggle = page.locator(".metronome-mini-toggle");
  const before = await toggle.textContent();
  await toggle.click();
  await page.waitForTimeout(150);
  assert.notEqual(await toggle.textContent(), before);
});

await test("04-maqamat-guide عبر file://: تُحمَّل بلا أخطاء، 5 مقامات، تنقّل بين المقامات يعمل", async (page, errs) => {
  await page.goto(fileUrl("04-maqamat-guide/index.html"), { waitUntil: "load" });
  await page.waitForTimeout(300);
  assert.equal(realErrors(errs).length, 0, `أخطاء: ${realErrors(errs).join(" | ")}`);
  assert.equal(await page.locator(".maqam-list-btn").count(), 5);
  await page.locator('.maqam-list-btn[data-maqam-name="صبا"]').click();
  await page.waitForTimeout(50);
  assert.equal((await page.locator("#maqamDetailsName").textContent()).trim(), "صبا");
});

await test("05-metronome عبر file://: تُحمَّل بلا أخطاء، التشغيل/الإيقاف يعمل", async (page, errs) => {
  await page.goto(fileUrl("05-metronome/index.html"), { waitUntil: "load" });
  await page.waitForTimeout(300);
  assert.equal(realErrors(errs).length, 0, `أخطاء: ${realErrors(errs).join(" | ")}`);
  const toggle = page.locator(".metronome-toggle");
  assert.equal(await toggle.textContent(), "ابدأ");
  await toggle.click();
  await page.waitForTimeout(150);
  assert.equal(await toggle.textContent(), "أوقف");
  await toggle.click();
});

await test("06-library-export عبر file://: تُحمَّل بلا أخطاء، حالة فارغة صحيحة", async (page, errs) => {
  await page.goto(fileUrl("06-library-export/index.html"), { waitUntil: "load" });
  await page.waitForTimeout(300);
  assert.equal(realErrors(errs).length, 0, `أخطاء: ${realErrors(errs).join(" | ")}`);
  await assert.doesNotReject(page.locator("#libraryEmpty").waitFor({ state: "visible", timeout: 3000 }));
});

await test("07-settings-sync عبر file://: تُحمَّل بلا أخطاء، كود المزامنة يظهر ويثبت بعد إعادة التحميل", async (page, errs) => {
  await page.goto(fileUrl("07-settings-sync/index.html"), { waitUntil: "load" });
  await page.waitForTimeout(300);
  assert.equal(realErrors(errs).length, 0, `أخطاء: ${realErrors(errs).join(" | ")}`);
  const before = (await page.locator("#settingsUserId").textContent()).trim();
  assert.match(before, /^[0-9a-f-]{20,}$/i);
  await page.reload({ waitUntil: "load" });
  const after = (await page.locator("#settingsUserId").textContent()).trim();
  assert.equal(before, after);
});

// ==================== الصفحتان بلا وحدات ES (نسخ فقط) ====================

await test("03-exercises عبر file://: التوجيه التلقائي يصل فعليًا لمنهج legacy-miran المنسوخ في dist", async (page, errs) => {
  await page.goto(fileUrl("03-exercises/index.html"));
  await page.waitForURL(/exercises\/legacy-miran\/index\.html/, { timeout: 5000 });
  await page.waitForLoadState("load");
  await page.waitForTimeout(300);
  assert.equal(realErrors(errs).length, 0, `أخطاء بعد التوجيه: ${realErrors(errs).join(" | ")}`);
  await assert.doesNotReject(page.locator("#view-home").waitFor({ state: "visible", timeout: 3000 }));
});

await test("08-teaching-guide عبر file://: تُحمَّل بلا أخطاء، الطبقات الثلاث والتنقّل الثابت موجودان", async (page, errs) => {
  await page.goto(fileUrl("08-teaching-guide/index.html"), { waitUntil: "load" });
  await page.waitForTimeout(300);
  assert.equal(realErrors(errs).length, 0, `أخطاء: ${realErrors(errs).join(" | ")}`);
  assert.equal(await page.locator(".layer-card").count(), 3);
  assert.equal(await page.locator(".site-nav-link").count(), 8);
});

// ==================== تنقّل فعلي بين صفحتين، بلا خادم بالكامل ====================

await test(
  "تنقّل فعلي عبر file://: الضغط على رابط 'الإعدادات' من صفحة الرئيسية المدموجة يصل لصفحة #7 المدموجة، بلا خادم إطلاقًا",
  async (page, errs) => {
    await page.goto(fileUrl("01-home/index.html"), { waitUntil: "load" });
    await page.locator('.site-nav-link[data-nav-key="settings"]').click();
    await page.waitForURL(/07-settings-sync\/index\.html/, { timeout: 5000 });
    await page.waitForLoadState("load");
    await page.waitForTimeout(300);
    assert.equal(realErrors(errs).length, 0, `أخطاء بعد التنقّل: ${realErrors(errs).join(" | ")}`);
    await assert.doesNotReject(page.locator("#settingsUserId").waitFor({ state: "visible", timeout: 3000 }));
    assert.ok(page.url().startsWith("file://"), "يجب أن يبقى التنقّل عبر file:// بلا أي خادم");
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
