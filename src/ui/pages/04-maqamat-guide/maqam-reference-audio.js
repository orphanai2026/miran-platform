/**
 * maqam-reference-audio.js
 * ============================================================
 * استماع مرجعي للمقام المحدَّد حاليًا في صفحة #4 — تسجيل سلّم كامل صعودًا
 * وهبوطًا بصوت ناي حقيقي (القرار 9.2). مستقل عن `mountMaqamatPage` (لا
 * يُعدَّل داخله) — يستمع لأحداث الضغط على أزرار قائمة المقامات بتفويض
 * (event delegation) عبر `data-maqam-name` الموجود أصلًا على كل زر.
 */
import { REFERENCE_MAQAMAT } from "../../../../data/reference-library/manifest-data.js";
import { renderReferenceAudioList } from "../../shared/reference-audio-list.js";
import { ALL_MAQAMAT } from "../../../maqamat/maqam-data.js";

/**
 * يبني قسم استماع المقام المرجعي، ويربطه بتغييرات اختيار المقام في appContainer.
 * @param {HTMLElement} container - حاوٍ عرض الاستماع.
 * @param {HTMLElement} appContainer - نفس الحاوي الذي رُكِّب فيه mountMaqamatPage (لتفويض الأحداث).
 */
export function mountMaqamReferenceAudio(container, appContainer) {
  function renderFor(maqamName) {
    const entry = REFERENCE_MAQAMAT.find((e) => e.id === `maqam-${maqamName}`);
    container.innerHTML = renderReferenceAudioList(
      entry ? [entry] : [],
      `لا تسجيل مرجعي لمقام "${maqamName}" بعد.`
    );
  }

  // نفس افتراض mountMaqamatPage: أول مقام في ALL_MAQAMAT محدَّد تلقائيًا عند التحميل.
  renderFor(ALL_MAQAMAT[0].name);

  appContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".maqam-list-btn[data-maqam-name]");
    if (btn) renderFor(btn.dataset.maqamName);
  });
}
