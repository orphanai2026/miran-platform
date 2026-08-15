/**
 * reference-audio-list.js
 * ============================================================
 * مكوّن عرض مشترك لقوائم الاستماع المرجعية (القرار 9.2) — يُستخدم في
 * صفحة #2 (25 نغمة مفردة) وصفحة #4 (8 مقامات). يتعامل بلطف مع الحالة
 * الفارغة (لا ملفات بعد) بدل أي خطأ أو فراغ صامت.
 */
import { REFERENCE_AUDIO_BASE } from "./reference-audio-path.js";

/**
 * يبني HTML لقائمة استماع مرجعية من مصفوفة بنود.
 * @param {import("../../../data/reference-library/manifest-data.js").ReferenceAudioEntry[]} entries
 * @param {string} emptyMessage - رسالة تُعرَض إن كانت المصفوفة فارغة.
 * @returns {string}
 */
export function renderReferenceAudioList(entries, emptyMessage) {
  if (!entries || entries.length === 0) {
    return `<p class="reference-audio-empty">${emptyMessage}</p>`;
  }
  return `
    <ul class="reference-audio-list">
      ${entries
        .map(
          (e) => `
        <li class="reference-audio-item">
          <span class="reference-audio-label">${e.label}</span>
          <audio controls preload="none" src="${REFERENCE_AUDIO_BASE}${e.filename}"></audio>
          ${
            e.measuredHz
              ? `<span class="reference-audio-hz">${e.measuredHz.toFixed(1)} هرتز</span>`
              : ""
          }
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}
