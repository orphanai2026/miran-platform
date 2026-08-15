/**
 * local-user-id.js
 * ============================================================
 * معرّف المستخدم المحلي — تحصين بيانات مبكر من القسم 6 في سجل القرارات:
 * "بنية بيانات التقدّم تُصمَّم من اليوم الأول بحقل 'معرف مستخدم' فارغ/محلي
 * افتراضيًا (معرف عشوائي يُنشأ محليًا عند أول استخدام) — بحيث الربط
 * المستقبلي بحساب مركزي يصير 'ربط معرف موجود' لا 'إعادة بناء من الصفر'."
 *
 * هذا **ليس** فتحًا لقرار الحسابات/الاشتراكات الكامل (القسم 6 كله لا يزال
 * مؤجَّلًا بصراحة) — مجرد تحضير بيانات بسيط: معرّف عشوائي محلي، ثابت بمجرد
 * إنشائه، لا يتغيّر تلقائيًا. أيضًا هو "كود المزامنة" المذكور في وصف صفحة
 * #7 (القسم 7) — نفس المعرّف يُستخدم لاحقًا كرمز تعريف العازف في روابط
 * التصدير/الإرسال (القرار 4)، عند بناء نقطة الاستقبال على Cloudflare
 * (استثناء القرار 4، غير مبنية بعد).
 */

export const LOCAL_USER_ID_STORAGE_KEY = "miran_local_user_id_v1";

/** يولّد معرّفًا عشوائيًا — يفضّل crypto.randomUUID، مع بديل بسيط إن تعذّر. */
function generateId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // بديل بسيط لبيئات بلا crypto.randomUUID (نادر في المتصفحات الحديثة).
  return `miran-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * يرجع المعرّف المحلي الموجود، أو يُنشئ واحدًا جديدًا ويخزّنه إن لم يوجد بعد.
 * ثابت بمجرد الإنشاء — لا يتغيّر عبر استدعاءات لاحقة.
 * @returns {string}
 */
export function getOrCreateLocalUserId() {
  try {
    const existing = localStorage.getItem(LOCAL_USER_ID_STORAGE_KEY);
    if (existing) return existing;
    const fresh = generateId();
    localStorage.setItem(LOCAL_USER_ID_STORAGE_KEY, fresh);
    return fresh;
  } catch (e) {
    // التخزين قد يفشل (وضع خاص، حصة ممتلئة) — نرجع معرّفًا مؤقتًا لهذي الجلسة
    // فقط بدل كسر الصفحة، بلا محاولة حفظ.
    return generateId();
  }
}
