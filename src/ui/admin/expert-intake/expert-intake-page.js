/**
 * expert-intake-page.js
 * ============================================================
 * منطق صفحة الخبير — جلسة تسجيل واحدة متصلة، عنصر واحد بالمرة:
 * - 100 نغمة (25 نغمة × 4 قيم إيقاعية، القرار 13.1)
 * - 16 تسجيل مقام إلزامي (صعود + هبوط شائع لكل مقام، القرار 13.2)
 * - هبوطات بديلة اختيارية يقرّرها الخبير حيًّا عبر زر "أضف هبوطًا بديلًا؟"،
 *   مع حقل "النغمة المتغيّرة" متعدد الاختيار عند التفعيل (القرار 13.3)
 *
 * لكل تسجيل: تمهيد أربع عدّات بمترونوم بصري قبل بداية الالتقاط الفعلي
 * (القرار 13.5، يعيد استخدام `MetronomeEngine` — صفر تكرار كود)، تغذية
 * راجعة حيّة للتردد، ثم فصل تلقائي لصوت الخبير عن النغمة عند فجوة صمت
 * (القرار 13.6، `silence-split.js`) ينتج نسختين — خام (إثبات إداري)
 * ونظيفة (تدخل مكتبة الاستماع الفعلية) — معاينة/قبول/إعادة/مسح، ثم تنزيل
 * تلقائي لكل الملفات + بيان JSON مرافق عند نهاية الجلسة (القرار 9.4).
 * قائمة تقدّم مرئية قابلة للطي تعرض المكتمل مقابل المتبقي (القرار 13.7).
 *
 * **نطاق مقصود:** أداة إدارية للمالك/الخبراء فقط — غير مُدرَجة بـ nav.js،
 * لا جزء من رحلة المتدرب. لا إرسال شبكي؛ التسليم يدوي (تنزيل محلي، ثم
 * إرسال الملفات للمالك خارج الموقع).
 */
import { INTAKE_SESSION_ITEMS, createAlternateDescentItem, ALL_NOTE_LABELS } from "./expert-intake-data.js";
import { createExpertRecorder } from "./expert-recorder.js";
import { getOrCreateExpertId } from "./expert-id.js";
import { encodeWav } from "./wav-encoder.js";
import { splitBySilenceGap } from "./silence-split.js";
import { MetronomeEngine } from "../../../metronome/metronome-engine.js";

const CLARITY_THRESHOLD = 0.6;
/** إعدادات تمهيد العدّات الأربع قبل بداية التسجيل الفعلي (القرار 13.5). */
const PREROLL_BPM = 150;
const PREROLL_BEATS = 4;

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

/** تفادي أي إشكال HTML بسيط عند بناء قائمة التقدّم عبر innerHTML (القرار 13.7). */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * يبني صفحة الخبير كاملة داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountExpertIntakePage(container) {
  const expertId = getOrCreateExpertId();
  const recorder = createExpertRecorder();

  /** @type {object[]} نسخة قابلة للتعديل من قائمة الجلسة الثابتة — الهبوط
   * البديل (القرار 13.2/13.3) يُدرَج ديناميكيًا هنا فقط، لا داخل القائمة
   * الثابتة `INTAKE_SESSION_ITEMS` نفسها. */
  let sessionItems = [...INTAKE_SESSION_ITEMS];
  let currentIndex = 0;
  /** @type {Map<string, {rawBlob: Blob, cleanBlob: Blob, measuredHz: number|null, hasSplit: boolean, item: object}>} */
  const accepted = new Map();
  /** أسماء المقامات التي أُضيف لها هبوط بديل فعليًا خلال هذي الجلسة (القرار 13.2) — تمنع الإضافة المكرَّرة. */
  const alternateAddedFor = new Set();
  let pendingCapture = null; // {rawBlob, cleanBlob, measuredHz, hasSplit} — بانتظار قبول/إعادة
  let recording = false;
  let prerolling = false; // تمهيد العدّات الأربع جارٍ (القرار 13.5)
  let prerollCount = 0;
  let previewCleanUrl = null;
  let previewRawUrl = null;
  let showingAlternatePanel = false; // لوحة "النغمة المتغيّرة" مفتوحة (القرار 13.3)
  let alternatePanelSelections = new Set();
  let prerollEngine = null;
  let prerollUnsubscribe = null;

  container.innerHTML = `
    <div class="intake-page" dir="rtl">
      <div class="intake-progress" id="intakeProgress"></div>

      <details class="intake-checklist" id="intakeChecklist">
        <summary id="intakeChecklistSummary">قائمة تقدّم الجلسة</summary>
        <div class="intake-checklist-list" id="intakeChecklistList"></div>
      </details>

      <h2 id="intakeItemLabel" class="intake-item-label"></h2>
      <p id="intakeItemHint" class="intake-item-hint"></p>

      <div class="intake-preroll" id="intakePreroll" hidden></div>

      <div class="intake-live" id="intakeLive">—</div>
      <p class="intake-quality-note" id="intakeQualityNote"></p>

      <div class="intake-controls" id="intakeControls"></div>

      <div class="intake-alternate-panel" id="intakeAlternatePanel" hidden></div>

      <div class="intake-review" id="intakeReview" hidden></div>

      <div class="intake-summary" id="intakeSummary"></div>
    </div>
  `;

  const progressEl = container.querySelector("#intakeProgress");
  const checklistListEl = container.querySelector("#intakeChecklistList");
  const checklistSummaryEl = container.querySelector("#intakeChecklistSummary");
  const labelEl = container.querySelector("#intakeItemLabel");
  const hintEl = container.querySelector("#intakeItemHint");
  const prerollEl = container.querySelector("#intakePreroll");
  const liveEl = container.querySelector("#intakeLive");
  const qualityNoteEl = container.querySelector("#intakeQualityNote");
  const controlsEl = container.querySelector("#intakeControls");
  const alternatePanelEl = container.querySelector("#intakeAlternatePanel");
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
    if (pendingCapture || showingAlternatePanel || prerolling) {
      controlsEl.innerHTML = "";
      return;
    }
    controlsEl.innerHTML = `
      <button type="button" id="intakeRecordBtn" class="btn-primary" ${recording ? "disabled" : ""}>
        ${recording ? "…جارٍ التسجيل" : "ابدأ التسجيل"}
      </button>
      ${recording ? `<button type="button" id="intakeStopBtn" class="btn-secondary">إيقاف وحفظ المحاولة</button>` : ""}
      ${recording ? `<button type="button" id="intakeCancelRecordingBtn" class="btn-skip">مسح المحاولة</button>` : ""}
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
    controlsEl.querySelector("#intakeCancelRecordingBtn")?.addEventListener("click", onCancelRecording);
    controlsEl.querySelector("#intakeSkipBtn")?.addEventListener("click", advanceToNext);
    controlsEl.querySelector("#intakeAddAlternateBtn")?.addEventListener("click", onOpenAlternatePanel);
  }

  /** لوحة "أي نغمة/نغمات تتغيّر بهذا الهبوط البديل؟" (القرار 13.3) — متعدد الاختيار من قائمة الـ25 نغمة الكاملة. */
  function renderAlternatePanel() {
    if (!showingAlternatePanel) {
      alternatePanelEl.hidden = true;
      alternatePanelEl.innerHTML = "";
      return;
    }
    alternatePanelEl.hidden = false;
    alternatePanelEl.innerHTML = `
      <p class="intake-alt-panel-title">أي نغمة/نغمات تتغيّر بهذا الهبوط البديل؟ (اختياري، متعدد الاختيار)</p>
      <div class="intake-alt-note-list" id="intakeAltNoteList">
        ${ALL_NOTE_LABELS.map(
          (label, i) => `
          <label class="intake-alt-note-option">
            <input type="checkbox" data-note-label="${escapeHtml(label)}" id="intakeAltNote${i}" ${
              alternatePanelSelections.has(label) ? "checked" : ""
            } />
            <span>${escapeHtml(label)}</span>
          </label>`
        ).join("")}
      </div>
      <div class="intake-alt-panel-actions">
        <button type="button" id="intakeAltConfirmBtn" class="btn-primary">تأكيد إضافة الهبوط البديل</button>
        <button type="button" id="intakeAltCancelBtn" class="btn-secondary">إلغاء</button>
      </div>
    `;
    alternatePanelEl.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const label = cb.dataset.noteLabel;
        if (cb.checked) alternatePanelSelections.add(label);
        else alternatePanelSelections.delete(label);
      });
    });
    alternatePanelEl.querySelector("#intakeAltConfirmBtn").addEventListener("click", onConfirmAlternatePanel);
    alternatePanelEl.querySelector("#intakeAltCancelBtn").addEventListener("click", onCancelAlternatePanel);
  }

  function renderReview() {
    if (!pendingCapture) {
      reviewEl.hidden = true;
      reviewEl.innerHTML = "";
      return;
    }
    if (previewCleanUrl) URL.revokeObjectURL(previewCleanUrl);
    if (previewRawUrl) URL.revokeObjectURL(previewRawUrl);
    previewCleanUrl = URL.createObjectURL(pendingCapture.cleanBlob);
    previewRawUrl = URL.createObjectURL(pendingCapture.rawBlob);
    reviewEl.hidden = false;
    reviewEl.innerHTML = `
      <p class="intake-review-label">النسخة النظيفة (تدخل مكتبة الاستماع)</p>
      <audio controls src="${previewCleanUrl}" class="intake-audio-preview intake-audio-preview-clean"></audio>
      ${
        pendingCapture.hasSplit
          ? ""
          : `<p class="intake-split-warning">تعذّر اكتشاف فجوة صمت واضحة — النسخة النظيفة مطابقة للخام حاليًا.</p>`
      }
      <p class="intake-review-label intake-review-label-secondary">النسخة الخام الكاملة (إثبات/مراجعة إدارية)</p>
      <audio controls src="${previewRawUrl}" class="intake-audio-preview intake-audio-preview-raw"></audio>
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

  /** تمهيد العدّات الأربع (القرار 13.5) — نص بصري بسيط، لا عنصر تفاعلي. */
  function renderPreroll() {
    if (!prerolling) {
      prerollEl.hidden = true;
      prerollEl.textContent = "";
      return;
    }
    prerollEl.hidden = false;
    prerollEl.textContent = prerollCount > 0 ? `استعد… ${prerollCount} / ${PREROLL_BEATS}` : "استعد…";
  }

  /** قائمة تقدّم مرئية قابلة للطي — كل عناصر الجلسة الحيّة، مكتمل/حالي/متبقٍ (القرار 13.7). */
  function renderChecklist() {
    const total = sessionItems.length;
    checklistSummaryEl.textContent = `قائمة تقدّم الجلسة (${accepted.size} / ${total} مكتمل)`;
    checklistListEl.innerHTML = sessionItems
      .map((it, idx) => {
        const isDone = accepted.has(it.id);
        const isCurrent = idx === currentIndex;
        const status = isDone ? "done" : isCurrent ? "current" : "";
        const marker = isDone ? "✓" : isCurrent ? "▶" : "○";
        return `<div class="intake-checklist-item ${status}">${marker} ${escapeHtml(it.label)}</div>`;
      })
      .join("");
  }

  function renderItem() {
    const item = currentItem();
    if (!item) {
      renderSessionEnd();
      return;
    }
    showingAlternatePanel = false; // أي لوحة مفتوحة من عنصر سابق تُغلَق تلقائيًا
    progressEl.textContent = `${itemProgressLabel(currentIndex, sessionItems.length)} — ${itemKindLabel(item)}`;
    labelEl.textContent = item.label;
    hintEl.textContent = item.hint;
    liveEl.textContent = "—";
    liveEl.className = "intake-live";
    qualityNoteEl.textContent = "";
    renderPreroll();
    renderAlternatePanel();
    renderControls();
    renderReview();
    renderChecklist();
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
    startPreroll();
  }

  /**
   * تمهيد أربع عدّات بمترونوم بصري قبل بداية التسجيل الفعلي (القرار 13.5)
   * — العدّ قبل الالتقاط لا داخله، فالملف الناتج نظيف من الأصل، بلا حاجة
   * لقصّ لاحقًا. يعيد استخدام `MetronomeEngine` الموجود أصلًا (صفر تكرار
   * كود) — نفس المحرك المستخدَم بصفحة المترونوم والنسخة المصغّرة بالمعايرة.
   */
  function startPreroll() {
    prerolling = true;
    prerollCount = 0;
    renderControls();
    renderPreroll();
    prerollEngine = new MetronomeEngine({ bpm: PREROLL_BPM, beatsPerMeasure: PREROLL_BEATS });
    prerollUnsubscribe = prerollEngine.onBeat(() => {
      prerollCount++;
      renderPreroll();
      if (prerollCount >= PREROLL_BEATS) {
        prerollEngine.stop();
        prerollUnsubscribe?.();
        prerollUnsubscribe = null;
        prerollEngine = null;
        beginActualRecording();
      }
    });
    prerollEngine.start();
  }

  function beginActualRecording() {
    prerolling = false;
    recording = true;
    hintEl.textContent = currentItem().hint;
    recorder.startCapture(onLiveReading);
    renderPreroll();
    renderControls();
  }

  /**
   * "مسح المحاولة" (القرار 13.7) — يلغي التسجيل الجاري بالكامل ويعيد
   * الحالة لجاهزية تسجيل جديد لنفس العنصر، بلا أي معاينة أو حفظ.
   */
  function onCancelRecording() {
    if (!recording) return;
    recording = false;
    recorder.stopCapture(); // نوقف الالتقاط الداخلي فعليًا، ونتجاهل الناتج بالكامل — لا pendingCapture
    hintEl.textContent = currentItem().hint;
    renderControls();
    renderReview();
  }

  /**
   * إيقاف والتقاط المحاولة — يشمل الفصل التلقائي (القرار 13.6): تُحسَب
   * فجوة الصمت بعد كلام الخبير (صوته ينطق الاسم، القرار 13.4)، فتُبنى
   * نسختان: خام كاملة (إثبات إداري) ونظيفة (من نقطة الفصل فصاعدًا، تدخل
   * مكتبة الاستماع الفعلية). لو لم تُكتشَف فجوة واضحة، النظيفة = الخام.
   */
  function onStopClick() {
    recording = false;
    const { samples, sampleRate, measuredHz } = recorder.stopCapture();
    const { splitIndex, hasSplit } = splitBySilenceGap(samples, sampleRate);
    const rawBlob = encodeWav(samples, sampleRate);
    const cleanSamples = splitIndex > 0 ? samples.subarray(splitIndex) : samples;
    const cleanBlob = encodeWav(cleanSamples, sampleRate);
    pendingCapture = { rawBlob, cleanBlob, measuredHz, hasSplit };
    renderControls();
    renderReview();
  }

  function onAccept() {
    accepted.set(currentItem().id, {
      rawBlob: pendingCapture.rawBlob,
      cleanBlob: pendingCapture.cleanBlob,
      measuredHz: pendingCapture.measuredHz,
      hasSplit: pendingCapture.hasSplit,
      item: currentItem(),
    });
    pendingCapture = null;
    advanceToNext();
  }

  function onRedo() {
    pendingCapture = null;
    renderControls();
    renderReview();
  }

  /** فتح لوحة "النغمة المتغيّرة" (القرار 13.3) — لا إدراج فوري؛ الإدراج يحصل عند التأكيد فقط. */
  function onOpenAlternatePanel() {
    if (!canOfferAlternateDescent()) return;
    showingAlternatePanel = true;
    alternatePanelSelections = new Set();
    renderControls();
    renderAlternatePanel();
  }

  /**
   * تأكيد إضافة الهبوط البديل (القرار 13.2) مع النغمات المتغيّرة المحدَّدة
   * (القرار 13.3، اختيارية — مصفوفة فارغة لو لم يحدّد الخبير شيئًا). يُدرِج
   * العنصر مباشرة بعد الحالي، ويُحدِّث العدد الإجمالي فورًا.
   */
  function onConfirmAlternatePanel() {
    const item = currentItem();
    if (!item || item.kind !== "maqam" || item.maqamPart !== "descend-common") {
      showingAlternatePanel = false;
      renderControls();
      renderAlternatePanel();
      return;
    }
    alternateAddedFor.add(item.maqamName);
    const altItem = createAlternateDescentItem(item.maqamName, [...alternatePanelSelections]);
    sessionItems.splice(currentIndex + 1, 0, altItem);
    showingAlternatePanel = false;
    renderItem();
  }

  /** إلغاء لوحة "النغمة المتغيّرة" بلا إضافة — الزر يظهر مرة أخرى لأن `alternateAddedFor` لم يتغيّر. */
  function onCancelAlternatePanel() {
    showingAlternatePanel = false;
    renderControls();
    renderAlternatePanel();
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

  /**
   * تنزيل كل الملفات المقبولة (القرار 13.6: ملفان لكل عنصر — نظيف وخام)
   * + بيان JSON مرافق يحمل، بين ما يحمل، أسماء النغمات المتغيّرة (القرار
   * 13.3) وحالة اكتشاف الفصل (القرار 13.6) لكل عنصر مقام.
   */
  function onDownloadAll() {
    const manifest = {
      expertId,
      sessionCompletedAtMs: Date.now(),
      items: [],
    };
    for (const [id, entry] of accepted.entries()) {
      const cleanFilename = `${id}.wav`;
      const rawFilename = `${id}-raw.wav`;
      downloadBlob(entry.cleanBlob, cleanFilename);
      downloadBlob(entry.rawBlob, rawFilename);
      manifest.items.push({
        id,
        kind: entry.item.kind,
        label: entry.item.label,
        filename: cleanFilename,
        rawFilename,
        hasSplit: entry.hasSplit,
        measuredHz: entry.measuredHz,
        ...(entry.item.rhythmicValueId ? { rhythmicValueId: entry.item.rhythmicValueId } : {}),
        ...(entry.item.maqamName ? { maqamName: entry.item.maqamName, maqamPart: entry.item.maqamPart } : {}),
        ...(entry.item.changedNotes && entry.item.changedNotes.length
          ? { changedNotes: entry.item.changedNotes }
          : {}),
      });
    }
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    downloadBlob(manifestBlob, `expert-intake-manifest-${expertId}.json`);
  }

  function renderSessionEnd() {
    progressEl.textContent = "اكتملت الجلسة";
    labelEl.textContent = "شكرًا لك";
    hintEl.textContent = "";
    prerollEl.hidden = true;
    prerollEl.textContent = "";
    liveEl.textContent = "";
    qualityNoteEl.textContent = "";
    controlsEl.innerHTML = "";
    alternatePanelEl.hidden = true;
    alternatePanelEl.innerHTML = "";
    reviewEl.hidden = true;
    reviewEl.innerHTML = "";
    checklistSummaryEl.textContent = `قائمة تقدّم الجلسة (${accepted.size} / ${sessionItems.length} مكتمل)`;
    checklistListEl.innerHTML = sessionItems
      .map((it) => `<div class="intake-checklist-item ${accepted.has(it.id) ? "done" : ""}">${
        accepted.has(it.id) ? "✓" : "○"
      } ${escapeHtml(it.label)}</div>`)
      .join("");
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
      prerollEngine?.stop();
      container.innerHTML = "";
    },
  };
}
