/**
 * library-page.js
 * ============================================================
 * منطق صفحة #6 (المكتبة/التصدير) — مراجعة العينات المسجَّلة في صفحة #2
 * (المعايرة الشخصية) وحالة كل نغمة (تركيبة إصبعة+سجل)، مع زر تصدير JSON
 * (القرار 4: "التصدير: JSON فقط (أرقام قياس، لا صوت)").
 *
 * **لا تكرار للبيانة (القسم 4):** منطق إعادة بناء المخزن وبناء حمولة
 * التصدير مُستخرَج إلى `export-payload.js` (يشاركه أيضًا صفحة #7 للإرسال
 * التلقائي — استثناء القرار 4). هذا الملف يستورده بدل تعريفه محليًا.
 *
 * **نطاق مقصود:** عرض ومراجعة محليان + توليد ملف JSON للتنزيل عبر المتصفح.
 * الإرسال الشبكي الفعلي لنقطة استقبال Cloudflare (استثناء القرار 4) مبني
 * الآن في صفحة #7 — انظر `src/ui/pages/07-settings-sync/intake-sync.js`.
 */
import { rebuildStore, collectAllKeys, buildExportPayload } from "./export-payload.js";

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
