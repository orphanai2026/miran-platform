/**
 * maqamat-page.js
 * ============================================================
 * منطق صفحة #4 (دليل المقامات) — يعرض السلم (سلسلة الأجناس) والسِّير اللحني
 * لكل مقام من src/maqamat/، مع علامة "؟" صريحة لأي سِّير غير مصادَق عليه
 * (القرار 5). لا يعيد تعريف أي بيانة — يستورد ALL_MAQAMAT مباشرة، مصدر
 * الحقيقة الواحد (القسم 4 من سجل القرارات).
 *
 * **نطاق مقصود:** عرض قراءة فقط للسلم والسِّير المسجَّلين مسبقًا. لا يتضمن
 * إرشادًا صوتيًا تفاعليًا (مقارنة عزف حي بالسِّير) — ذلك يحتاج دمجًا مع
 * src/calibration/ خارج نطاق هذي المرحلة، ولم يُطلب صراحة بعد.
 */
import { ALL_MAQAMAT } from "../../../maqamat/maqam-data.js";

/** ترجمة أنواع الأبعاد (INTERVAL_TYPES) إلى تسمية عربية قابلة للقراءة. */
const INTERVAL_LABELS = {
  whole: "بُعد كامل",
  half: "نصف بُعد",
  three_quarter: "ثلاثة أرباع بُعد",
  quarter: "ربع بُعد",
  augmented_second: "بُعد وربع (ثانية زائدة)",
};

function intervalLabel(type) {
  return INTERVAL_LABELS[type] || type;
}

function renderJinsChain(jinsChain) {
  return jinsChain
    .map(({ jins, startDegree }) => {
      const pattern = jins.intervalPattern.map(intervalLabel).join(" ← ");
      return `
        <li class="jins-segment">
          <div class="jins-segment-head">
            <span class="jins-name">${jins.name}</span>
            <span class="jins-start-degree">(من الدرجة ${startDegree})</span>
          </div>
          <div class="jins-pattern">${pattern}</div>
          <div class="jins-source">المصدر: ${jins.source}</div>
        </li>
      `;
    })
    .join("");
}

function renderSayrStatus(sayr) {
  if (!sayr) {
    return `<span class="sayr-badge sayr-unvalidated">لم يُسجَّل السِّير اللحني بعد ؟</span>`;
  }
  const badgeClass = sayr.isValidated ? "sayr-validated" : "sayr-unvalidated";
  return `
    <span class="sayr-badge ${badgeClass}">${sayr.displayLabel()}</span>
    <div class="sayr-detail">
      يبدأ من: ${sayr.startingJins === "lower" ? "الجنس السفلي" : "الجنس العلوي"} —
      قرار: ${sayr.qarar}، غماز: ${sayr.ghammaz}
    </div>
    <div class="sayr-source">المصدر: ${sayr.source}</div>
  `;
}

function renderDetails(maqam) {
  return `
    <h2 id="maqamDetailsName">${maqam.name}</h2>
    <div class="maqam-basics">
      <span id="maqamQarar">القرار: ${maqam.qarar}</span>
      <span id="maqamGhammaz">الغماز: ${maqam.ghammaz}</span>
    </div>

    <h3>السلم (سلسلة الأجناس)</h3>
    <ul id="maqamJinsChain" class="jins-chain-list">
      ${renderJinsChain(maqam.jinsChain)}
    </ul>

    <h3>السِّير اللحني</h3>
    <div id="maqamSayrStatus" class="sayr-status">
      ${renderSayrStatus(maqam.sayr)}
    </div>
  `;
}

/**
 * يبني صفحة دليل المقامات كاملة داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 * @param {Object} [options]
 * @param {Object[]} [options.maqamat] - لأغراض الاختبار؛ الافتراضي ALL_MAQAMAT.
 */
export function mountMaqamatPage(container, { maqamat = ALL_MAQAMAT } = {}) {
  container.innerHTML = `
    <div class="maqamat-page" dir="rtl">
      <nav id="maqamList" class="maqam-list"></nav>
      <section id="maqamDetails" class="maqam-details"></section>
    </div>
  `;

  const listEl = container.querySelector("#maqamList");
  const detailsEl = container.querySelector("#maqamDetails");

  maqamat.forEach((maqam, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "maqam-list-btn";
    btn.dataset.maqamName = maqam.name;
    btn.textContent = maqam.name;
    btn.addEventListener("click", () => selectMaqam(index));
    listEl.appendChild(btn);
  });

  function selectMaqam(index) {
    const maqam = maqamat[index];
    detailsEl.innerHTML = renderDetails(maqam);
    listEl.querySelectorAll(".maqam-list-btn").forEach((b, i) => {
      b.classList.toggle("active", i === index);
    });
  }

  if (maqamat.length > 0) {
    selectMaqam(0);
  }

  return {
    destroy() {
      container.innerHTML = "";
    },
  };
}
