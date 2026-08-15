/**
 * library-page.js
 * ============================================================
 * منطق صفحة #6 (المكتبة/التصدير) — مراجعة العينات المسجَّلة في صفحة #2
 * (المعايرة الشخصية) وحالة كل نغمة (تركيبة إصبعة+سجل)، مع زر تصدير JSON
 * (القرار 4: "التصدير: JSON فقط (أرقام قياس، لا صوت)").
 *
 * **لا تكرار للبيانة (القسم 4):** يعيد استخدام `sample-store.js` الموجود
 * فعليًا في `src/ui/pages/02-calibration/` (نفس مفتاح localStorage)، ومحرك
 * `PersonalReferenceStore` من `src/calibration/calibration-engine.js` —
 * لا نسخة ثانية من منطق التخزين أو الحساب هنا.
 *
 * **نطاق مقصود:** عرض ومراجعة محليان + توليد ملف JSON للتنزيل عبر المتصفح.
 * **لا يرسل** أي بيانات فعليًا لأي خادم — نقطة الاستقبال على Cloudflare
 * (استثناء القرار 4) وإعدادات المزامنة موضوعهما صفحة #7، خارج نطاق هذي المرحلة.
 */
import { CalibrationSample, PersonalReferenceStore } from "../../../calibration/calibration-engine.js";
import { loadRawState } from "../02-calibration/sample-store.js";

/** يعيد بناء PersonalReferenceStore من الحالة المخزَّنة محليًا (نفس نمط calibration-page.js). */
function rebuildStore() {
  const store = new PersonalReferenceStore();
  const raw = loadRawState();
  for (const s of raw.samples) {
    try {
      store.addSample(new CalibrationSample(s));
    } catch (e) {
      // عيّنة تالفة — تُتجاهل بصمت بدل كسر الصفحة (نفس منطق calibration-page.js).
    }
  }
  for (const [key, snapshot] of Object.entries(raw.snapshots)) {
    const [fingering, register] = key.split("::");
    store.restoreFrozenSnapshot(fingering, register, snapshot);
  }
  for (const [key, name] of Object.entries(raw.taughtNames)) {
    const [fingering, register] = key.split("::");
    store.teachPitchName(fingering, register, name);
  }
  return { store, raw };
}

/** كل تركيبات (إصبعة+سجل) الظاهرة في أي من: عينات، لقطات، أسماء مُعلَّمة. */
function collectAllKeys(raw) {
  const keys = new Set();
  for (const s of raw.samples) keys.add(`${s.fingering}::${s.register}`);
  for (const k of Object.keys(raw.snapshots)) keys.add(k);
  for (const k of Object.keys(raw.taughtNames)) keys.add(k);
  return Array.from(keys).sort();
}

function renderEntry(store, key) {
  const [fingering, register] = key.split("::");
  const samples = store.getSamples(fingering, register);
  const distinctDays = new Set(samples.map((s) => s.dayKey)).size;
  const frozen = store.getFrozenReference(fingering, register);
  const taughtName = store.getTaughtName(fingering, register);

  const frozenHtml = frozen
    ? `<span class="library-badge library-badge-frozen">مُعتمَد: ${frozen.pitchHz.toFixed(2)} هرتز ±${frozen.toleranceCents.toFixed(1)} سنت</span>`
    : `<span class="library-badge library-badge-pending">لم يُعتمَد بعد</span>`;

  const taughtHtml = taughtName ? `<div class="library-taught">الاسم المُعلَّم: ${taughtName}</div>` : "";

  return `
    <li class="library-entry" data-pitch-key="${key}">
      <div class="library-entry-head">
        <span class="library-fingering">${fingering}</span>
        <span class="library-register">(${register})</span>
        ${frozenHtml}
      </div>
      <div class="library-counts">عدد العينات: ${samples.length} — عدد الأيام المختلفة: ${distinctDays}</div>
      ${taughtHtml}
    </li>
  `;
}

function buildExportPayload(store) {
  return {
    exportedAtMs: Date.now(),
    samples: store.exportAllSamples(),
    frozenSnapshots: store.exportAllFrozenSnapshots(),
    taughtNames: store.exportAllTaughtNames(),
  };
}

function triggerJsonDownload(payload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `miran-calibration-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * يبني صفحة المكتبة/التصدير كاملة داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountLibraryPage(container) {
  const { store, raw } = rebuildStore();
  const keys = collectAllKeys(raw);

  container.innerHTML = `
    <div class="library-page" dir="rtl">
      <ul id="libraryList" class="library-list"></ul>
      <p id="libraryEmpty" class="library-empty" hidden>لا توجد بيانات معايرة مسجَّلة بعد. سجّل عينات من صفحة المعايرة الشخصية أولًا.</p>
      <button type="button" id="libraryExportBtn" class="btn-primary">تصدير JSON</button>
      <p id="libraryExportHint" class="library-export-hint"></p>
    </div>
  `;

  const listEl = container.querySelector("#libraryList");
  const emptyEl = container.querySelector("#libraryEmpty");
  const exportBtn = container.querySelector("#libraryExportBtn");
  const exportHint = container.querySelector("#libraryExportHint");

  if (keys.length === 0) {
    emptyEl.hidden = false;
    exportBtn.disabled = true;
  } else {
    listEl.innerHTML = keys.map((key) => renderEntry(store, key)).join("");
  }

  exportBtn.addEventListener("click", () => {
    const payload = buildExportPayload(store);
    triggerJsonDownload(payload);
    exportHint.textContent = `تم تصدير ${payload.samples.length} عينة، ${Object.keys(payload.frozenSnapshots).length} لقطة معتمدة، ${Object.keys(payload.taughtNames).length} اسم مُعلَّم.`;
  });

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}
