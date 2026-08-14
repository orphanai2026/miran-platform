/**
 * calibration-page.js
 * ============================================================
 * ربط فعلي لصفحة #2 (المعايرة الشخصية) بالمحركات الجاهزة:
 * - src/calibration/pitch-detector.js  (كشف النغمة)
 * - src/calibration/calibration-engine.js  (منطق القرارات 1-3)
 * - src/metronome/metronome-ui-mini.js  (إيقاع النفخ أثناء التسجيل)
 * - sample-store.js  (تخزين محلي جديد، لا علاقة له بالمعايرة القديمة)
 *
 * كود جديد بالكامل — لا يستورد ولا يعيد استخدام أي شيء من
 * legacy-calibration-do-not-reuse/old-calibration.js.
 */
import { detectPitch, centsBetween } from "../../../calibration/pitch-detector.js";
import { CalibrationSample, PersonalReferenceStore } from "../../../calibration/calibration-engine.js";
import { mountMiniMetronome } from "../../../metronome/metronome-ui-mini.js";
import { loadRawState, saveRawState } from "./sample-store.js";

const REGISTER_OPTIONS = [
  { value: "قرار", label: "قرار" },
  { value: "جواب", label: "جواب" },
  { value: "جواب الجواب", label: "جواب الجواب" },
];

// اقتراحات أسماء شائعة لحقل الإصبعة (datalist) — مجرد اقتراحات نصية عامة،
// وليست جدول إصبعات/ترددات فعلي (ذاك الجدول محمي داخل src/exercises/legacy-miran/).
const FINGERING_SUGGESTIONS = ["دو", "ري", "مي نصف بيمول", "فا", "صول", "لا", "سي نصف بيمول", "سي"];

const RECORD_WINDOW_MS = 2500; // مدة التقاط العيّنة الواحدة
const CLARITY_THRESHOLD = 0.86;
const FRAME_INTERVAL_MS = 32;

export function mountCalibrationPage(root) {
  const store = new PersonalReferenceStore();
  const raw = loadRawState();

  // إعادة بناء PersonalReferenceStore من الحالة المخزَّنة محليًا.
  for (const s of raw.samples) {
    try {
      store.addSample(new CalibrationSample(s));
    } catch (e) {
      // عيّنة تالفة (مثلًا من إصدار سابق) — تُتجاهل بصمت بدل كسر الصفحة.
    }
  }
  // مفاتيح snapshots/taughtNames مُخزَّنة كـ "إصبعة::سجل" (نفس بنية pitchKey
  // الداخلية في calibration-engine.js) — نمررها كما هي لـ restoreFrozenSnapshot
  // عبر تفكيكها هنا فقط لأن المفتاح الخام مُخزَّن مباشرة (fingering::register).
  for (const [key, snapshot] of Object.entries(raw.snapshots)) {
    const [fingering, register] = key.split("::");
    store.restoreFrozenSnapshot(fingering, register, snapshot);
  }
  for (const [key, name] of Object.entries(raw.taughtNames)) {
    const [fingering, register] = key.split("::");
    store.teachPitchName(fingering, register, name);
  }

  function persist() {
    saveRawState({
      samples: store.exportAllSamples(),
      snapshots: store.exportAllFrozenSnapshots(),
      taughtNames: store.exportAllTaughtNames(),
    });
  }

  root.innerHTML = `
    <div class="calib-page" dir="rtl">
      <h1>المعايرة الشخصية</h1>
      <p class="calib-sub">سجّل نغمتك عدة مرات لبناء مرجعك الشخصي (القرار 1: 15 محاولة على 3 أيام مختلفة للمبتدئ، أو جلسة واحدة أدق للمحترف).</p>

      <div class="calib-fields">
        <label>الإصبعة (اسم النغمة)
          <input type="text" id="calibFingering" list="fingeringSuggestions" placeholder="مثال: دو" value="دو" />
          <datalist id="fingeringSuggestions">
            ${FINGERING_SUGGESTIONS.map((n) => `<option value="${n}"></option>`).join("")}
          </datalist>
        </label>
        <label>السجل
          <select id="calibRegister">
            ${REGISTER_OPTIONS.map((r) => `<option value="${r.value}">${r.label}</option>`).join("")}
          </select>
        </label>
        <label>الملف الشخصي
          <select id="calibProfile">
            <option value="beginner">مبتدئ (15 محاولة/3 أيام)</option>
            <option value="professional">محترف (جلسة واحدة أدق)</option>
          </select>
        </label>
      </div>

      <div class="calib-metronome-mount"></div>

      <div class="calib-record-area">
        <button type="button" id="calibRecordBtn" class="btn-primary">سجّل عينة</button>
        <span id="calibLiveReadout" class="calib-live">—</span>
      </div>
      <p id="calibHint" class="calib-hint"></p>

      <div class="calib-status">
        <div id="calibSampleCount"></div>
        <div id="calibSuggestion"></div>
        <button type="button" id="calibApproveBtn" class="btn-secondary" hidden>اعتماد المرجع</button>
        <button type="button" id="calibTeachNameBtn" class="btn-secondary">اعتماد الاسم فقط (من عينة واحدة)</button>
        <div id="calibFrozen"></div>
      </div>
    </div>
  `;

  mountMiniMetronome(root.querySelector(".calib-metronome-mount"), { bpm: 70 });

  const fingeringInput = root.querySelector("#calibFingering");
  const registerSelect = root.querySelector("#calibRegister");
  const profileSelect = root.querySelector("#calibProfile");
  const recordBtn = root.querySelector("#calibRecordBtn");
  const liveReadout = root.querySelector("#calibLiveReadout");
  const hint = root.querySelector("#calibHint");
  const sampleCountEl = root.querySelector("#calibSampleCount");
  const suggestionEl = root.querySelector("#calibSuggestion");
  const approveBtn = root.querySelector("#calibApproveBtn");
  const teachNameBtn = root.querySelector("#calibTeachNameBtn");
  const frozenEl = root.querySelector("#calibFrozen");

  let audioCtx = null;
  let analyser = null;
  let micStream = null;
  let recording = false;

  function currentSelection() {
    return {
      fingering: fingeringInput.value.trim(),
      register: registerSelect.value,
      profile: profileSelect.value,
    };
  }

  function refreshStatus() {
    const { fingering, register, profile } = currentSelection();
    if (!fingering) {
      sampleCountEl.textContent = "";
      suggestionEl.textContent = "";
      approveBtn.hidden = true;
      frozenEl.textContent = "";
      return;
    }
    const samples = store.getSamples(fingering, register);
    const distinctDays = new Set(samples.map((s) => s.dayKey)).size;
    sampleCountEl.textContent = `عدد العينات: ${samples.length} — عدد الأيام المختلفة: ${distinctDays}`;

    const suggestion = store.suggestAdoption(fingering, register, profile);
    if (suggestion) {
      suggestionEl.textContent = `اقتراح: ${suggestion.suggestedPitchHz.toFixed(2)} هرتز، سماحية ±${suggestion.suggestedToleranceCents.toFixed(1)} سنت (${suggestion.sampleCount} عينة).`;
      approveBtn.hidden = false;
    } else {
      suggestionEl.textContent = "لم تكتمل شروط الاعتماد بعد.";
      approveBtn.hidden = true;
    }

    const frozen = store.getFrozenReference(fingering, register);
    if (frozen) {
      frozenEl.textContent = `المرجع المعتمد: ${frozen.pitchHz.toFixed(2)} هرتز، سماحية ±${frozen.toleranceCents.toFixed(1)} سنت.`;
    } else {
      frozenEl.textContent = "";
    }

    const taughtName = store.getTaughtName(fingering, register);
    if (taughtName) {
      hint.textContent = `اسم مُعتمَد سابقًا لهذه التركيبة: ${taughtName}`;
    }
  }

  fingeringInput.addEventListener("input", refreshStatus);
  registerSelect.addEventListener("change", refreshStatus);
  profileSelect.addEventListener("change", refreshStatus);

  async function ensureMic() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    if (analyser) return;
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const src = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
  }

  recordBtn.addEventListener("click", async () => {
    const { fingering, register } = currentSelection();
    if (!fingering) {
      hint.textContent = "اكتب اسم النغمة (الإصبعة) أولًا.";
      return;
    }
    if (recording) return;
    recording = true;
    recordBtn.disabled = true;
    hint.textContent = "…جارٍ تشغيل الميكروفون";

    try {
      await ensureMic();
    } catch (e) {
      hint.textContent = "تعذّر الوصول للميكروفون — تحقّق من الإذن.";
      recordBtn.disabled = false;
      recording = false;
      return;
    }

    hint.textContent = "انفخ الآن بثبات…";
    const buf = new Float32Array(analyser.fftSize);
    const readings = [];
    const startTime = performance.now();

    const frameLoop = () => {
      if (!recording) return;
      analyser.getFloatTimeDomainData(buf);
      const p = detectPitch(buf.slice(), audioCtx.sampleRate);
      if (p.hz && p.clarity >= CLARITY_THRESHOLD) {
        readings.push(p.hz);
        liveReadout.textContent = `${p.hz.toFixed(1)} هرتز`;
        liveReadout.className = "calib-live ok";
      }
      if (performance.now() - startTime >= RECORD_WINDOW_MS) {
        finishRecording();
        return;
      }
      setTimeout(frameLoop, FRAME_INTERVAL_MS);
    };

    function finishRecording() {
      recording = false;
      recordBtn.disabled = false;
      if (readings.length < 5) {
        hint.textContent = "لم أسمع نغمة ثابتة كافية — أعد المحاولة، انفخ بثبات أطول قليلًا.";
        liveReadout.textContent = "—";
        liveReadout.className = "calib-live";
        return;
      }
      readings.sort((a, b) => a - b);
      const median = readings[Math.floor(readings.length / 2)];
      // عرض السماحية الفعلي لهذه العينة تحديدًا (القرار 2): أقصى انحراف عن
      // الوسيط بين قراءات هذه النافذة نفسها، بالسنتات — وليس رقمًا مفروضًا.
      let maxDeviationCents = 0;
      for (const hz of readings) {
        const c = Math.abs(centsBetween(hz, median));
        if (c > maxDeviationCents) maxDeviationCents = c;
      }
      const toleranceCents = Math.max(maxDeviationCents, 1); // حد أدنى تقني بسيط لتفادي صفر

      try {
        const sample = new CalibrationSample({
          pitchHz: median,
          fingering,
          register,
          toleranceCents,
        });
        store.addSample(sample);
        persist();
        hint.textContent = `تم تسجيل عينة: ${median.toFixed(2)} هرتز.`;
        refreshStatus();
      } catch (e) {
        hint.textContent = `تعذّر حفظ العينة: ${e.message}`;
      }
    }

    frameLoop();
  });

  approveBtn.addEventListener("click", () => {
    const { fingering, register, profile } = currentSelection();
    try {
      store.approveReference(fingering, register, profile);
      persist();
      hint.textContent = "تم اعتماد المرجع.";
      refreshStatus();
    } catch (e) {
      hint.textContent = `تعذّر الاعتماد: ${e.message}`;
    }
  });

  teachNameBtn.addEventListener("click", () => {
    const { fingering, register } = currentSelection();
    if (!fingering) {
      hint.textContent = "اكتب اسم النغمة أولًا.";
      return;
    }
    // استثناء القرار 1: تعليم الاسم فقط، بلا حساب مرجع رقمي — لا يحتاج تسجيلًا صوتيًا.
    store.teachPitchName(fingering, register, fingering);
    persist();
    hint.textContent = `تم اعتماد الاسم "${fingering}" لهذه التركيبة.`;
    refreshStatus();
  });

  window.addEventListener("beforeunload", () => {
    recording = false;
    if (micStream) micStream.getTracks().forEach((t) => t.stop());
  });

  refreshStatus();
}
