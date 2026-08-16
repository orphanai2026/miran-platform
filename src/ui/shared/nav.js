/**
 * Unified bottom navigation for all redesigned pages.
 * Exercises intentionally remain outside this module and keep only the top Home link.
 */
const NAV_ITEMS = [
  { key: "home", href: "../01-home/index.html", label: "الرئيسية", icon: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>' },
  { key: "calibration", href: "../02-calibration/index.html", label: "المعايرة", icon: '<path d="M8 4v9a4 4 0 0 0 8 0V4M8 8h8M12 17v3"/>' },
  { key: "exercises", href: "../03-exercises/index.html", label: "التمارين", icon: '<circle cx="12" cy="7" r="2.5"/><path d="M7 19h10M8 16c0-3 1.7-5 4-5s4 2 4 5"/>' },
  { key: "maqamat", href: "../04-maqamat-guide/index.html", label: "المقامات", icon: '<path d="M4 7h16M4 10h16M4 13h16M4 16h16"/><circle cx="9" cy="10" r="1.4"/><circle cx="15" cy="14" r="1.4"/>' },
  { key: "metronome", href: "../05-metronome/index.html", label: "المترونوم", icon: '<path d="M7 20h10l-2-15H9zM12 6l3 8M9 16h6"/>' },
  { key: "library", href: "../06-library-export/index.html", label: "المكتبة", icon: '<path d="M5 4h4v16H5zM10 6h4v14h-4zM15 3h4v17h-4z"/>' },
  { key: "teaching", href: "../08-teaching-guide/index.html", label: "الدليل", icon: '<path d="M4 5c3-1 5 0 8 2v12c-3-2-5-3-8-2zM20 5c-3-1-5 0-8 2v12c3-2 5-3 8-2z"/>' },
  { key: "about", href: "../09-about/index.html", label: "من نحن", icon: '<circle cx="8" cy="9" r="2.4"/><circle cx="16" cy="9" r="2.4"/><path d="M3 19c.5-3 2.2-4.5 5-4.5S12.5 16 13 19M11 19c.5-3 2.2-4.5 5-4.5s4.5 1.5 5 4.5"/>' },
];

export function mountNav(container, currentKey) {
  container.innerHTML = `
    <nav class="bottom-nav" dir="rtl" aria-label="تنقّل رئيسي">
      ${NAV_ITEMS.map((item) => `
        <a class="nav-item ${item.key === currentKey ? "active" : ""}"
           href="${item.href}"
           data-nav-key="${item.key}"
           ${item.key === currentKey ? 'aria-current="page"' : ""}>
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${item.icon}</svg>
          <span class="nav-label">${item.label}</span>
        </a>
      `).join("")}
    </nav>
  `;
}
