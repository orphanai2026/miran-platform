# src/exercises/

تمارين مِران الأصلية (74 يومًا، 6 مستويات). تُنقل كأكواد كما هي من المستودع الأصلي —
لا تُعاد كتابتها من الصفر (قرار معماري، القسم 4). ملف واحد بلا خادم ولا اعتماديات،
مُختبر بانحدار Playwright كامل في الأصل.

## legacy-miran/

نسخة من مستودع مِران الأصلي (`github.com/orphanai2026/miran`)، منقولة كمرجع مصدري
محفوظ ثم **مُفكَّكة فعليًا** (انظر `SPLIT-NOTES.md`) دون أي تغيير سلوكي.

**✅ التفكيك تم بالكامل.** `index.html` كان يحوي كل الكود (منهج + محرك صوت + تمارين +
معايرة قديمة) داخل `<script>` واحد بطول 4255 سطرًا. الآن `index.html` هو غلاف HTML فقط،
يحمّل نفس الكود مقسّمًا على ملفات `<script src>` خارجية، **بنفس ترتيب التنفيذ الأصلي
حرفيًا** — لا تغيير سلوكي، فقط فصل فيزيائي. التفاصيل الكاملة (خرائط الأسطر، التحقق
البايتي، سبب الأمان) في `SPLIT-NOTES.md`.

| القسم | الوجهة | الحالة |
|---|---|---|
| `CURRICULUM (days as DATA)` | `js/curriculum-data.js` | ✅ محمي — جزء من قرار "بلا إعادة بناء" |
| `AUDIO + PITCH (validated engine)` | `js/audio-pitch-engine.js` | ✅ محمي |
| `SESSION`, `TRANSITION`, `EXCHANGE`, `BREATH`, `RHYTHM`, `RHYTHM-DROP` | `js/session.js`، `js/transition-exercise.js`، `js/exchange-exercise.js`، `js/breath-exercise.js`، `js/rhythm-exercise.js`، `js/rhythm-drop-exercise.js` | ✅ محمي |
| الدرويش، الحفظ المحلي، التوجيه، عرض الرئيسية، تصدير التقدّم، الإقلاع | `js/dervish-companion.js`، `js/persistence.js`، `js/view-routing.js`، `js/home-render.js`، `js/export-progress.js`، `js/boot.js` | ✅ محمي |
| `CALIBRATION` (القديم) | `legacy-calibration-do-not-reuse/old-calibration.js` | ⚠️ **معزول فيزيائيًا، لا يُعتمد كأساس** — لا يزال مُحمَّلاً ويعمل كما كان (شاشة المعايرة القديمة في الواجهة تحتاجه حاليًا)، لكنه في مجلد منفصل تمامًا يوضح أنه لا علاقة له بالمعايرة الجديدة في `src/calibration/` ولا يُبنى عليه أي شيء |

## اختبارات خط الأساس (tests/) — جاهزة الآن كشبكة أمان قبل أي تفكيك

`legacy-miran/tests/baseline-regression.test.mjs` — 9 اختبارات Playwright ناجحة
على الملف الأصلي غير المُعدَّل (تنقّل، عرض، بيانات — لا صوت فعلي). كُتبت لأن
المستودع الأصلي لا يحتوي فعليًا اختبارات Playwright رغم إشارة سجل القرارات لوجودها.
**أي تفكيك مستقبلي للملف يجب أن يمر بهذه الاختبارات دون تغيير.** تفاصيل كاملة،
بما فيها سلوكيات حقيقية اكتُشفت أثناء الكتابة (`btnCalibSeg`، `const` لا تُعرَض
على `window`)، موثّقة في `tests/README.md`.

الترخيص: محفوظ في `legacy-miran/LICENSE.md` — الحقوق الفكرية الكاملة للمالك الأصلي.
