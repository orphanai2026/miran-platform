/**
 * metronome-ui-mini.js
 * نسخة مصغّرة/مدمجة للمترونوم داخل صفحة المعايرة (خريطة الصفحات، الصفحة #2).
 *
 * نفس المحرك تمامًا (MetronomeEngine) — فقط تشغيل سريع وBPM بسيط بلا تحكم
 * بالميزان (beatsPerMeasure ثابت = 4)، تماشيًا مع "نمط مترونوم إرشادي داخل
 * التسجيل" الموثّق في سجل القرارات (القسم 7، الصفحة #2).
 */
import { MetronomeEngine } from "./metronome-engine.js";
import { loadMetronomePrefs, saveMetronomePrefs } from "./metronome-prefs.js";

/**
 * @param {HTMLElement} container
 * @param {Object} [initialOptions] - للتفضيلات المحفوظة الأولوية على bpm الافتراضي هنا (لا على initialOptions.bpm صراحة إن مُرِّر).
 * @returns {{ engine: MetronomeEngine, destroy: () => void }}
 */
export function mountMiniMetronome(container, initialOptions = {}) {
  const savedPrefs = loadMetronomePrefs();
  const engine = new MetronomeEngine({ beatsPerMeasure: 4, ...initialOptions, ...(savedPrefs.bpm ? { bpm: savedPrefs.bpm } : {}) });

  container.innerHTML = `
    <div class="metronome-mini" dir="rtl">
      <button type="button" class="metronome-mini-toggle" aria-label="تشغيل/إيقاف المترونوم">▶</button>
      <input type="number" class="metronome-mini-bpm" min="30" max="240" value="${engine.bpm}" />
    </div>
  `;

  const toggleBtn = container.querySelector(".metronome-mini-toggle");
  const bpmInput = container.querySelector(".metronome-mini-bpm");

  bpmInput.addEventListener("change", () => {
    const bpm = Number(bpmInput.value);
    if (Number.isFinite(bpm) && bpm > 0) {
      engine.setBpm(bpm);
      saveMetronomePrefs({ bpm });
    } else {
      bpmInput.value = String(engine.bpm); // تراجع عن قيمة غير صالحة
    }
  });

  toggleBtn.addEventListener("click", () => {
    if (engine.isRunning) {
      engine.stop();
      toggleBtn.textContent = "▶";
    } else {
      engine.start();
      toggleBtn.textContent = "⏸";
    }
  });

  return {
    engine,
    destroy() {
      engine.stop();
      container.innerHTML = "";
    },
  };
}
