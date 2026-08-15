/**
 * glossary-panel.js
 * ============================================================
 * لوحة قاموس المصطلحات — بحث فوري بالعربية أو الإنجليزية، وفلترة بالتصنيف.
 * إضافة مستقلة عن mountMaqamatPage (لا تلمس منطقه ولا بياناته إطلاقًا)،
 * تُركَّب في حاوٍ منفصل أسفل مستعرض المقامات في نفس الصفحة.
 */
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES } from "./glossary-terms.js";

function normalize(str) {
  return str.trim().toLocaleLowerCase("ar");
}

function renderCards(query, category) {
  const q = normalize(query);
  const filtered = GLOSSARY_TERMS.filter(([en, ar, cat, def]) => {
    const matchesCategory = category === "الكل" || cat === category;
    const matchesQuery = q === "" || normalize(`${en} ${ar} ${def}`).includes(q);
    return matchesCategory && matchesQuery;
  });

  if (filtered.length === 0) {
    return `<p class="glossary-empty">لا توجد مصطلحات مطابقة.</p>`;
  }

  return `
    <div class="glossary-grid">
      ${filtered
        .map(
          ([en, ar, cat, def]) => `
        <article class="glossary-card">
          <div class="glossary-card-head">
            <strong class="glossary-ar">${ar}</strong>
            <span class="glossary-en" dir="ltr">${en}</span>
          </div>
          <p class="glossary-def">${def}</p>
          <span class="glossary-cat">${cat}</span>
        </article>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * يبني لوحة قاموس المصطلحات داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountGlossaryPanel(container) {
  container.innerHTML = `
    <div class="glossary-panel" dir="rtl">
      <input
        type="search"
        id="glossarySearch"
        class="glossary-search"
        placeholder="ابحث عن مصطلح بالعربية أو الإنجليزية…"
        aria-label="بحث المصطلحات الموسيقية"
      />
      <div id="glossaryCategories" class="glossary-categories"></div>
      <div id="glossaryResults"></div>
    </div>
  `;

  const searchEl = container.querySelector("#glossarySearch");
  const categoriesEl = container.querySelector("#glossaryCategories");
  const resultsEl = container.querySelector("#glossaryResults");

  let activeCategory = "الكل";

  function renderCategoryPills() {
    categoriesEl.innerHTML = GLOSSARY_CATEGORIES.map(
      (cat) => `
        <button
          type="button"
          class="glossary-cat-pill ${cat === activeCategory ? "active" : ""}"
          data-category="${cat}"
        >${cat}</button>
      `
    ).join("");
  }

  function update() {
    resultsEl.innerHTML = renderCards(searchEl.value, activeCategory);
  }

  renderCategoryPills();
  update();

  searchEl.addEventListener("input", update);
  categoriesEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".glossary-cat-pill");
    if (!btn) return;
    activeCategory = btn.dataset.category;
    renderCategoryPills();
    update();
  });

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}
