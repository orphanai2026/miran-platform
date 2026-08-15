/**
 * theory-reference-panel.js
 * ============================================================
 * لوحة "مرجع نظري سريع" — شبكة بطاقات قابلة للتوسيع، بنفس تفاعل "استكشف
 * المكتبة" في RECORD-N (بطاقة: عنوان + سطر وصف + زر "عرض القسم" يفتح
 * التفاصيل). مستقلة تمامًا عن mountMaqamatPage وmountGlossaryPanel —
 * لا تلمس أيًا منهما، وتُركَّب في حاوٍ منفصل ثالث بنفس الصفحة.
 */
import { THEORY_TOPICS } from "./theory-reference-data.js";
import { mountGlossaryPanel } from "./glossary-panel.js";

function renderFacts(facts) {
  if (!facts) return "";
  return `
    <div class="theory-facts">
      ${facts
        .map(
          ([title, text, accent]) => `
        <div class="theory-fact${accent ? " theory-fact--accent" : ""}">
          <strong>${title}</strong>
          <span>${text}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderNotesGrid(grid) {
  if (!grid) return "";
  return `
    <div class="theory-note-grid">
      ${grid
        .map(
          ([ar, en, cents]) => `
        <div class="theory-note-chip">
          <strong>${ar}</strong>
          <span dir="ltr">${en}</span>
          <span class="theory-note-chip-cents">${cents}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderMeterTable(rows) {
  if (!rows) return "";
  return `
    <div class="theory-meter-table">
      ${rows
        .map(
          ([frac, kind, detail]) => `
        <div class="theory-meter-row">
          <span class="theory-meter-frac">${frac}</span>
          <span class="theory-meter-kind">${kind}</span>
          <span class="theory-meter-detail">${detail}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderRegisters(registers) {
  if (!registers) return "";
  return `
    <div class="theory-register-grid">
      ${registers
        .map(
          (r) => `
        <div class="theory-register-chip">
          <strong>${r.name}</strong>
          <span>${r.note}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderTopicDetail(topic) {
  if (topic.linksToMaqamBrowser) {
    return `
      <p class="theory-redirect-note">
        ${topic.summary}
      </p>
      <a href="#app" class="theory-jump-link" data-jump="app">↑ الانتقال لمستعرض المقامات أعلى الصفحة</a>
    `;
  }
  if (topic.linksToGlossary) {
    return `<div id="theoryGlossaryMount" class="theory-glossary-mount"></div>`;
  }
  return `
    ${renderFacts(topic.facts)}
    ${renderNotesGrid(topic.grid)}
    ${renderMeterTable(topic.meterTable)}
    ${renderRegisters(topic.registers)}
    ${topic.note ? `<p class="theory-source-note">${topic.note}</p>` : ""}
  `;
}

function renderCard(topic, expandedId) {
  const isOpen = topic.id === expandedId;
  return `
    <article class="theory-card ${isOpen ? "open" : ""}" data-topic-id="${topic.id}">
      <div class="theory-card-head">
        <h3 class="theory-card-title">${topic.title}</h3>
        <p class="theory-card-summary">${topic.summary}</p>
        <button type="button" class="theory-card-toggle" data-toggle="${topic.id}">
          ${isOpen ? "إخفاء القسم ‹" : "عرض القسم ›"}
        </button>
      </div>
      ${isOpen ? `<div class="theory-card-body">${renderTopicDetail(topic)}</div>` : ""}
    </article>
  `;
}

/**
 * يبني لوحة "مرجع نظري سريع" داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountTheoryReferencePanel(container) {
  let expandedId = null;

  function render() {
    container.innerHTML = `
      <div class="theory-grid" dir="rtl">
        ${THEORY_TOPICS.map((t) => renderCard(t, expandedId)).join("")}
      </div>
    `;
    if (expandedId === "glossary") {
      const mount = container.querySelector("#theoryGlossaryMount");
      if (mount) mountGlossaryPanel(mount);
    }
  }

  render();

  container.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest("[data-toggle]");
    if (toggleBtn) {
      const id = toggleBtn.dataset.toggle;
      expandedId = expandedId === id ? null : id;
      render();
      return;
    }
    const jumpLink = e.target.closest("[data-jump]");
    if (jumpLink) {
      e.preventDefault();
      const target = document.getElementById(jumpLink.dataset.jump);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}
