/**
 * home-page.js
 * ============================================================
 * منطق صفحة #1 (الرئيسية) — نظرة عامة، تقدّم المتعلم، دخول سريع للمرحلة
 * الحالية (القسم 7). تقرأ بيانات التقدّم المحلية فقط، بلا أي تعديل أو
 * استيراد لملفات محمية.
 *
 * **مصادر البيانات، كل واحدة مقروءة لا مُعاد بناؤها:**
 * - تقدّم المنهج: مفتاح localStorage الخام `miran_prog` كما يكتبه
 *   `src/exercises/legacy-miran/js/persistence.js` (ملف محمي — القراءة
 *   المباشرة لمفتاح localStorage لا تستورد ولا تلمس ذلك الملف نفسه).
 * - تقدّم المعايرة: يعيد استخدام `loadRawState` من صفحة #2 و
 *   `PersonalReferenceStore` من `src/calibration/` (نفس نمط صفحة #6).
 * - المعرّف المحلي (كود المزامنة): يعيد استخدام `getOrCreateLocalUserId`
 *   من صفحة #7 (نفس نمط الاستيراد العابر للصفحات).
 */
import { CalibrationSample, PersonalReferenceStore } from "../../../calibration/calibration-engine.js";
import { loadRawState } from "../02-calibration/sample-store.js";
import { getOrCreateLocalUserId } from "../07-settings-sync/local-user-id.js";

const LEGACY_PROGRESS_KEY = "miran_prog";

const QUICK_LINKS = [
  { href: "../03-exercises/index.html", label: "التمارين", note: "استكمال منهج الـ74 يومًا", primary: true },
  { href: "../02-calibration/index.html", label: "المعايرة الشخصية", note: "تسجيل نغمات، بناء المرجع" },
  { href: "../04-maqamat-guide/index.html", label: "دليل المقامات", note: "السلم والسِّير" },
  { href: "../05-metronome/index.html", label: "المترونوم", note: "مستقل، بجدولة lookahead" },
  { href: "../06-library-export/index.html", label: "المكتبة والتصدير", note: "مراجعة العينات، تصدير JSON" },
  { href: "../08-teaching-guide/index.html", label: "الدليل التعليمي", note: "حدود المنصة، متى تحتاج معلمًا" },
  { href: "../09-about/index.html", label: "من نحن", note: "عن المشروع والمساهمين" },
];

/** يقرأ تقدّم المنهج مباشرة من مفتاح localStorage الخام — بلا استيراد لأي ملف محمي. */
function readLegacyProgress() {
  try {
    const raw = localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (!raw) return { doneCount: 0, foundationStarted: false };
    const parsed = JSON.parse(raw);
    const doneCount = parsed?.done ? Object.keys(parsed.done).length : 0;
    const foundationStarted = Boolean(parsed?.foundation?.breath);
    return { doneCount, foundationStarted };
  } catch (e) {
    return { doneCount: 0, foundationStarted: false };
  }
}

/** يعيد بناء ملخص تقدّم المعايرة من بيانات صفحة #2 (نفس نمط صفحة #6). */
function readCalibrationSummary() {
  const store = new PersonalReferenceStore();
  const raw = loadRawState();
  for (const s of raw.samples) {
    try {
      store.addSample(new CalibrationSample(s));
    } catch (e) {
      // عيّنة تالفة — تُتجاهل بصمت (نفس منطق صفحة #6).
    }
  }
  for (const [key, snapshot] of Object.entries(raw.snapshots)) {
    const [fingering, register] = key.split("::");
    store.restoreFrozenSnapshot(fingering, register, snapshot);
  }
  const keys = new Set();
  for (const s of raw.samples) keys.add(`${s.fingering}::${s.register}`);
  for (const key of Object.keys(raw.snapshots)) keys.add(key);
  let frozenCount = 0;
  for (const key of Object.keys(raw.snapshots)) {
    const [fingering, register] = key.split("::");
    if (store.getFrozenReference(fingering, register)) frozenCount++;
  }
  return { totalNotes: keys.size, frozenCount };
}

function renderQuickLinks() {
  return QUICK_LINKS.map(
    (link) => `
      <a class="home-quick-link ${link.primary ? "primary" : ""}" href="${link.href}" data-page-label="${link.label}">
        <span class="home-quick-link-label">${link.label}</span>
        <span class="home-quick-link-note">${link.note}</span>
      </a>
    `
  ).join("");
}

/**
 * يبني صفحة الرئيسية كاملة داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountHomePage(container) {
  const localUserId = getOrCreateLocalUserId();
  const { doneCount, foundationStarted } = readLegacyProgress();
  const { totalNotes, frozenCount } = readCalibrationSummary();

  container.innerHTML = `
    <div class="home-page" dir="rtl">
      <section class="home-section">
        <h2>تقدّم المتعلم</h2>
        <div class="home-progress-grid">
          <div class="home-progress-item">
            <span id="homeCurriculumDone" class="home-progress-value">${doneCount}</span>
            <span class="home-progress-label">يومًا مُتقنًا من المنهج</span>
          </div>
          <div class="home-progress-item">
            <span id="homeFoundationStatus" class="home-progress-value">${foundationStarted ? "بدأت" : "لم تبدأ"}</span>
            <span class="home-progress-label">مرحلة النفَس</span>
          </div>
          <div class="home-progress-item">
            <span id="homeCalibrationNotes" class="home-progress-value">${totalNotes}</span>
            <span class="home-progress-label">نغمة مُسجَّلة للمعايرة</span>
          </div>
          <div class="home-progress-item">
            <span id="homeCalibrationFrozen" class="home-progress-value">${frozenCount}</span>
            <span class="home-progress-label">مرجع معتمَد</span>
          </div>
        </div>
      </section>

      <section class="home-section">
        <h2>دخول سريع</h2>
        <nav id="homeQuickLinks" class="home-quick-links">
          ${renderQuickLinks()}
        </nav>
      </section>

      <p class="home-user-id-note">المعرّف المحلي: <code id="homeUserId">${localUserId}</code></p>
    </div>
  `;

  return { localUserId, doneCount, foundationStarted, totalNotes, frozenCount };
}
