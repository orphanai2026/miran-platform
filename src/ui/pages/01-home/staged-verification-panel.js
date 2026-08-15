/**
 * staged-verification-panel.js
 * ============================================================
 * "الاختبار المرحلي" (القرار 9.3) — رصد اكتمال يوم منهج جديد يحمل نغمة
 * فعلية، إعادة تحقّق حي مستقلة (قراءات متتالية متفقة مع بعضها ومع مرجع
 * القرار)، والتقاط تلقائي كامل بلا أي زر حفظ يدوي عند اجتياز الشرط.
 *
 * بلا لمس `src/exercises/legacy-miran/` إطلاقًا — قراءة `localStorage`
 * مباشرة فقط (نفس نمط `home-page.js`)، ومحرك قياس مستقل بالكامل.
 */
import { detectPitch, centsBetween } from "../../../calibration/pitch-detector.js";
import { encodeWav, concatFloat32 } from "../../admin/expert-intake/wav-encoder.js";
import { readLegacyQararHz, targetHzForSemis } from "../../shared/legacy-calibration-reader.js";
import { CURRICULUM_NOTES_INDEX } from "../../shared/curriculum-notes-index.js";
import { putVerifiedSample, listVerifiedDayIds } from "../../shared/verified-samples-db.js";

const STAGED_VERIFY_PROGRESS_KEY = "miran_prog";
const CLARITY_THRESHOLD = 0.6;
const NEED_CONSECUTIVE = 3;
const MAX_CAPTURE_MS = 12000;

/** يقرأ معرّفات الأيام المكتملة مباشرة من localStorage الخام — بلا استيراد لملف محمي. */
function readCompletedDayIds() {
  try {
    const raw = localStorage.getItem(STAGED_VERIFY_PROGRESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed?.done ? Object.keys(parsed.done).map(Number) : [];
  } catch (e) {
    return [];
  }
}

/**
 * يبني لوحة الاختبار المرحلي داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountStagedVerificationPanel(container) {
  let audioCtx = null;
  let processor = null;
  let source = null;
  let micStream = null;
  let capturing = false;
  let chunks = [];
  let streakReadings = [];
  let captureTimeoutId = null;
  let currentEntry = null;

  async function findPendingEntry() {
    const completedIds = new Set(readCompletedDayIds());
    const verifiedIds = new Set(await listVerifiedDayIds());
    const candidates = CURRICULUM_NOTES_INDEX.filter((e) => completedIds.has(e.id) && !verifiedIds.has(e.id));
    candidates.sort((a, b) => a.id - b.id);
    return candidates[0] || null;
  }

  function renderIdle(message) {
    container.innerHTML = `<p class="staged-verify-idle">${message}</p>`;
  }

  function renderPrompt(entry) {
    container.innerHTML = `
      <div class="staged-verify-prompt">
        <p class="staged-verify-note">أتقنت نغمة <strong>${entry.targetLabel}</strong> في التمارين — أعد عزفها الآن للتأكيد.</p>
        <div class="staged-verify-live">—</div>
        <p class="staged-verify-status"></p>
        <div class="staged-verify-progress">
          ${Array.from({ length: NEED_CONSECUTIVE })
            .map((_, i) => `<span class="staged-verify-dot" data-dot="${i}"></span>`)
            .join("")}
        </div>
        <button type="button" class="btn-primary" id="stagedVerifyStartBtn">ابدأ إعادة العزف</button>
      </div>
    `;
    container.querySelector("#stagedVerifyStartBtn").addEventListener("click", () => startCapture(entry));
  }

  function updateDots() {
    const dots = container.querySelectorAll(".staged-verify-dot");
    dots.forEach((dot, i) => dot.classList.toggle("filled", i < streakReadings.length));
  }

  function updateLive(text, ok) {
    const el = container.querySelector(".staged-verify-live");
    if (!el) return;
    el.textContent = text;
    el.className = `staged-verify-live ${ok ? "ok" : ""}`;
  }

  function updateStatus(text) {
    const el = container.querySelector(".staged-verify-status");
    if (el) el.textContent = text;
  }

  async function ensureMic() {
    if (audioCtx) return;
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaStreamSource(micStream);
    processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => onAudioProcess(e.inputBuffer.getChannelData(0));
    source.connect(processor);
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    processor.connect(silentGain);
    silentGain.connect(audioCtx.destination);
  }

  function onAudioProcess(buf) {
    if (!capturing || !currentEntry) return;
    chunks.push(Float32Array.from(buf));

    const reading = detectPitch(buf, audioCtx.sampleRate);
    if (reading.rms < 0.006) return; // صمت — لا يكسر السلسلة، لا يُضاف

    const targetHz = targetHzForSemis(readLegacyQararHz(), currentEntry.targetSemis);
    const deviationCents = centsBetween(reading.hz || 0, targetHz);

    if (!reading.hz || reading.clarity < CLARITY_THRESHOLD || Math.abs(deviationCents) > currentEntry.toleranceCents) {
      streakReadings = [];
      updateDots();
      updateLive(reading.hz ? `${reading.hz.toFixed(1)} هرتز` : "—", false);
      updateStatus("غير مطابق بعد — استمر بثبات");
      return;
    }

    // يتفق مع الهدف — الآن نتحقق من الاتفاق مع بقية قراءات السلسلة الحالية (لا تذبذب).
    if (streakReadings.length > 0) {
      const streakAvg = streakReadings.reduce((s, v) => s + v, 0) / streakReadings.length;
      const spread = Math.abs(centsBetween(reading.hz, streakAvg));
      const consistencyBound = Math.max(8, currentEntry.toleranceCents / 2);
      if (spread > consistencyBound) {
        streakReadings = [reading.hz]; // إعادة بدء السلسلة من هذي القراءة بدل فشل كامل
        updateDots();
        updateLive(`${reading.hz.toFixed(1)} هرتز`, true);
        updateStatus("تذبذب — نبدأ العدّ من جديد");
        return;
      }
    }

    streakReadings.push(reading.hz);
    updateDots();
    updateLive(`${reading.hz.toFixed(1)} هرتز`, true);
    updateStatus(`مطابق (${streakReadings.length}/${NEED_CONSECUTIVE})`);

    if (streakReadings.length >= NEED_CONSECUTIVE) {
      finishCapture(true);
    }
  }

  async function startCapture(entry) {
    currentEntry = entry;
    streakReadings = [];
    chunks = [];
    capturing = false;

    try {
      await ensureMic();
    } catch (e) {
      updateStatus("تعذّر الوصول للميكروفون — تحقّق من الإذن.");
      return;
    }

    capturing = true;
    const startBtn = container.querySelector("#stagedVerifyStartBtn");
    if (startBtn) startBtn.disabled = true;
    updateStatus("جارٍ الاستماع…");
    captureTimeoutId = window.setTimeout(() => finishCapture(false), MAX_CAPTURE_MS);
  }

  async function finishCapture(success) {
    if (!capturing) return;
    capturing = false;
    if (captureTimeoutId) window.clearTimeout(captureTimeoutId);

    if (!success) {
      updateStatus("انتهى الوقت بلا تطابق كافٍ — أعد المحاولة.");
      const startBtn = container.querySelector("#stagedVerifyStartBtn");
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "أعد المحاولة";
      }
      return;
    }

    const samples = concatFloat32(chunks);
    const wavBlob = encodeWav(samples, audioCtx.sampleRate);
    const sorted = [...streakReadings].sort((a, b) => a - b);
    const measuredHz = sorted[Math.floor(sorted.length / 2)];

    await putVerifiedSample({
      dayId: currentEntry.id,
      targetLabel: currentEntry.targetLabel,
      measuredHz,
      wavBlob,
      capturedAtMs: Date.now(),
    });

    renderIdle(`تسجيل "${currentEntry.targetLabel}" اعتُمِد تلقائيًا. أحسنت!`);
    currentEntry = null;
    // نفحص وجود عنصر معلّق تالٍ بعد لحظة قصيرة، بلا مقاطعة رسالة النجاح فورًا.
    window.setTimeout(refresh, 2500);
  }

  async function refresh() {
    if (readLegacyQararHz() === null) {
      renderIdle("أكمل معايرة التمارين أولًا (من داخل التمارين نفسها) قبل ظهور أي اختبار مرحلي.");
      return;
    }
    const pending = await findPendingEntry();
    if (!pending) {
      renderIdle("لا يوجد اختبار مرحلي معلّق حاليًا — أكمل تمرينًا جديدًا في المنهج ليظهر هنا.");
      return;
    }
    renderPrompt(pending);
  }

  refresh();

  return {
    destroy() {
      if (processor) processor.disconnect();
      if (source) source.disconnect();
      if (micStream) micStream.getTracks().forEach((t) => t.stop());
      container.innerHTML = "";
    },
  };
}
