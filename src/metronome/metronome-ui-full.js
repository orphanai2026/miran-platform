/**
 * metronome-ui-full.js
 * الواجهة الكاملة للمترونوم (خريطة الصفحات، الصفحة #5).
 *
 * لا تحتوي أي منطق توقيت — تستدعي MetronomeEngine فقط وتعرض النتيجة.
 * هذا يضمن مصدر الحقيقة الواحد للكود (القسم 7): نفس الدقة، نفس السلوك،
 * في كل مكان يُستخدم فيه المترونوم.
 */
import { MetronomeEngine } from "./metronome-engine.js";
import { loadMetronomePrefs, saveMetronomePrefs } from "./metronome-prefs.js";

/**
 * يبني واجهة مترونوم كاملة داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 * @param {Object} [initialOptions] - يُمرَّر مباشرة إلى MetronomeEngine (له الأولوية على التفضيلات المحفوظة).
 * @returns {{ engine: MetronomeEngine, destroy: () => void }}
 */
export function mountFullMetronome(container, initialOptions = {}) {
  const savedPrefs = loadMetronomePrefs();
  const engine = new MetronomeEngine({ ...savedPrefs, ...initialOptions });

  container.innerHTML = `
    <div class="metronome-full" dir="rtl">
      <div class="metronome-bpm-display">
        <span class="metronome-bpm-value">${engine.bpm}</span>
        <span class="metronome-bpm-label">نبضة/دقيقة</span>
      </div>
      <input type="range" class="metronome-bpm-slider" min="30" max="240" step="1" value="${engine.bpm}" />
      <div class="metronome-beats-control">
        <label>عدد النبضات بالميزان</label>
        <select class="metronome-beats-select">
          <option value="2" ${engine.beatsPerMeasure === 2 ? "selected" : ""}>2</option>
          <option value="3" ${engine.beatsPerMeasure === 3 ? "selected" : ""}>3</option>
          <option value="4" ${engine.beatsPerMeasure === 4 ? "selected" : ""}>4</option>
          <option value="6" ${engine.beatsPerMeasure === 6 ? "selected" : ""}>6</option>
        </select>
      </div>
      <div class="metronome-beat-indicators"></div>
      <button type="button" class="metronome-toggle">ابدأ</button>
    </div>
  `;

  const bpmValueEl = container.querySelector(".metronome-bpm-value");
  const bpmSliderEl = container.querySelector(".metronome-bpm-slider");
  const beatsSelectEl = container.querySelector(".metronome-beats-select");
  const indicatorsEl = container.querySelector(".metronome-beat-indicators");
  const toggleBtn = container.querySelector(".metronome-toggle");

  function renderIndicators() {
    indicatorsEl.innerHTML = "";
    for (let i = 0; i < engine.beatsPerMeasure; i++) {
      const dot = document.createElement("span");
      dot.className = "metronome-beat-dot";
      dot.dataset.beatIndex = String(i);
      indicatorsEl.appendChild(dot);
    }
  }
  renderIndicators();

  const unsubscribe = engine.onBeat((beatIndex, isAccent) => {
    const dots = indicatorsEl.querySelectorAll(".metronome-beat-dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === beatIndex);
      dot.classList.toggle("accent", i === beatIndex && isAccent);
    });
  });

  bpmSliderEl.addEventListener("input", () => {
    const bpm = Number(bpmSliderEl.value);
    engine.setBpm(bpm);
    bpmValueEl.textContent = String(bpm);
    saveMetronomePrefs({ bpm });
  });

  beatsSelectEl.addEventListener("change", () => {
    const beatsPerMeasure = Number(beatsSelectEl.value);
    engine.setBeatsPerMeasure(beatsPerMeasure);
    renderIndicators();
    saveMetronomePrefs({ beatsPerMeasure });
  });

  toggleBtn.addEventListener("click", () => {
    if (engine.isRunning) {
      engine.stop();
      toggleBtn.textContent = "ابدأ";
    } else {
      engine.start();
      toggleBtn.textContent = "أوقف";
    }
  });

  return {
    engine,
    destroy() {
      engine.stop();
      unsubscribe();
      container.innerHTML = "";
    },
  };
}
