/**
 * expert-id.js
 * ============================================================
 * معرّف الخبير المحلي — نفس نمط `getOrCreateLocalUserId()` في
 * `src/ui/pages/07-settings-sync/local-user-id.js` حرفيًا، بمفتاح تخزين
 * مختلف عمدًا (هوية الخبير مفهوم منفصل عن هوية المتدرب، حتى لو على نفس
 * الجهاز فعليًا — لا يوجد استيراد مشترك لأن الفرق دلاليّ لا تقنيّ فقط).
 * القرار 9.4 في سجل القرارات.
 */

export const EXPERT_ID_STORAGE_KEY = "miran_expert_id_v1";

function generateId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `expert-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * يرجع معرّف الخبير المحلي الموجود، أو يُنشئ واحدًا جديدًا ويخزّنه إن لم يوجد.
 * @returns {string}
 */
export function getOrCreateExpertId() {
  try {
    const existing = localStorage.getItem(EXPERT_ID_STORAGE_KEY);
    if (existing) return existing;
    const fresh = generateId();
    localStorage.setItem(EXPERT_ID_STORAGE_KEY, fresh);
    return fresh;
  } catch (e) {
    return generateId();
  }
}
