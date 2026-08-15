/**
 * nav.js
 * ============================================================
 * تنقّل عام موحَّد بين الصفحات — أول ملف مشترك في `src/ui/shared/`.
 * كل صفحة حية (باستثناء صفحة #3 التي هي إطار مضمّن، وصفحة #8 التي تحمل
 * نسخة ثابتة يدويًا من نفس هذي القائمة بلا JavaScript) تستورد `mountNav`
 * وتمرر مفتاح نفسها لتمييزها في الشريط.
 *
 * **تحديث لاحق (القرار 9.6):** صفحة #7 (الإعدادات/المزامنة) أُزيلت من هذي
 * القائمة — أول إعادة فتح لخريطة الصفحات المقفَلة (القسم 7 الأصلي). الكود
 * نفسه (`src/ui/pages/07-settings-sync/`, بما فيه نقطة استقبال Cloudflare)
 * **باقٍ بالمستودع بلا حذف**، نائم لحد تنفيذ القسم 6 (الحسابات) فعليًا —
 * لا رابط له من أي مكان حي بالمنصة. صفحة "من نحن" (`09-about/`، القرار
 * 9.5) أخذت مكانها في العدد الإجمالي (لا يزال 8 روابط).
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
  { key: "teaching", href: "../08-teaching-guide/index.html", label: "الدليل" },
  { key: "about", href: "../09-about/index.html", label: "من نحن" },
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
