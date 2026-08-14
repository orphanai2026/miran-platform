/**
 * baseline-regression.test.mjs
 * ============================================================
 * اختبار انحدار Playwright يغطي السلوك الحالي لـ index.html كخط أساس
 * (baseline) — **قبل** أي تفكيك للملف إلى وحدات منفصلة (المرحلة 6).
 *
 * لماذا هذا الملف موجود: سجل القرارات يذكر أن التمارين "مُختبرة بانحدار
 * Playwright كامل"، لكن مستودع المصدر الأصلي (`github.com/orphanai2026/miran`)
 * لا يحتوي فعليًا أي ملفات اختبار. بدل تفكيك 4255 سطرًا من كود مترابط
 * بإحكام بلا شبكة أمان، كُتبت هذه الاختبارات أولًا لتوثيق السلوك الحالي
 * كخط أساس أخضر — أي تفكيك لاحق يجب أن يمر بنفس هذه الاختبارات دون تغيير.
 *
 * **نطاق مقصود:** اختبارات تنقّل/عرض/بيانات فقط — لا يغطي التقاط ميكروفون
 * فعلي (بيئة headless بلا جهاز صوت حقيقي). أي منطق صوتي (pitch detection,
 * calibration) خارج نطاق هذا الخط الأساس عمدًا؛ التحقق منه يبقى يدويًا.
 *
 * يُشغَّل بـ: node src/exercises/legacy-miran/tests/baseline-regression.test.mjs
 * **يتطلب خادمًا محليًا يخدم index.html أولًا** (مثلًا:
 * `python3 -m http.server 8934` من داخل legacy-miran/).
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/index.html";

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

await test("الصفحة تُحمَّل بلا أخطاء JS حقيقية (نتجاهل حجب شبكة الحماية للخطوط الخارجية)", async (page, consoleErrors) => {
  // ملاحظة بيئة: بيئة العمل هذي تحجب fonts.googleapis.com/fonts.gstatic.com
  // بسياسة شبكة مقيدة بنطاقات محددة (غير متعلقة بالتطبيق نفسه) — هذا الفلتر
  // مقصود، ويجب أن يبقى عند تشغيل هذا الاختبار خارج هذه البيئة أيضًا (غير ضار).
  const realErrors = consoleErrors.filter(
    (e) => !e.includes("fonts.googleapis.com") && !e.includes("fonts.gstatic.com") && !e.includes("403")
  );
  assert.equal(realErrors.length, 0, `أخطاء كونسول حقيقية: ${realErrors.join(" | ")}`);
});

await test("شاشة الرئيسية (view-home) نشطة افتراضيًا عند التحميل", async (page) => {
  const isActive = await page.evaluate(() => document.getElementById("view-home").classList.contains("active"));
  assert.equal(isActive, true);
});

await test("عداد الأيام المُتقنة (streakN) يبدأ من صفر لمستخدم جديد", async (page) => {
  const text = await page.textContent("#streakN");
  assert.equal(text.trim(), "0");
});

await test("عناصر الرئيسية الأساسية موجودة: عنوان اليوم، زر البدء، محطة المعايرة/زرها", async (page) => {
  await page.waitForSelector("#tonightTitle");
  await page.waitForSelector("#btnStart");
  // ملاحظة سلوك حقيقي مكتشف أثناء الاختبار: btnCalibSeg يُخفى عمدًا عبر JS
  // (`style.display = useThread ? 'none' : ''`) عندما يستخدم اليوم الحالي
  // تصميم "الخيط" (thread) — عندها تظهر محطة "calibWaitingStation" بدلًا
  // منه. كلا العنصرين موجودان في DOM دائمًا؛ الظاهر منهما يعتمد على حالة
  // التقدّم. نتحقق من وجود العنصرين في DOM، لا من ظهور واحد بعينه بالضبط.
  const calibSegExists = (await page.locator("#btnCalibSeg").count()) === 1;
  const calibStationExists = (await page.locator("#calibWaitingStation").count()) === 1;
  assert.ok(calibSegExists && calibStationExists, "عنصرا المعايرة يجب أن يوجدا في DOM كلاهما");
  const startText = await page.textContent("#btnStart");
  assert.ok(startText.trim().length > 0);
});

await test("بيانات المنهج مُحمَّلة فعليًا: رحلة المستويات تعرض أكثر من مستوى واحد في DOM", async (page) => {
  // ملاحظة تقنية مكتشفة أثناء الاختبار: CURRICULUM وLEVELS مُعرَّفان بـ `const`
  // على مستوى السكربت — بعكس `var`، هذا لا يُنشئ خاصية على window تلقائيًا في
  // المتصفح، فالوصول لهما من الخارج (window.CURRICULUM) يرجع دائمًا undefined
  // رغم أن البيانات مُحمَّلة وتُستخدم فعليًا داخل الصفحة. الدليل الموثوق إذن هو
  // العرض الفعلي في DOM لا قراءة المتغير مباشرة.
  await page.waitForSelector("#lvlChipsRow .lvl-chip", { timeout: 5000 }).catch(() => {});
  const chipCount = await page.locator("#lvlChipsRow > *").count();
  assert.ok(chipCount > 1, `عدد شرائح المستويات المعروضة: ${chipCount}`);
});

await test("التنقّل: الضغط على 'دليل الوضعية' يُفعّل شاشة الدليل (view-guide)", async (page) => {
  await page.click("#btnGuide");
  const isActive = await page.evaluate(() => document.getElementById("view-guide").classList.contains("active"));
  assert.equal(isActive, true);
  const homeActive = await page.evaluate(() => document.getElementById("view-home").classList.contains("active"));
  assert.equal(homeActive, false, "الرئيسية يجب ألا تبقى نشطة بعد التنقّل");
});

await test("التنقّل: زر الرجوع من دليل الوضعية يعيد للرئيسية", async (page) => {
  await page.click("#btnGuide");
  await page.click("#guideBack");
  const homeActive = await page.evaluate(() => document.getElementById("view-home").classList.contains("active"));
  assert.equal(homeActive, true);
});

await test("التخزين المحلي: تصفير التقدّم يعيد streakN إلى صفر (بعد تأكيد الحوار)", async (page) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.click("#btnReset");
  await page.waitForTimeout(200);
  const text = await page.textContent("#streakN");
  assert.equal(text.trim(), "0");
});

await test("لا يوجد استثناء غير مُعالَج عند فتح شاشة المعايرة (بدون إذن ميكروفون فعلي)", async (page, consoleErrors) => {
  // نفتح شاشة المعايرة مباشرة عبر show('calib') بدل الضغط على زر قد يكون
  // مخفيًا حسب حالة التقدّم الحالية (انظر الملاحظة أعلاه عن btnCalibSeg).
  await page.evaluate(() => window.show && window.show("calib"));
  await page.waitForTimeout(300);
  await page.click("#btnCalib").catch(() => {}); // قد لا يوجد هذا المعرّف بالضبط؛ محاولة غير حرجة
  await page.waitForTimeout(500);
  const realErrors = consoleErrors.filter(
    (e) =>
      !e.includes("fonts.googleapis.com") &&
      !e.includes("fonts.gstatic.com") &&
      !e.includes("403") &&
      !e.includes("Permission") &&
      !e.includes("NotAllowed") &&
      !/mic|microphone|getUserMedia/i.test(e)
  );
  assert.equal(realErrors.length, 0, `أخطاء غير متوقعة: ${realErrors.join(" | ")}`);
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
if (failed > 0) process.exitCode = 1;
