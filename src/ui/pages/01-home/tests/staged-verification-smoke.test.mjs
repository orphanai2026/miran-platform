/**
 * staged-verification-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) للوحة "الاختبار المرحلي" (القرار 9.3) — الحالات
 * الثلاث الأساسية (بلا معايرة / بلا شيء معلّق / يوجد عنصر معلّق)، وبداية
 * تدفّق الالتقاط الحي (تحقّق حالة "جارٍ الاستماع" فقط — لا نعتمد على
 * تطابق فعلي من الميكروفون الوهمي، محتواه الصوتي غير مضمون التردد).
 *
 * منفصل تمامًا عن page-smoke.test.mjs الأصلي لصفحة #1 (لا يلمسه).
 *
 * يُشغَّل بـ: node src/ui/pages/01-home/tests/staged-verification-smoke.test.mjs
 * يتطلب خادمًا محليًا يخدم جذر المستودع.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/01-home/index.html";
const ORIGIN = new URL(BASE_URL).origin;

let passed = 0;
let failed = 0;

async function test(name, seedFn, fn) {
  const browser = await chromium.launch({
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext();
  await context.grantPermissions(["microphone"], { origin: ORIGIN });
  const page = await context.newPage();
  try {
    if (seedFn) await page.addInitScript(seedFn);
    await page.goto(BASE_URL, { waitUntil: "load" });
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

await test(
  "بلا معايرة تمارين (لا miran_cal): رسالة 'أكمل معايرة التمارين أولًا'",
  null,
  async (page) => {
    const idle = page.locator("#stagedVerifyApp .staged-verify-idle");
    await assert.doesNotReject(idle.waitFor({ state: "visible", timeout: 2000 }));
    assert.match(await idle.textContent(), /أكمل معايرة التمارين أولًا/);
  }
);

await test(
  "معايرة موجودة، لا تقدّم: رسالة 'لا يوجد اختبار مرحلي معلّق'",
  () => {
    localStorage.setItem("miran_cal", JSON.stringify({ qararHz: 293.66, concertA4: 440, cents: 0, ts: Date.now() }));
  },
  async (page) => {
    const idle = page.locator("#stagedVerifyApp .staged-verify-idle");
    await assert.doesNotReject(idle.waitFor({ state: "visible", timeout: 2000 }));
    assert.match(await idle.textContent(), /لا يوجد اختبار مرحلي معلّق/);
  }
);

await test(
  "يوم مكتمل (id=1، دو) بلا تسجيل معتمَد بعد: تظهر لوحة الاختبار المرحلي باسم النغمة الصحيح",
  () => {
    localStorage.setItem("miran_cal", JSON.stringify({ qararHz: 293.66, concertA4: 440, cents: 0, ts: Date.now() }));
    localStorage.setItem("miran_prog", JSON.stringify({ done: { 1: true }, streakDays: 1, lastDate: null }));
  },
  async (page) => {
    const prompt = page.locator(".staged-verify-prompt");
    await assert.doesNotReject(prompt.waitFor({ state: "visible", timeout: 2000 }));
    assert.match(await prompt.textContent(), /دو/);
    assert.equal(await page.locator(".staged-verify-dot").count(), 3);
  }
);

await test(
  "الضغط على 'ابدأ إعادة العزف' يطلب الميكروفون وينتقل لحالة 'جارٍ الاستماع'",
  () => {
    localStorage.setItem("miran_cal", JSON.stringify({ qararHz: 293.66, concertA4: 440, cents: 0, ts: Date.now() }));
    localStorage.setItem("miran_prog", JSON.stringify({ done: { 1: true }, streakDays: 1, lastDate: null }));
  },
  async (page) => {
    await page.locator("#stagedVerifyStartBtn").click();
    await assert.doesNotReject(
      page.locator(".staged-verify-status", { hasText: "جارٍ الاستماع" }).waitFor({ state: "visible", timeout: 3000 })
    );
    assert.equal(await page.locator("#stagedVerifyStartBtn").isDisabled(), true);
  }
);

await test(
  "يوم إيقاعي مكتمل (id=10، بلا نغمة) لا يُحتسَب كاختبار مرحلي معلّق",
  () => {
    localStorage.setItem("miran_cal", JSON.stringify({ qararHz: 293.66, concertA4: 440, cents: 0, ts: Date.now() }));
    localStorage.setItem("miran_prog", JSON.stringify({ done: { 10: true }, streakDays: 1, lastDate: null }));
  },
  async (page) => {
    const idle = page.locator("#stagedVerifyApp .staged-verify-idle");
    await assert.doesNotReject(idle.waitFor({ state: "visible", timeout: 2000 }));
    assert.match(await idle.textContent(), /لا يوجد اختبار مرحلي معلّق/);
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
