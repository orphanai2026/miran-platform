/**
 * reference-notes-panel.js
 * ============================================================
 * قسم "استماع مرجعي" في صفحة #2 — 25 نغمة مفردة بصوت ناي حقيقي (القرار
 * 9.2). مستقل تمامًا عن `mountCalibrationPage` (لا يلمسه ولا يُعدَّل داخله)،
 * يُركَّب في حاوٍ منفصل بنفس الصفحة — نفس نمط إضافة القاموس/المرجع النظري
 * في صفحة #4.
 */
import { REFERENCE_NOTES } from "../../../../data/reference-library/manifest-data.js";
import { renderReferenceAudioList } from "../../shared/reference-audio-list.js";

/**
 * يبني قسم استماع النغمات المرجعية داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountReferenceNotesPanel(container) {
  container.innerHTML = renderReferenceAudioList(
    REFERENCE_NOTES,
    "لا تسجيلات مرجعية بعد — ستُضاف بعد جلسة خبير أولى (صفحة الخبير)."
  );
}
