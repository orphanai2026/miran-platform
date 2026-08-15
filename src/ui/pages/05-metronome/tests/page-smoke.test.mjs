/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #5 (المترونوم المستقل الكامل) بعد ربطها فعليًا
 * بـ mountFullMetronome من src/metronome/metronome-ui-full.js.
 *
 * **نطاق مقصود:** تحميل، عناصر DOM أساسية (BPM، شريط التمرير، اختيار الميزان،
 * مؤشرات النبضة، زر التشغيل/الإيقاف)، وتفاعل فعلي (تغيير BPM، تغيير الميزان،
 * تشغيل/إيقاف). **لا يغطي التحقق السمعي الفعلي من غياب الانجراف** — ذلك
 * يبقى يدويًا عبر src/metronome/demo.html (موثّق في src/metronome/README.md).
 *
 * يُشغَّل بـ: node src/ui/pages/05-metronome/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع (لأن الصفحة تستورد وحدات ES من
 * ../../../metronome/ بمسارات نسبية تتجاوز مجلد الصفحة نفسها):
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/05-metronome/index.html";

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

function realErrors(consoleErrors) {
  return consoleErrors.filter(
    (e) => !e.includes("fonts.googleapis.com") && !e.includes("fonts.gstatic.com") && !e.includes("403")
  );
}

await test("الصفحة تُحمَّل بلا أخطاء JS حقيقية", async (page, consoleErrors) => {
  assert.equal(realErrors(consoleErrors).length, 0, `أخطاء كونسول: ${realErrors(consoleErrors).join(" | ")}`);
});

await test(
  "عناصر الواجهة الأساسية موجودة: قيمة BPM، شريط التمرير، اختيار الميزان، مؤشرات النبضة، زر التشغيل/الإيقاف",
  async (page) => {
    await assert.doesNotReject(page.locator(".metronome-bpm-value").waitFor({ state: "visible", timeout: 3000 }));
    await assert.doesNotReject(page.locator(".metronome-bpm-slider").waitFor({ state: "visible", timeout: 3000 }));
    await assert.doesNotReject(page.locator(".metronome-beats-select").waitFor({ state: "visible", timeout: 3000 }));
    await assert.doesNotReject(
      page.locator(".metronome-beat-indicators").waitFor({ state: "visible", timeout: 3000 })
    );
    await assert.doesNotReject(page.locator(".metronome-toggle").waitFor({ state: "visible", timeout: 3000 }));
  }
);

await test("عدد مؤشرات النبضة يطابق قيمة الميزان الافتراضية (4)", async (page) => {
  const dots = page.locator(".metronome-beat-dot");
  assert.equal(await dots.count(), 4);
});

await test("تحريك شريط BPM يحدّث القيمة المعروضة فورًا", async (page) => {
  const slider = page.locator(".metronome-bpm-slider");
  await slider.fill("150");
  await slider.dispatchEvent("input");
  await page.waitForTimeout(50);
  const value = await page.locator(".metronome-bpm-value").textContent();
  assert.equal(value, "150");
});

await test("تغيير اختيار الميزان إلى 3 يعيد بناء مؤشرات النبضة إلى ثلاثة", async (page) => {
  await page.locator(".metronome-beats-select").selectOption("3");
  await page.waitForTimeout(50);
  const dots = page.locator(".metronome-beat-dot");
  assert.equal(await dots.count(), 3);
});

await test(
  "الضغط على زر التشغيل/الإيقاف يبدّل النص (ابدأ ↔ أوقف) بلا استثناء غير مُعالَج",
  async (page, consoleErrors) => {
    const toggle = page.locator(".metronome-toggle");
    const before = await toggle.textContent();
    assert.equal(before, "ابدأ");
    await toggle.click();
    await page.waitForTimeout(150);
    const after = await toggle.textContent();
    assert.equal(after, "أوقف");
    await toggle.click(); // نوقفه مجددًا حتى لا يبقى صوت يعمل بعد الاختبار
    await page.waitForTimeout(50);
    const afterStop = await toggle.textContent();
    assert.equal(afterStop, "ابدأ");
    assert.equal(realErrors(consoleErrors).length, 0, `استثناءات غير متوقعة: ${realErrors(consoleErrors).join(" | ")}`);
  }
);

await test(
  "استمرارية التفضيلات: تغيير BPM والميزان ثم إعادة تحميل الصفحة يستعيد نفس القيمتين",
  async (page) => {
    await page.locator(".metronome-beats-select").selectOption("6");
    const slider = page.locator(".metronome-bpm-slider");
    await slider.fill("140");
    await slider.dispatchEvent("input");
    await page.waitForTimeout(50);

    await page.reload({ waitUntil: "load" });

    assert.equal(await page.locator(".metronome-bpm-value").textContent(), "140");
    assert.equal(await page.locator(".metronome-beats-select").inputValue(), "6");
    assert.equal(await page.locator(".metronome-beat-dot").count(), 6);
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
