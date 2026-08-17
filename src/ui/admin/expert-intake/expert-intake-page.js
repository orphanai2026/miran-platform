/**
 * expert-intake-page.js
 * ============================================================
 * منطق صفحة الخبير — **نموذج الجدول الحر** (القرار 14، يستبدل بالكامل
 * نموذج "عنصر واحد بالمرة" السابق من 13.2/13.7):
 *
 * الخبير يختار بحرية عبر قائمتين منسدلتين (نغمة: الاسم + الزمن، أو مقام:
 * الاسم + النوع)، يسجّل، يُضاف السطر لجدول "المُسجَّل" أسفله. القائمة
 * تبقى مرتبطة بالحد الأدنى الإلزامي نفسه (100 نغمة × 4 قيم إيقاعية +
 * 16 تسجيل مقام + أي هبوطات بديلة أضافها الخبير) — أي تركيبة (نغمة+زمن،
 * أو مقام+نوع) سُجِّلت فعليًا تصير **معطَّلة** بقائمة الاختيار المعنية،
 * فيستحيل تكرارها عرضيًا؛ حذف سطر من الجدول يُعيد تفعيلها.
 *
 * كل تسجيل: تمهيد أربع عدّات بمترونوم بصري قبل بداية الالتقاط الفعلي
 * (القرار 13.5)، تغذية راجعة حيّة للتردد، ثم فصل تلقائي لصوت الخبير عن
 * النغمة عند فجوة صمت (القرار 13.6) ينتج نسختين — خام (إثبات إداري)
 * ونظيفة (تدخل مكتبة الاستماع الفعلية) — معاينة/قبول/إعادة/مسح. كل سطر
 * بالجدول له أزرار استماع/تصدير/حذف مستقلة. تنزيل الكل + بيان JSON
 * متاح بأي وقت (القرار 9.4). قائمة تقدّم مرئية قابلة للطي تعرض المكتمل
 * مقابل المتبقي، والضغط على عنصر متبقٍ فيها يملأ حقول الاختيار به مباشرة
 * (القرار 14).
 *
 * **نطاق مقصود:** أداة إدارية للمالك/الخبراء فقط — غير مُدرَجة بـ nav.js،
 * لا جزء من رحلة المتدرب. لا إرسال شبكي؛ التسليم يدوي (تنزيل محلي، ثم
 * إرسال الملفات للمالك خارج الموقع).
 */
import { INTAKE_SESSION_ITEMS, createAlternateDescentItem, ALL_NOTE_LABELS, RHYTHMIC_VALUES } from "./expert-intake-data.js";
import { createExpertRecorder } from "./expert-recorder.js";
import { getOrCreateExpertId } from "./expert-id.js";
import { encodeWav } from "./wav-encoder.js";
import { splitBySilenceGap } from "./silence-split.js";
import { MetronomeEngine } from "../../../metronome/metronome-engine.js";

const CLARITY_THRESHOLD = 0.6;
/** إعدادات تمهيد العدّات الأربع قبل بداية التسجيل الفعلي (القرار 13.5). */
const PREROLL_BPM = 150;
const PREROLL_BEATS = 4;

const MAQAM_PART_LABELS = Object.freeze({
  ascend: "صعود",
  "descend-common": "هبوط شائع",
  "descend-alternate": "هبوط بديل",
});

/** تفادي أي إشكال HTML بسيط عند بناء أي عنصر عبر innerHTML. */
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
  /** @type {Map<string, {rawBlob: Blob, cleanBlob: Blob, measuredHz: number|null, hasSplit: boolean, item: object}>} */
  const accepted = new Map();
  /** أسماء المقامات التي أُضيف لها هبوط بديل فعليًا خلال هذي الجلسة (القرار 13.2) — تمنع الإضافة المكرَّرة. */
  const alternateAddedFor = new Set();

  // --- حالة الاختيار الحرّ (القرار 14) ---
  let selectedType = "note"; // "note" | "maqam"
  let selectedNoteLabel = ALL_NOTE_LABELS[0];
  let selectedRhythmId = RHYTHMIC_VALUES[0].id;
  let selectedMaqamName = getAllMaqamNames()[0] || null;
  let selectedMaqamPart = "ascend";

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
      <details class="intake-checklist" id="intakeChecklist">
        <summary id="intakeChecklistSummary">قائمة تقدّم الجلسة</summary>
        <div class="intake-checklist-progress-track"><div class="intake-checklist-progress-fill" id="intakeChecklistProgressFill"></div></div>
        <div class="intake-checklist-list" id="intakeChecklistList"></div>
      </details>

      <div class="intake-form-card">
        <div class="intake-type-toggle">
          <button type="button" id="intakeTypeNoteBtn" class="intake-type-btn note">نغمة</button>
          <button type="button" id="intakeTypeMaqamBtn" class="intake-type-btn maqam">مقام</button>
        </div>

        <div class="intake-field-grid" id="intakeNoteFields">
          <div class="intake-field">
            <label for="intakeNoteNameSelect">اسم النغمة</label>
            <select id="intakeNoteNameSelect"></select>
          </div>
          <div class="intake-field">
            <label for="intakeNoteRhythmSelect">زمن النغمة</label>
            <select id="intakeNoteRhythmSelect"></select>
          </div>
        </div>

        <div class="intake-field-grid" id="intakeMaqamFields" hidden>
          <div class="intake-field">
            <label for="intakeMaqamNameSelect">اسم المقام</label>
            <select id="intakeMaqamNameSelect"></select>
          </div>
          <div class="intake-field">
            <label for="intakeMaqamTypeSelect">نوع المقام</label>
            <select id="intakeMaqamTypeSelect"></select>
          </div>
        </div>

        <button type="button" id="intakeAddAlternateBtn" class="btn-ghost-link" hidden>+ أضف هبوطًا بديلًا لهذا المقام</button>

        <h2 id="intakeItemLabel" class="intake-item-label"></h2>
        <p id="intakeItemHint" class="intake-item-hint"></p>

        <div class="intake-preroll" id="intakePreroll" hidden></div>

        <div class="intake-live" id="intakeLive">—</div>
        <p class="intake-quality-note" id="intakeQualityNote"></p>

        <div class="intake-controls" id="intakeControls"></div>

        <div class="intake-alternate-panel" id="intakeAlternatePanel" hidden></div>

        <div class="intake-review" id="intakeReview" hidden></div>
      </div>

      <div class="intake-table-card">
        <div class="intake-table-header">
          <h2>الجدول</h2>
          <span id="intakeTableCount" class="intake-table-count"></span>
        </div>
        <div class="intake-table-rows" id="intakeTableRows"></div>
        <p class="intake-table-empty" id="intakeTableEmpty">لا عناصر مُسجَّلة بعد</p>
        <div class="intake-table-footer">
          <button type="button" id="intakeDownloadAllBtn" class="btn-primary" disabled>تنزيل كل الملفات + بيان JSON</button>
        </div>
      </div>

      <div class="intake-summary" id="intakeSummary"></div>
    </div>
  `;

  const checklistListEl = container.querySelector("#intakeChecklistList");
  const checklistSummaryEl = container.querySelector("#intakeChecklistSummary");
  const checklistProgressFillEl = container.querySelector("#intakeChecklistProgressFill");
  const typeNoteBtnEl = container.querySelector("#intakeTypeNoteBtn");
  const typeMaqamBtnEl = container.querySelector("#intakeTypeMaqamBtn");
  const noteFieldsEl = container.querySelector("#intakeNoteFields");
  const maqamFieldsEl = container.querySelector("#intakeMaqamFields");
  const noteNameSelectEl = container.querySelector("#intakeNoteNameSelect");
  const noteRhythmSelectEl = container.querySelector("#intakeNoteRhythmSelect");
  const maqamNameSelectEl = container.querySelector("#intakeMaqamNameSelect");
  const maqamTypeSelectEl = container.querySelector("#intakeMaqamTypeSelect");
  const addAlternateBtnEl = container.querySelector("#intakeAddAlternateBtn");
  const labelEl = container.querySelector("#intakeItemLabel");
  const hintEl = container.querySelector("#intakeItemHint");
  const prerollEl = container.querySelector("#intakePreroll");
  const liveEl = container.querySelector("#intakeLive");
  const qualityNoteEl = container.querySelector("#intakeQualityNote");
  const controlsEl = container.querySelector("#intakeControls");
  const alternatePanelEl = container.querySelector("#intakeAlternatePanel");
  const reviewEl = container.querySelector("#intakeReview");
  const tableRowsEl = container.querySelector("#intakeTableRows");
  const tableCountEl = container.querySelector("#intakeTableCount");
  const tableEmptyEl = container.querySelector("#intakeTableEmpty");
  const downloadAllBtnEl = container.querySelector("#intakeDownloadAllBtn");
  const summaryEl = container.querySelector("#intakeSummary");

  // ---------------------------------------------------------------------
  // مساعدات ربط الاختيار بعناصر القائمة الإلزامية (القرار 14)
  // ---------------------------------------------------------------------

  function getAllMaqamNames() {
    const seen = new Set();
    const names = [];
    for (const it of sessionItems) {
      if (it.kind === "maqam" && !seen.has(it.maqamName)) {
        seen.add(it.maqamName);
        names.push(it.maqamName);
      }
    }
    return names;
  }

  function noteItemId(noteLabel, rhythmId) {
    const idx = ALL_NOTE_LABELS.indexOf(noteLabel);
    if (idx === -1) return null;
    return `note-${String(idx + 1).padStart(2, "0")}-${rhythmId}`;
  }

  function maqamItemId(maqamName, maqamPart) {
    return `maqam-${maqamName}-${maqamPart}`;
  }

  function findItemById(id) {
    return sessionItems.find((it) => it.id === id) || null;
  }

  function selectedItemId() {
    if (selectedType === "note") return noteItemId(selectedNoteLabel, selectedRhythmId);
    return selectedMaqamName ? maqamItemId(selectedMaqamName, selectedMaqamPart) : null;
  }

  function selectedItem() {
    const id = selectedItemId();
    return id ? findItemById(id) : null;
  }

  /** الحالات المتاحة لمقام معيَّن — "هبوط بديل" يظهر فقط لو أُضيف فعليًا (القرار 13.2). */
  function maqamPartsFor(maqamName) {
    const parts = ["ascend", "descend-common"];
    if (alternateAddedFor.has(maqamName)) parts.push("descend-alternate");
    return parts;
  }

  // ---------------------------------------------------------------------
  // بناء/تحديث حقول الاختيار
  // ---------------------------------------------------------------------

  function renderTypeToggle() {
    typeNoteBtnEl.classList.toggle("active", selectedType === "note");
    typeMaqamBtnEl.classList.toggle("active", selectedType === "maqam");
    noteFieldsEl.hidden = selectedType !== "note";
    maqamFieldsEl.hidden = selectedType !== "maqam";
    updateAddAlternateVisibility();
  }

  function updateAddAlternateVisibility() {
    addAlternateBtnEl.hidden = selectedType !== "maqam" || !selectedMaqamName || alternateAddedFor.has(selectedMaqamName);
  }

  function renderNoteNameOptions() {
    noteNameSelectEl.innerHTML = ALL_NOTE_LABELS.map(
      (label) => `<option value="${escapeHtml(label)}" ${label === selectedNoteLabel ? "selected" : ""}>${escapeHtml(label)}</option>`
    ).join("");
  }

  /** يبني قائمة "زمن النغمة"، ويعطّل القيم المُسجَّلة فعليًا لهذي النغمة (القرار 14). */
  function renderNoteRhythmOptions() {
    noteRhythmSelectEl.innerHTML = RHYTHMIC_VALUES.map((r) => {
      const done = accepted.has(noteItemId(selectedNoteLabel, r.id));
      return `<option value="${r.id}" ${done ? "disabled" : ""} ${r.id === selectedRhythmId ? "selected" : ""}>${escapeHtml(r.label)}${
        done ? " ✓" : ""
      }</option>`;
    }).join("");
    if (accepted.has(noteItemId(selectedNoteLabel, selectedRhythmId))) {
      const next = RHYTHMIC_VALUES.find((r) => !accepted.has(noteItemId(selectedNoteLabel, r.id)));
      if (next) {
        selectedRhythmId = next.id;
        noteRhythmSelectEl.value = next.id;
      }
    }
  }

  function renderMaqamNameOptions() {
    const names = getAllMaqamNames();
    if (!selectedMaqamName || !names.includes(selectedMaqamName)) selectedMaqamName = names[0] || null;
    maqamNameSelectEl.innerHTML = names
      .map((name) => `<option value="${escapeHtml(name)}" ${name === selectedMaqamName ? "selected" : ""}>${escapeHtml(name)}</option>`)
      .join("");
  }

  /** يبني قائمة "نوع المقام"، ويعطّل الحالات المُسجَّلة فعليًا لهذا المقام (القرار 14). */
  function renderMaqamTypeOptions() {
    if (!selectedMaqamName) {
      maqamTypeSelectEl.innerHTML = "";
      return;
    }
    const parts = maqamPartsFor(selectedMaqamName);
    if (!parts.includes(selectedMaqamPart)) selectedMaqamPart = parts[0];
    maqamTypeSelectEl.innerHTML = parts
      .map((partId) => {
        const done = accepted.has(maqamItemId(selectedMaqamName, partId));
        return `<option value="${partId}" ${done ? "disabled" : ""} ${
          partId === selectedMaqamPart ? "selected" : ""
        }>${escapeHtml(MAQAM_PART_LABELS[partId])}${done ? " ✓" : ""}</option>`;
      })
      .join("");
    if (accepted.has(maqamItemId(selectedMaqamName, selectedMaqamPart))) {
      const next = parts.find((p) => !accepted.has(maqamItemId(selectedMaqamName, p)));
      if (next) {
        selectedMaqamPart = next;
        maqamTypeSelectEl.value = next;
      }
    }
    updateAddAlternateVisibility();
  }

  function renderSelectedItemDisplay() {
    const item = selectedItem();
    labelEl.textContent = item ? item.label : "";
    hintEl.textContent = item ? item.hint : "";
    liveEl.textContent = "—";
    liveEl.className = "intake-live";
    qualityNoteEl.textContent = "";
  }

  // ---------------------------------------------------------------------
  // قائمة تقدّم الجلسة (القرار 13.7) + الجدول (القرار 14)
  // ---------------------------------------------------------------------

  function checklistSectionLabel(prevKind, item) {
    if (item.kind === "maqam" && prevKind !== "maqam") return "المقامات الثمانية";
    return null;
  }

  function buildChecklistRowsHtml() {
    const currentId = selectedItemId();
    let prevKind = null;
    let html = "";
    sessionItems.forEach((it) => {
      const sectionLabel = checklistSectionLabel(prevKind, it);
      if (sectionLabel) html += `<div class="intake-checklist-divider">${escapeHtml(sectionLabel)}</div>`;
      prevKind = it.kind;
      const isDone = accepted.has(it.id);
      const isCurrent = !isDone && it.id === currentId;
      const status = isDone ? "done" : isCurrent ? "current" : "pending";
      html += `<div class="intake-checklist-item ${status}" data-item-id="${escapeHtml(it.id)}"><span class="intake-checklist-dot" aria-hidden="true"></span><span class="intake-checklist-text">${escapeHtml(
        it.label
      )}</span></div>`;
    });
    return html;
  }

  function updateChecklistProgressBar() {
    const total = sessionItems.length;
    const percent = total > 0 ? Math.round((accepted.size / total) * 100) : 0;
    checklistProgressFillEl.style.width = `${percent}%`;
  }

  function renderChecklist() {
    const total = sessionItems.length;
    checklistSummaryEl.textContent = `قائمة تقدّم الجلسة (${accepted.size} / ${total} مكتمل)`;
    updateChecklistProgressBar();
    checklistListEl.innerHTML = buildChecklistRowsHtml();
  }

  /** الضغط على عنصر متبقٍ بالقائمة يملأ حقول الاختيار به مباشرة (القرار 14). */
  checklistListEl.addEventListener("click", (e) => {
    const row = e.target.closest(".intake-checklist-item");
    if (!row || row.classList.contains("done")) return;
    const item = findItemById(row.dataset.itemId);
    if (!item) return;
    if (item.kind === "note") {
      selectedType = "note";
      selectedNoteLabel = item.label.split(" — ")[0];
      selectedRhythmId = item.rhythmicValueId;
    } else {
      selectedType = "maqam";
      selectedMaqamName = item.maqamName;
      selectedMaqamPart = item.maqamPart;
    }
    renderTypeToggle();
    renderNoteNameOptions();
    renderMaqamNameOptions();
    renderAll();
  });

  function renderTable() {
    const entries = [...accepted.entries()];
    tableCountEl.textContent = `${entries.length} عنصر`;
    tableEmptyEl.hidden = entries.length > 0;
    downloadAllBtnEl.disabled = entries.length === 0;
    tableRowsEl.innerHTML = entries
      .map(([id, entry]) => {
        const badgeType = entry.item.kind === "note" ? "note" : "maqam";
        const badgeLabel = entry.item.kind === "note" ? "نغمة" : "مقام";
        return `
        <div class="intake-table-row" data-id="${escapeHtml(id)}">
          <span class="intake-table-badge ${badgeType}">${badgeLabel}</span>
          <span class="intake-table-detail">${escapeHtml(entry.item.label)}</span>
          <span class="intake-table-actions">
            <button type="button" class="icon-btn" data-action="listen" title="استماع">▶</button>
            <button type="button" class="icon-btn" data-action="export" title="تصدير">⬇</button>
            <button type="button" class="icon-btn danger" data-action="delete" title="حذف">✕</button>
          </span>
        </div>`;
      })
      .join("");
  }

  tableRowsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest(".intake-table-row");
    const id = row.dataset.id;
    const entry = accepted.get(id);
    if (!entry) return;
    if (btn.dataset.action === "listen") {
      new Audio(URL.createObjectURL(entry.cleanBlob)).play();
    } else if (btn.dataset.action === "export") {
      downloadBlob(entry.cleanBlob, `${id}.wav`);
      downloadBlob(entry.rawBlob, `${id}-raw.wav`);
    } else if (btn.dataset.action === "delete") {
      accepted.delete(id);
      renderAll();
    }
  });

  function renderSummary() {
    summaryEl.textContent = `معرّف الخبير: ${expertId} — مقبول حتى الآن: ${accepted.size} / ${sessionItems.length}`;
  }

  /** إعادة رسم شاملة بعد أي تغيير يمسّ accepted/alternateAddedFor/sessionItems. */
  function renderAll() {
    if (selectedType === "note") renderNoteRhythmOptions();
    else renderMaqamTypeOptions();
    renderSelectedItemDisplay();
    renderControls();
    renderReview();
    renderTable();
    renderChecklist();
    renderSummary();
  }

  // ---------------------------------------------------------------------
  // أزرار التسجيل (تمهيد → تسجيل → إيقاف → معاينة → قبول/إعادة/مسح)
  // ---------------------------------------------------------------------

  function renderControls() {
    if (pendingCapture || showingAlternatePanel || prerolling) {
      controlsEl.innerHTML = "";
      return;
    }
    const alreadyDone = !!selectedItem() && accepted.has(selectedItem().id);
    controlsEl.innerHTML = `
      <button type="button" id="intakeRecordBtn" class="btn-primary" ${recording || alreadyDone ? "disabled" : ""}>
        ${recording ? "…جارٍ التسجيل" : "ابدأ التسجيل"}
      </button>
      ${recording ? `<button type="button" id="intakeStopBtn" class="btn-secondary">إيقاف وحفظ المحاولة</button>` : ""}
      ${recording ? `<button type="button" id="intakeCancelRecordingBtn" class="btn-skip">مسح المحاولة</button>` : ""}
    `;
    controlsEl.querySelector("#intakeRecordBtn")?.addEventListener("click", onRecordClick);
    controlsEl.querySelector("#intakeStopBtn")?.addEventListener("click", onStopClick);
    controlsEl.querySelector("#intakeCancelRecordingBtn")?.addEventListener("click", onCancelRecording);
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

  function renderPreroll() {
    if (!prerolling) {
      prerollEl.hidden = true;
      prerollEl.textContent = "";
      return;
    }
    prerollEl.hidden = false;
    prerollEl.textContent = prerollCount > 0 ? `استعد… ${prerollCount} / ${PREROLL_BEATS}` : "استعد…";
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
    const item = selectedItem();
    if (!item || accepted.has(item.id)) return; // احترازي — الاختيار المعطَّل لا يُفترض يصل هنا أصلًا
    try {
      hintEl.textContent = "…جارٍ تشغيل الميكروفون";
      await recorder.ensureMic();
    } catch (e) {
      hintEl.textContent = "تعذّر الوصول للميكروفون — تحقّق من الإذن.";
      return;
    }
    startPreroll();
  }

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
    const item = selectedItem();
    hintEl.textContent = item ? item.hint : "";
    recorder.startCapture(onLiveReading);
    renderPreroll();
    renderControls();
  }

  function onCancelRecording() {
    if (!recording) return;
    recording = false;
    recorder.stopCapture();
    renderSelectedItemDisplay();
    renderControls();
    renderReview();
  }

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
    const item = selectedItem();
    if (!item) return;
    accepted.set(item.id, {
      rawBlob: pendingCapture.rawBlob,
      cleanBlob: pendingCapture.cleanBlob,
      measuredHz: pendingCapture.measuredHz,
      hasSplit: pendingCapture.hasSplit,
      item,
    });
    pendingCapture = null;
    renderAll();
  }

  function onRedo() {
    pendingCapture = null;
    renderControls();
    renderReview();
  }

  function onOpenAlternatePanel() {
    if (selectedType !== "maqam" || !selectedMaqamName || alternateAddedFor.has(selectedMaqamName)) return;
    showingAlternatePanel = true;
    alternatePanelSelections = new Set();
    renderControls();
    renderAlternatePanel();
  }

  function onConfirmAlternatePanel() {
    if (selectedType !== "maqam" || !selectedMaqamName) {
      showingAlternatePanel = false;
      renderControls();
      renderAlternatePanel();
      return;
    }
    const maqamName = selectedMaqamName;
    alternateAddedFor.add(maqamName);
    const altItem = createAlternateDescentItem(maqamName, [...alternatePanelSelections]);
    const commonIdx = sessionItems.findIndex(
      (it) => it.kind === "maqam" && it.maqamName === maqamName && it.maqamPart === "descend-common"
    );
    if (commonIdx !== -1) sessionItems.splice(commonIdx + 1, 0, altItem);
    else sessionItems.push(altItem);
    showingAlternatePanel = false;
    selectedMaqamPart = "descend-alternate";
    renderAll();
  }

  function onCancelAlternatePanel() {
    showingAlternatePanel = false;
    renderControls();
    renderAlternatePanel();
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
    const manifest = { expertId, sessionCompletedAtMs: Date.now(), items: [] };
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

  // ---------------------------------------------------------------------
  // ربط الأحداث الثابتة + الإقلاع
  // ---------------------------------------------------------------------

  typeNoteBtnEl.addEventListener("click", () => {
    if (selectedType === "note") return;
    selectedType = "note";
    renderTypeToggle();
    renderNoteRhythmOptions();
    renderSelectedItemDisplay();
    renderControls();
  });
  typeMaqamBtnEl.addEventListener("click", () => {
    if (selectedType === "maqam") return;
    selectedType = "maqam";
    renderTypeToggle();
    renderMaqamTypeOptions();
    renderSelectedItemDisplay();
    renderControls();
  });
  noteNameSelectEl.addEventListener("change", () => {
    selectedNoteLabel = noteNameSelectEl.value;
    renderNoteRhythmOptions();
    renderSelectedItemDisplay();
    renderControls();
    renderChecklist();
  });
  noteRhythmSelectEl.addEventListener("change", () => {
    selectedRhythmId = noteRhythmSelectEl.value;
    renderSelectedItemDisplay();
    renderControls();
    renderChecklist();
  });
  maqamNameSelectEl.addEventListener("change", () => {
    selectedMaqamName = maqamNameSelectEl.value;
    renderMaqamTypeOptions();
    renderSelectedItemDisplay();
    renderControls();
    renderChecklist();
  });
  maqamTypeSelectEl.addEventListener("change", () => {
    selectedMaqamPart = maqamTypeSelectEl.value;
    renderSelectedItemDisplay();
    renderControls();
    renderChecklist();
  });
  addAlternateBtnEl.addEventListener("click", onOpenAlternatePanel);
  downloadAllBtnEl.addEventListener("click", onDownloadAll);

  renderTypeToggle();
  renderNoteNameOptions();
  renderNoteRhythmOptions();
  renderMaqamNameOptions();
  renderMaqamTypeOptions();
  renderAll();

  return {
    destroy() {
      prerollEngine?.stop();
      container.innerHTML = "";
    },
  };
}
