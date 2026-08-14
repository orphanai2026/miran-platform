/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #2 (المعايرة الشخصية) بعد الدمج الفعلي بين
 * src/calibration/ و src/metronome/ وواجهة جديدة.
 *
 * **نطاق مقصود:** تحميل، عناصر DOM أساسية، تفاعل المترونوم المصغّر، ومسار
 * "اعتماد الاسم فقط" (لا يحتاج ميكروفونًا). **لا يغطي التقاط ميكروفون فعلي**
 * (بيئة headless بلا جهاز صوت حقيقي) — لكنه يتحقق أن الضغط على زر التسجيل
 * دون إذن ميكروفون **لا يرمي استثناءً غير مُعالَج** (نفس نمط اختبار #9 في
 * baseline-regression.test.mjs لصفحة مِران القديمة).
 *
 * يُشغَّل بـ: node src/ui/pages/02-calibration/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع (لأن الصفحة تستورد وحدات ES من
 * ../../../calibration/ و ../../../metronome/ بمسارات نسبية تتجاوز مجلد
 * الصفحة نفسها):
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/02-calibration/index.html";

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

await test("عناصر الصفحة الأساسية موجودة: حقل الإصبعة، السجل، الملف الشخصي، زر التسجيل", async (page) => {
  await assert.doesNotReject(page.locator("#calibFingering").waitFor({ state: "visible", timeout: 3000 }));
  await assert.doesNotReject(page.locator("#calibRegister").waitFor({ state: "visible", timeout: 3000 }));
  await assert.doesNotReject(page.locator("#calibProfile").waitFor({ state: "visible", timeout: 3000 }));
  await assert.doesNotReject(page.locator("#calibRecordBtn").waitFor({ state: "visible", timeout: 3000 }));
});

await test("المترونوم المصغّر مُدمَج فعليًا (زر التشغيل/الإيقاف موجود ويعمل)", async (page) => {
  const toggle = page.locator(".metronome-mini-toggle");
  await assert.doesNotReject(toggle.waitFor({ state: "visible", timeout: 3000 }));
  const before = await toggle.textContent();
  await toggle.click();
  await page.waitForTimeout(150);
  const after = await toggle.textContent();
  assert.notEqual(before, after, "نص الزر يجب أن يتغيّر بعد الضغط (تشغيل/إيقاف)");
  await toggle.click(); // نوقفه مجددًا حتى لا يبقى صوت يعمل بعد الاختبار
});

await test("لا يوجد استثناء غير مُعالَج عند الضغط على 'سجّل عينة' بدون إذن ميكروفون فعلي", async (page, consoleErrors) => {
  await page.locator("#calibRecordBtn").click();
  await page.waitForTimeout(500); // وقت كافٍ لمحاولة getUserMedia وفشلها
  assert.equal(realErrors(consoleErrors).length, 0, `استثناءات غير متوقعة: ${realErrors(consoleErrors).join(" | ")}`);
  const hintText = await page.locator("#calibHint").textContent();
  assert.ok(hintText && hintText.length > 0, "يجب أن تُعرض رسالة إرشادية بدل الانهيار الصامت");
});

await test(
  "استثناء القرار 1: 'اعتماد الاسم فقط' يعمل بلا ميكروفون، ويبقى محفوظًا محليًا بعد إعادة تحميل الصفحة",
  async (page) => {
    await page.locator("#calibFingering").fill("ري");
    await page.locator("#calibRegister").selectOption("قرار");
    await page.locator("#calibTeachNameBtn").click();
    await page.waitForTimeout(100);
    const hintText = await page.locator("#calibHint").textContent();
    assert.match(hintText, /ري/, "النص الإرشادي يجب أن يؤكد اعتماد الاسم المكتوب");

    // نفس المتصفح/السياق (نفس localStorage) — إعادة تحميل حقيقية للتحقق من التخزين المحلي.
    await page.reload({ waitUntil: "load" });
    await page.locator("#calibFingering").fill("ري");
    await page.locator("#calibRegister").selectOption("قرار");
    await page.waitForTimeout(100);
    const hintAfterReload = await page.locator("#calibHint").textContent();
    assert.match(
      hintAfterReload,
      /ري/,
      "يجب أن يظهر الاسم المُعتمَد سابقًا بعد إعادة التحميل (استُرجع من localStorage)"
    );
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
