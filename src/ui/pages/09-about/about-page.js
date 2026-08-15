/**
 * about-page.js
 * ============================================================
 * صفحة "من نحن" — وصف المشروع، الفلسفة التقنية، رابط المستودع، وقائمة
 * المساهمين/الخبراء (القرار 9.5) — على نمط قسم `#more` في RECORD-N.
 * صفحة عامة مستقلة، جزء من التنقّل الحي الثماني (تحل محل صفحة #7).
 */
import { CONTRIBUTORS } from "./contributors-data.js";

const REPO_URL = "https://github.com/orphanai2026/miran-platform";

function renderContributors() {
  return CONTRIBUTORS.map(
    (c) => `
      <li class="about-contributor">
        <span class="about-contributor-name">${c.name}</span>
        <span class="about-contributor-role">${c.role}</span>
        ${c.note ? `<span class="about-contributor-note">${c.note}</span>` : ""}
      </li>
    `
  ).join("");
}

/**
 * يبني صفحة "من نحن" داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountAboutPage(container) {
  container.innerHTML = `
    <div class="about-page" dir="rtl">
      <section class="about-block">
        <h2>عن مِران</h2>
        <p>
          مِران منصة تعليم الناي الشرقي — بلا خادم (باستثناء ضيق موثَّق)، تدمج منهج
          مِران الأصلي (74 يومًا، إتقان الآلة) مع فلسفة RECORD-N (معايرة، مرجع
          نغمة شخصي، لا صح مطلق) في منصة موحَّدة واحدة.
        </p>
      </section>

      <section class="about-block">
        <h2>الفلسفة التقنية</h2>
        <ul class="about-principles">
          <li>مصدر حقيقة واحد لكل بيانة — لا تكرار أبدًا</li>
          <li>بلا اعتماديات تشغيل إلا باستثناء صريح موثَّق</li>
          <li>كل قرار معماري موثَّق ومُصادَق عليه قبل التنفيذ</li>
          <li>لا صح مطلق في آلة نفخية يدوية الصنع — فقط قرب من مركز ضمن سماحية</li>
        </ul>
      </section>

      <section class="about-block">
        <h2>المستودع</h2>
        <a class="about-repo-link" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">${REPO_URL}</a>
      </section>

      <section class="about-block">
        <h2>المساهمون والخبراء</h2>
        <ul class="about-contributors-list">
          ${renderContributors()}
        </ul>
      </section>
    </div>
  `;
}
