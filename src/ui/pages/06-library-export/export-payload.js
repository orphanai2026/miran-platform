/**
 * export-payload.js
 * ============================================================
 * منطق مشترك بين صفحة #6 (المكتبة/التصدير، تصدير يدوي بالتنزيل) وصفحة #7
 * (الإعدادات/المزامنة، إرسال تلقائي فعلي لنقطة استقبال Cloudflare —
 * استثناء القرار 4). استُخرج من صفحة #6 الأصلية لتفادي تكرار منطق إعادة
 * البناء وبناء حمولة التصدير في مكانين (مصدر حقيقة واحد، القسم 4).
 */
import { CalibrationSample, PersonalReferenceStore } from "../../../calibration/calibration-engine.js";
import { loadRawState } from "../02-calibration/sample-store.js";

/** يعيد بناء PersonalReferenceStore من الحالة المخزَّنة محليًا (نفس نمط calibration-page.js). */
export function rebuildStore() {
  const store = new PersonalReferenceStore();
  const raw = loadRawState();
  for (const s of raw.samples) {
    try {
      store.addSample(new CalibrationSample(s));
    } catch (e) {
      // عيّنة تالفة — تُتجاهل بصمت بدل كسر الصفحة (نفس منطق calibration-page.js).
    }
  }
  for (const [key, snapshot] of Object.entries(raw.snapshots)) {
    const [fingering, register] = key.split("::");
    store.restoreFrozenSnapshot(fingering, register, snapshot);
  }
  for (const [key, name] of Object.entries(raw.taughtNames)) {
    const [fingering, register] = key.split("::");
    store.teachPitchName(fingering, register, name);
  }
  return { store, raw };
}

/** كل تركيبات (إصبعة+سجل) الظاهرة في أي من: عينات، لقطات، أسماء مُعلَّمة. */
export function collectAllKeys(raw) {
  const keys = new Set();
  for (const s of raw.samples) keys.add(`${s.fingering}::${s.register}`);
  for (const k of Object.keys(raw.snapshots)) keys.add(k);
  for (const k of Object.keys(raw.taughtNames)) keys.add(k);
  return Array.from(keys).sort();
}

/** يبني حمولة التصدير — نفس البنية التي يتحقق منها worker.js (أرقام قياس فقط، القرار 4). */
export function buildExportPayload(store) {
  return {
    exportedAtMs: Date.now(),
    samples: store.exportAllSamples(),
    frozenSnapshots: store.exportAllFrozenSnapshots(),
    taughtNames: store.exportAllTaughtNames(),
  };
}
