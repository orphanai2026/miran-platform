/**
 * Unified bottom navigation for all redesigned pages.
 * Exercises intentionally remain outside this module and keep only the top Home link.
 */
const NAV_ITEMS = [
  { key: "home", href: "../01-home/index.html", label: "الرئيسية", icon: "⌂" },
  { key: "calibration", href: "../02-calibration/index.html", label: "المعايرة", icon: "⌁" },
  { key: "exercises", href: "../03-exercises/index.html", label: "التمارين", icon: "◉" },
  { key: "maqamat", href: "../04-maqamat-guide/index.html", label: "المقامات", icon: "≋" },
  { key: "metronome", href: "../05-metronome/index.html", label: "المترونوم", icon: "◇" },
  { key: "library", href: "../06-library-export/index.html", label: "المكتبة", icon: "▥" },
  { key: "teaching", href: "../08-teaching-guide/index.html", label: "الدليل", icon: "▤" },
  { key: "about", href: "../09-about/index.html", label: "من نحن", icon: "◎" },
];

export function mountNav(container, currentKey) {
  container.innerHTML = `
    <nav class="bottom-nav" dir="rtl" aria-label="تنقّل رئيسي">
      ${NAV_ITEMS.map((item) => `
        <a class="nav-item ${item.key === currentKey ? "active" : ""}"
           href="${item.href}"
           data-nav-key="${item.key}"
           ${item.key === currentKey ? 'aria-current="page"' : ""}>
          <span class="nav-icon" aria-hidden="true">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
        </a>
      `).join("")}
    </nav>
  `;
}
