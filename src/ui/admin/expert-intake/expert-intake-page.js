/**
 * expert-intake-page.js
 * ============================================================
 * منطق صفحة الخبير — جلسة تسجيل واحدة متصلة، عنصر واحد بالمرة (100 نغمة —
 * 25 نغمة × 4 قيم إيقاعية، القرار 13.1 — + 16 تسجيل مقام إلزامي — صعود +
 * هبوط شائع لكل مقام، القرار 13.2 — + هبوطات بديلة اختيارية يقرّرها
 * الخبير حيًّا أثناء الجلسة عبر زر "أضف هبوطًا بديلًا؟")، تغذية راجعة
 * حيّة، تسجيل بضغطة واحدة، معاينة/قبول/إعادة، ثم
 * تنزيل تلقائي لكل الملفات + بيان JSON مرافق عند نهاية الجلسة (القرار 9.4).
 *
 * **نطاق مقصود:** أداة إدارية للمالك/الخبراء فقط — غير مُدرَجة بـ nav.js،
 * لا جزء من رحلة المتدرب. لا إرسال شبكي؛ التسليم يدوي (تنزيل محلي، ثم
 * إرسال الملفات للمالك خارج الموقع).
 */
import { INTAKE_SESSION_ITEMS, createAlternateDescentItem } from "./expert-intake-data.js";
import { createExpertRecorder } from "./expert-recorder.js";
import { getOrCreateExpertId } from "./expert-id.js";

const CLARITY_THRESHOLD = 0.6;

function itemProgressLabel(index, total) {
  return `${index + 1} / ${total}`;
}

/** تسمية نوع العنصر المعروضة بشريط التقدّم (القرار 13.2 لحالات المقام). */
function itemKindLabel(item) {
  if (item.kind === "note") return "نغمة مفردة";
  if (item.maqamPart === "ascend") return "مقام — صعود";
  if (item.maqamPart === "descend-common") return "مقام — هبوط شائع";
  if (item.maqamPart === "descend-alternate") return "مقام — هبوط بديل";
  return "تسجيل مقام";
}

/**
 * يبني صفحة الخبير كاملة داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountExpertIntakePage(container) {
  const expertId = getOrCreateExpertId();
  const recorder = createExpertRecorder();

  /** @type {object[]} نسخة قابلة للتعديل من قائمة الجلسة الثابتة — الهبوط
   * البديل (القرار 13.2) يُدرَج ديناميكيًا هنا فقط، لا داخل القائمة
   * الثابتة `INTAKE_SESSION_ITEMS` نفسها. */
  let sessionItems = [...INTAKE_SESSION_ITEMS];
  let currentIndex = 0;
  /** @type {Map<string, {wavBlob: Blob, measuredHz: number|null, item: object}>} */
  const accepted = new Map();
  /** أسماء المقامات التي أُضيف لها هبوط بديل فعليًا خلال هذي الجلسة (القرار 13.2) — تمنع الإضافة المكرَّرة. */
  const alternateAddedFor = new Set();
  let pendingCapture = null; // {wavBlob, measuredHz} — بانتظار قبول/إعادة
  let recording = false;
  let previewUrl = null;

  container.innerHTML = `
    <div class="intake-page" dir="rtl">
      <div class="intake-progress" id="intakeProgress"></div>
      <h2 id="intakeItemLabel" class="intake-item-label"></h2>
      <p id="intakeItemHint" class="intake-item-hint"></p>

      <div class="intake-live" id="intakeLive">—</div>
      <p class="intake-quality-note" id="intakeQualityNote"></p>

      <div class="intake-controls" id="intakeControls"></div>

      <div class="intake-review" id="intakeReview" hidden></div>

      <div class="intake-summary" id="intakeSummary"></div>
    </div>
  `;

  const progressEl = container.querySelector("#intakeProgress");
  const labelEl = container.querySelector("#intakeItemLabel");
  const hintEl = container.querySelector("#intakeItemHint");
  const liveEl = container.querySelector("#intakeLive");
  const qualityNoteEl = container.querySelector("#intakeQualityNote");
  const controlsEl = container.querySelector("#intakeControls");
  const reviewEl = container.querySelector("#intakeReview");
  const summaryEl = container.querySelector("#intakeSummary");

  function currentItem() {
    return sessionItems[currentIndex];
  }

  /** هل العنصر الحالي مقام بحالة "هبوط شائع" لم يُضَف له هبوط بديل بعد؟ (القرار 13.2) */
  function canOfferAlternateDescent() {
    const item = currentItem();
    return (
      !!item &&
      item.kind === "maqam" &&
      item.maqamPart === "descend-common" &&
      !alternateAddedFor.has(item.maqamName)
    );
  }

  function renderControls() {
    if (pendingCapture) {
      controlsEl.innerHTML = "";
      return;
    }
    controlsEl.innerHTML = `
      <button type="button" id="intakeRecordBtn" class="btn-primary" ${recording ? "disabled" : ""}>
        ${recording ? "…جارٍ التسجيل" : "ابدأ التسجيل"}
      </button>
      ${recording ? `<button type="button" id="intakeStopBtn" class="btn-secondary">إيقاف وحفظ المحاولة</button>` : ""}
      <button type="button" id="intakeSkipBtn" class="btn-skip" ${recording ? "disabled" : ""}>تخطّ هذا العنصر</button>
      ${
        canOfferAlternateDescent()
          ? `<button type="button" id="intakeAddAlternateBtn" class="btn-secondary" ${
              recording ? "disabled" : ""
            }>أضف هبوطًا بديلًا لهذا المقام؟</button>`
          : ""
      }
    `;
    controlsEl.querySelector("#intakeRecordBtn")?.addEventListener("click", onRecordClick);
    controlsEl.querySelector("#intakeStopBtn")?.addEventListener("click", onStopClick);
    controlsEl.querySelector("#intakeSkipBtn")?.addEventListener("click", advanceToNext);
    controlsEl.querySelector("#intakeAddAlternateBtn")?.addEventListener("click", onAddAlternateDescent);
  }

  function renderReview() {
    if (!pendingCapture) {
      reviewEl.hidden = true;
      reviewEl.innerHTML = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(pendingCapture.wavBlob);
    reviewEl.hidden = false;
    reviewEl.innerHTML = `
      <audio controls src="${previewUrl}" class="intake-audio-preview"></audio>
      <p class="intake-measured">
        ${
          pendingCapture.measuredHz
            ? `التردد المقاس تلقائيًا: <strong>${pendingCapture.measuredHz.toFixed(2)} هرتز</strong>`
            : `<span class="intake-measured-none">تعذّر قياس تردد واضح — القراءات كانت ضعيفة الجودة.</span>`
        }
      </p>
      <div class="intake-review-actions">
        <button type="button" id="intakeAcceptBtn" class="btn-primary">قبول والمتابعة</button>
        <button type="button" id="intakeRedoBtn" class="btn-secondary">إعادة المحاولة</button>
      </div>
    `;
    reviewEl.querySelector("#intakeAcceptBtn").addEventListener("click", onAccept);
    reviewEl.querySelector("#intakeRedoBtn").addEventListener("click", onRedo);
  }

  function renderItem() {
    const item = currentItem();
    if (!item) {
      renderSessionEnd();
      return;
    }
    progressEl.textContent = `${itemProgressLabel(currentIndex, sessionItems.length)} — ${itemKindLabel(item)}`;
    labelEl.textContent = item.label;
    hintEl.textContent = item.hint;
    liveEl.textContent = "—";
    liveEl.className = "intake-live";
    qualityNoteEl.textContent = "";
    renderControls();
    renderReview();
    renderSummary();
  }

  function renderSummary() {
    summaryEl.textContent = `معرّف الخبير: ${expertId} — مقبول حتى الآن: ${accepted.size} / ${sessionItems.length}`;
  }

  function onLiveReading(reading) {
    if (reading.rms < 0.006) {
      liveEl.textContent = "—";
      liveEl.className = "intake-live";
      qualityNoteEl.textContent = "لا صوت مسموع — اقترب من الميكروفون";
    } else if (!reading.hz || reading.clarity < CLARITY_THRESHOLD) {
      liveEl.textContent = "—";
      liveEl.className = "intake-live";
      qualityNoteEl.textContent = "نغمة غير واضحة بما يكفي";
    } else {
      liveEl.textContent = `${reading.hz.toFixed(1)} هرتز`;
      liveEl.className = "intake-live ok";
      qualityNoteEl.textContent = "";
    }
  }

  async function onRecordClick() {
    try {
      hintEl.textContent = "…جارٍ تشغيل الميكروفون";
      await recorder.ensureMic();
    } catch (e) {
      hintEl.textContent = "تعذّر الوصول للميكروفون — تحقّق من الإذن.";
      return;
    }
    recording = true;
    hintEl.textContent = currentItem().hint;
    recorder.startCapture(onLiveReading);
    renderControls();
  }

  function onStopClick() {
    recording = false;
    const { wavBlob, measuredHz } = recorder.stopCapture();
    pendingCapture = { wavBlob, measuredHz };
    renderControls();
    renderReview();
  }

  function onAccept() {
    accepted.set(currentItem().id, { ...pendingCapture, item: currentItem() });
    pendingCapture = null;
    advanceToNext();
  }

  function onRedo() {
    pendingCapture = null;
    renderControls();
    renderReview();
  }

  /**
   * زر "أضف هبوطًا بديلًا؟" (القرار 13.2) — الخبير نفسه يقرّر وقت
   * التسجيل، لا افتراض مسبق. يُدرِج عنصر هبوط بديل مباشرة بعد العنصر
   * الحالي في قائمة الجلسة الحيّة، ويُحدِّث العرض فورًا (العدد الإجمالي
   * يكبر ديناميكيًا). لا يُسمح بإضافة أكثر من هبوط بديل واحد لنفس المقام.
   */
  function onAddAlternateDescent() {
    if (!canOfferAlternateDescent()) return;
    const item = currentItem();
    alternateAddedFor.add(item.maqamName);
    const altItem = createAlternateDescentItem(item.maqamName);
    sessionItems.splice(currentIndex + 1, 0, altItem);
    renderItem();
  }

  function advanceToNext() {
    pendingCapture = null;
    currentIndex++;
    renderItem();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function onDownloadAll() {
    const manifest = {
      expertId,
      sessionCompletedAtMs: Date.now(),
      items: [],
    };
    for (const [id, entry] of accepted.entries()) {
      const filename = `${id}.wav`;
      downloadBlob(entry.wavBlob, filename);
      manifest.items.push({
        id,
        kind: entry.item.kind,
        label: entry.item.label,
        filename,
        measuredHz: entry.measuredHz,
        ...(entry.item.rhythmicValueId ? { rhythmicValueId: entry.item.rhythmicValueId } : {}),
        ...(entry.item.maqamName ? { maqamName: entry.item.maqamName, maqamPart: entry.item.maqamPart } : {}),
      });
    }
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    downloadBlob(manifestBlob, `expert-intake-manifest-${expertId}.json`);
  }

  function renderSessionEnd() {
    progressEl.textContent = "اكتملت الجلسة";
    labelEl.textContent = "شكرًا لك";
    hintEl.textContent = "";
    liveEl.textContent = "";
    qualityNoteEl.textContent = "";
    controlsEl.innerHTML = "";
    reviewEl.hidden = true;
    reviewEl.innerHTML = "";
    summaryEl.innerHTML = `
      <p>تم قبول ${accepted.size} من أصل ${sessionItems.length} عنصرًا.</p>
      <button type="button" id="intakeDownloadAllBtn" class="btn-primary" ${accepted.size === 0 ? "disabled" : ""}>
        تنزيل كل الملفات + بيان JSON
      </button>
    `;
    summaryEl.querySelector("#intakeDownloadAllBtn")?.addEventListener("click", onDownloadAll);
  }

  renderItem();

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}
