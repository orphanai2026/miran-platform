/**
 * nav.js
 * ============================================================
 * تنقّل عام موحَّد بين الصفحات — أول ملف مشترك في `src/ui/shared/` (لم يكن
 * موجودًا قبل هذي المرحلة). كل صفحة من الصفحات السبع المبنية (باستثناء
 * صفحة #3 التي هي مجرد إعادة توجيه فورية، لا تحتاج شريط تنقّل يظهر لحظيًا)
 * تستورد `mountNav` وتمرر مفتاح نفسها لتمييزها في الشريط.
 *
 * كل الصفحات في `src/ui/pages/` أخوات بنفس العمق (`XX-name/index.html`)،
 * لذا الرابط النسبي بين أي صفحتين ثابت الصيغة دائمًا: `../YY-name/index.html`
 * — لا حاجة لحساب عمق مختلف حسب الصفحة المصدر.
 */

const NAV_ITEMS = [
  { key: "home", href: "../01-home/index.html", label: "الرئيسية" },
  { key: "calibration", href: "../02-calibration/index.html", label: "المعايرة" },
  { key: "exercises", href: "../03-exercises/index.html", label: "التمارين" },
  { key: "maqamat", href: "../04-maqamat-guide/index.html", label: "المقامات" },
  { key: "metronome", href: "../05-metronome/index.html", label: "المترونوم" },
  { key: "library", href: "../06-library-export/index.html", label: "المكتبة" },
  { key: "settings", href: "../07-settings-sync/index.html", label: "الإعدادات" },
  { key: "teaching", href: "../08-teaching-guide/index.html", label: "الدليل" },
];

/**
 * يبني شريط التنقّل داخل عنصر حاوٍ معطى ويُبرز الصفحة الحالية.
 * @param {HTMLElement} container
 * @param {string} currentKey - أحد مفاتيح NAV_ITEMS (مثلًا "home"، "calibration").
 */
export function mountNav(container, currentKey) {
  container.innerHTML = `
    <nav class="site-nav" dir="rtl" aria-label="تنقّل رئيسي">
      ${NAV_ITEMS.map(
        (item) => `
          <a
            class="site-nav-link ${item.key === currentKey ? "active" : ""}"
            href="${item.href}"
            data-nav-key="${item.key}"
            ${item.key === currentKey ? 'aria-current="page"' : ""}
          >${item.label}</a>
        `
      ).join("")}
    </nav>
  `;
}
