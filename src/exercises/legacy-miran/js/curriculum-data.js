/* ================= CURRICULUM (days as DATA) =================
   semis = semitones above the qarar (دو). playable long-tone days
   are built now; later days are stars awaiting their exercises. */

/* ═══════════ NEY FINGERING TABLE · Arabic Dūkāh (D) ney ═══════════
   Confirmed with the player. 6 front holes (indexed 1..6 from the mouth
   down) + 1 thumb hole on the back.
   Hole value = FRACTION STILL COVERED: 1 closed · 0 open · 0.5/0.75 partial.
   Same hole patterns serve all three registers — only breath pressure and
   lip angle change. Registers overlap on purpose (twin fingerings let a
   player check the ney's internal tuning).
   PENDING (his own recordings, not documented in any source):
     • المبحوحة   — breathy sub-fundamental, sits BEFORE قرار
     • قرار القرار — the register below the standard qarar
   Both will simply be prepended to REGISTERS[]; nothing else changes.
   semis = semitones above qarar, so a note's pitch = qararHz * 2^(semis/12)  */
const REGISTERS=[
 {key:'قرار', notes:[
  {ar:'دو',           lat:'C',    semis:0,    kind:'base',  front:[1,1,1,1,1,1],    thumb:1},
  {ar:'دو دييز',       lat:'C♯',   semis:1,    kind:'sharp', front:[1,1,1,1,1,0.75], thumb:1, flagged:true},
  {ar:'ري',           lat:'D',    semis:2,    kind:'base',  front:[1,1,1,1,1,0],    thumb:1},
  {ar:'مي بيمول',      lat:'E♭',   semis:3,    kind:'flat',  front:[1,1,1,1,0,0],    thumb:1},
  {ar:'مي نصف بيمول',  lat:'E½♭',  semis:3.5,  kind:'half',  front:[1,1,1,0,1,0],    thumb:1},
  {ar:'مي',           lat:'E',    semis:4,    kind:'base',  front:[1,1,1,0.5,0,0],  thumb:1, hard:true, flagged:true},
  {ar:'فا',           lat:'F',    semis:5,    kind:'base',  front:[1,1,0,0,0,0],    thumb:1},
  {ar:'فا دييز',       lat:'F♯',   semis:6,    kind:'sharp', front:[1,0,0,0,0,0],    thumb:1},
  {ar:'صول',          lat:'G',    semis:7,    kind:'base',  front:[0,0,0,0,0,0],    thumb:1, twin:'يساوي صول الجواب'}
 ]},
 {key:'جواب', notes:[
  {ar:'صول',          lat:'G',    semis:7,    kind:'base',  front:[1,1,1,1,1,1],    thumb:1, twin:'يساوي صول القرار'},
  {ar:'لا بيمول',      lat:'A♭',   semis:8,    kind:'flat',  front:[1,1,1,1,1,0.75], thumb:1, hard:true, flagged:true},
  {ar:'لا نصف بيمول',  lat:'A½♭',  semis:8.5,  kind:'half',  front:[1,1,1,1,1,0.5],  thumb:1},
  {ar:'لا',           lat:'A',    semis:9,    kind:'base',  front:[1,1,1,1,1,0],    thumb:1},
  {ar:'سي بيمول',      lat:'B♭',   semis:10,   kind:'flat',  front:[1,1,1,1,0,0],    thumb:1},
  {ar:'سي نصف بيمول',  lat:'B½♭',  semis:10.5, kind:'half',  front:[1,1,1,0,0,0],    thumb:1},
  {ar:'سي',           lat:'B',    semis:11,   kind:'base',  front:[1,1,1,0.5,0,0],  thumb:1, hard:true, flagged:true},
  {ar:'دو',           lat:'C',    semis:12,   kind:'base',  front:[1,1,0,0,0,0],    thumb:1, twin:'يساوي دو جواب الجواب'},
  {ar:'دو دييز',       lat:'C♯',   semis:13,   kind:'sharp', front:[1,0,0,0,0,0],    thumb:1},
  {ar:'ري',           lat:'D',    semis:14,   kind:'base',  front:[0,0,0,0,0,0],    thumb:1}
 ]},
 {key:'جواب الجواب', notes:[
  {ar:'دو',           lat:'C',    semis:12,   kind:'base',  front:[1,1,1,1,1,1],    thumb:1, twin:'يساوي دو الجواب'},
  {ar:'ري',           lat:'D',    semis:14,   kind:'base',  front:[1,1,1,1,1,0],    thumb:1},
  {ar:'مي بيمول',      lat:'E♭',   semis:15,   kind:'flat',  front:[1,1,1,1,0,0],    thumb:1},
  {ar:'مي نصف بيمول',  lat:'E½♭',  semis:15.5, kind:'half',  front:[1,1,1,0,1,0],    thumb:1},
  {ar:'فا',           lat:'F',    semis:17,   kind:'base',  front:[1,1,0,0,0,0],    thumb:1},
  {ar:'صول',          lat:'G',    semis:19,   kind:'base',  front:[0,0,0,0,0,0],    thumb:1}
 ]}
];
/* find the fingering for a curriculum note, matching by semitone distance
   from qarar. Falls back to null so nothing breaks if a note isn't listed. */
function fingeringFor(semis, preferReg){
  if(semis==null) return null;
  const order = preferReg!=null ? [preferReg,0,1,2] : [0,1,2];
  for(const r of order){ const R=REGISTERS[r]; if(!R) continue;
    const hit=R.notes.find(n=>Math.abs(n.semis-semis)<0.01);
    if(hit) return {note:hit, reg:R.key};
  }
  return null;
}

const CURRICULUM=[
  /* reordered per explicit design requirement: ALL adjacent-octave-pair longtones,
     then all adjacent transitions, then all adjacent exchanges, in strict ascending
     pitch order — no skip-interval training until every adjacent pair is mastered. */
  {"id": 1, "subcat": "core", "level": 2, "note": "دو", "lat": "C", "semis": 0, "kind": "longtone", "targetSec": 8, "tol": 20, "stabMax": 15, "need": 7, "durLadder": [3, 5, 8], "stabMult": [1.8, 1.3, 1], "rungNeed": [2, 2, 7], "title": "نغمة القرار الطويلة", "blurb": "ابدأ بثلاث ثوانٍ فقط، وترتفع المدة تدريجيًا حتى ٨ ثوانٍ بصوتٍ صافٍ."},
  {"id": 2, "subcat": "core", "level": 2, "note": "ري", "lat": "D", "semis": 2, "kind": "longtone", "targetSec": 9, "tol": 20, "stabMax": 15, "need": 7, "durLadder": [4, 6, 9], "stabMult": [1.7, 1.3, 1], "rungNeed": [2, 2, 7], "title": "نغمة ري الطويلة", "blurb": "أضف نغمة ري (الثقب الأول)، وترتفع المدة تدريجيًا حتى ٩ ثوانٍ."},
  {"id": 3, "subcat": "core", "level": 2, "note": "مي نصف بيمول", "lat": "E½♭", "semis": 3.5, "kind": "longtone", "targetSec": 9, "tol": 26, "stabMax": 18, "need": 7, "durLadder": [4, 6, 9], "stabMult": [1.6, 1.25, 1], "rungNeed": [2, 2, 7], "title": "نغمة مي نصف بيمول", "blurb": "أول ربع صوت في مسارك — بين ري وفا بالضبط. استمع جيدًا قبل النفخ."},
  {"id": 4, "subcat": "core", "level": 2, "note": "فا", "lat": "F", "semis": 5, "kind": "longtone", "targetSec": 9, "tol": 20, "stabMax": 15, "need": 7, "durLadder": [4, 6, 9], "stabMult": [1.7, 1.3, 1], "rungNeed": [2, 2, 7], "title": "نغمة فا الطويلة", "blurb": "انتقل إلى فا، وترتفع المدة تدريجيًا حتى ٩ ثوانٍ دون اهتزاز."},
  {"id": 5, "subcat": "core", "level": 2, "note": "صول", "lat": "G", "semis": 7, "kind": "longtone", "targetSec": 10, "tol": 20, "stabMax": 16, "need": 7, "durLadder": [4, 7, 10], "stabMult": [1.7, 1.25, 1], "rungNeed": [2, 2, 7], "title": "نغمة صول الطويلة", "blurb": "أعلى نغمات القرار — ترتفع المدة تدريجيًا حتى ١٠ ثوانٍ بصوتٍ نقيّ."},
  {"id": 6, "subcat": "core", "level": 2, "note": "صول", "lat": "G", "semis": 7, "kind": "longtone", "targetSec": 9, "tol": 13, "stabMax": 14, "need": 7, "durLadder": [4, 6, 9], "stabMult": [1.6, 1.25, 1], "rungNeed": [2, 2, 7], "title": "صول — تثبيت مركَّز", "blurb": "صول تحديدًا تميل للانخفاض عندك — هامش أضيق هنا يبني دعم نفَس أدقّ قبل المتابعة."},
  {"id": 7, "subcat": "core", "level": 2, "note": "لا", "lat": "A", "semis": 9, "kind": "longtone", "targetSec": 10, "tol": 18, "stabMax": 15, "need": 7, "durLadder": [5, 7, 10], "stabMult": [1.6, 1.25, 1], "rungNeed": [2, 2, 7], "title": "نغمة لا الطويلة", "blurb": "أول نغمة خارج ما أتقنته — امتداد المدى يبدأ هنا."},
  {"id": 8, "subcat": "core", "level": 2, "note": "سي نصف بيمول", "lat": "B½♭", "semis": 10.5, "kind": "longtone", "targetSec": 9, "tol": 26, "stabMax": 18, "need": 7, "durLadder": [4, 6, 9], "stabMult": [1.6, 1.25, 1], "rungNeed": [2, 2, 7], "title": "نغمة سي نصف بيمول", "blurb": "ربع صوت آخر — مختلفة تمامًا عن سي بيمول الكاملة التي أتقنتها. استمع جيدًا للفرق."},
  {"id": 9, "subcat": "core", "level": 2, "note": "دو الجواب", "lat": "C5", "semis": 12, "kind": "longtone", "targetSec": 10, "tol": 18, "stabMax": 15, "need": 7, "durLadder": [5, 7, 10], "stabMult": [1.6, 1.25, 1], "rungNeed": [2, 2, 7], "title": "نغمة دو الجواب الطويلة", "blurb": "أوكتاف كامل فوق دو القرار — إغلاق المرحلة الأولى من امتداد المدى."},
  {"id": 10, "subcat": "shapes", "level": 3, "note": "♩", "lat": "", "kind": "rhythm", "beats": 6, "beatSec": 1.1, "beatMin": 1.1, "beatStart": 1.7, "stepDownBeat": 0.3, "tolLadder": [420, 360, 300], "rungNeed": [2, 2, 7], "need": 7, "title": "الإيقاع الأساسي: تابع النبضة", "blurb": "قبل أن تُطلَب منك مزامنة نغمتين معًا، تعرّف على الشعور بالنبضة وحدها — أيّ صوت قصير يكفي، لا طبقة محدَّدة."},
  {"id": 11, "subcat": "core", "level": 2, "note": "دو→ري", "lat": "C→D", "kind": "transition", "from": {"note": "دو", "lat": "C", "semis": 0}, "to": {"note": "ري", "lat": "D", "semis": 2}, "tol": 25, "need": 7, "tolLadder": [45, 35, 25], "gapLadder": [0.7, 0.55, 0.45], "holdFromLadder": [4.5, 3.2, 2.2], "holdToLadder": [4.5, 3.4, 2.6], "rungNeed": [2, 2, 7], "title": "الانتقال: دو ← ري", "blurb": "ابدأ بهامش واسع يضيق تدريجيًا، حتى الانتقال النظيف الكامل إلى ري."},
  {"id": 12, "subcat": "core", "note": "ري→مي نصف بيمول", "lat": "D→E½♭", "level": 2, "kind": "transition", "from": {"note": "ري", "lat": "D", "semis": 2}, "to": {"note": "مي نصف بيمول", "lat": "E½♭", "semis": 3.5}, "tol": 28, "need": 7, "tolLadder": [46, 38, 28], "gapLadder": [0.6, 0.5, 0.4], "holdFromLadder": [4, 3, 2.2], "holdToLadder": [4, 3.2, 2.4], "rungNeed": [2, 2, 7], "title": "الانتقال: ري ← مي نصف بيمول", "blurb": "فاصلة ضيقة (ربع صوت فقط) — انتقال دقيق يحتاج أذنًا متيقّظة."},
  {"id": 13, "subcat": "core", "level": 2, "note": "مي نصف بيمول→فا", "lat": "E½♭→F", "kind": "transition", "from": {"note": "مي نصف بيمول", "lat": "E½♭", "semis": 3.5}, "to": {"note": "فا", "lat": "F", "semis": 5}, "tol": 26, "need": 7, "tolLadder": [44, 36, 26], "gapLadder": [0.6, 0.5, 0.4], "holdFromLadder": [4, 3, 2.2], "holdToLadder": [4, 3.2, 2.4], "rungNeed": [2, 2, 7], "title": "الانتقال: مي نصف بيمول ← فا", "blurb": "يُكمل التسلسل المتجاور — من ربع الصوت إلى فا مباشرة."},
  {"id": 14, "subcat": "core", "level": 2, "note": "فا→صول", "lat": "F→G", "kind": "transition", "from": {"note": "فا", "lat": "F", "semis": 5}, "to": {"note": "صول", "lat": "G", "semis": 7}, "tol": 25, "need": 7, "tolLadder": [45, 35, 25], "gapLadder": [0.7, 0.55, 0.45], "holdFromLadder": [4.5, 3.2, 2.2], "holdToLadder": [4.5, 3.4, 2.6], "rungNeed": [2, 2, 7], "title": "الانتقال: فا ← صول", "blurb": "ابدأ بهامش واسع يضيق تدريجيًا، حتى الانتقال النظيف الكامل إلى صول."},
  {"id": 15, "subcat": "core", "level": 2, "note": "صول→لا", "lat": "G→A", "kind": "transition", "from": {"note": "صول", "lat": "G", "semis": 7}, "to": {"note": "لا", "lat": "A", "semis": 9}, "tol": 22, "need": 7, "tolLadder": [40, 32, 22], "gapLadder": [0.6, 0.5, 0.4], "holdFromLadder": [4, 3, 2.2], "holdToLadder": [4, 3.2, 2.4], "rungNeed": [2, 2, 7], "title": "الانتقال: صول ← لا", "blurb": "نفس منطق الانتقالات السابقة، بنغمة جديدة."},
  {"id": 16, "subcat": "core", "note": "لا→سي نصف بيمول", "lat": "A→B½♭", "level": 2, "kind": "transition", "from": {"note": "لا", "lat": "A", "semis": 9}, "to": {"note": "سي نصف بيمول", "lat": "B½♭", "semis": 10.5}, "tol": 28, "need": 7, "tolLadder": [46, 38, 28], "gapLadder": [0.6, 0.5, 0.4], "holdFromLadder": [4, 3, 2.2], "holdToLadder": [4, 3.2, 2.4], "rungNeed": [2, 2, 7], "title": "الانتقال: لا ← سي نصف بيمول", "blurb": "فاصلة ربع صوت مرّة أخرى — قارن إحساسها بالانتقال السابق."},
  {"id": 17, "subcat": "core", "level": 2, "note": "سي نصف بيمول→دو الجواب", "lat": "B½♭→C5", "kind": "transition", "from": {"note": "سي نصف بيمول", "lat": "B½♭", "semis": 10.5}, "to": {"note": "دو الجواب", "lat": "C5", "semis": 12}, "tol": 26, "need": 7, "tolLadder": [44, 36, 26], "gapLadder": [0.6, 0.5, 0.4], "holdFromLadder": [4, 3, 2.2], "holdToLadder": [4, 3.2, 2.4], "rungNeed": [2, 2, 7], "title": "الانتقال: سي نصف بيمول ← دو الجواب", "blurb": "الحلقة الأخيرة — إغلاق الأوكتاف الكامل بربع الصوت الصحيح."},
  {"id": 18, "subcat": "speed", "level": 3, "note": "دو⇄ري", "lat": "C⇄D", "kind": "exchange", "from": {"note": "دو", "lat": "C", "semis": 0}, "to": {"note": "ري", "lat": "D", "semis": 2}, "tol": 25, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: دو⇄ري مع المترونوم", "blurb": "انتقل مع كل نبضة — دو، ري، دو، ري، دو."},
  {"id": 19, "subcat": "core", "note": "ري⇄مي نصف بيمول", "lat": "D⇄E½♭", "level": 2, "kind": "exchange", "from": {"note": "ري", "lat": "D", "semis": 2}, "to": {"note": "مي نصف بيمول", "lat": "E½♭", "semis": 3.5}, "tol": 28, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: ري⇄مي نصف بيمول", "blurb": "انتقل مع كل نبضة — ري، مي نصف بيمول، ري، مي نصف بيمول."},
  {"id": 20, "subcat": "core", "level": 2, "note": "مي نصف بيمول⇄فا", "lat": "E½♭⇄F", "kind": "exchange", "from": {"note": "مي نصف بيمول", "lat": "E½♭", "semis": 3.5}, "to": {"note": "فا", "lat": "F", "semis": 5}, "tol": 26, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: مي نصف بيمول⇄فا", "blurb": "انتقل مع كل نبضة — مي نصف بيمول، فا، مي نصف بيمول، فا."},
  {"id": 21, "subcat": "speed", "level": 3, "note": "فا⇄صول", "lat": "F⇄G", "kind": "exchange", "from": {"note": "فا", "lat": "F", "semis": 5}, "to": {"note": "صول", "lat": "G", "semis": 7}, "tol": 25, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: فا⇄صول مع المترونوم", "blurb": "انتقل مع كل نبضة — فا، صول، فا، صول، فا."},
  {"id": 22, "subcat": "speed", "level": 3, "note": "صول⇄لا", "lat": "G⇄A", "kind": "exchange", "from": {"note": "صول", "lat": "G", "semis": 7}, "to": {"note": "لا", "lat": "A", "semis": 9}, "tol": 22, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: صول⇄لا مع المترونوم", "blurb": "انتقل مع كل نبضة — صول، لا، صول، لا، صول."},
  {"id": 23, "subcat": "core", "note": "لا⇄سي نصف بيمول", "lat": "A⇄B½♭", "level": 2, "kind": "exchange", "from": {"note": "لا", "lat": "A", "semis": 9}, "to": {"note": "سي نصف بيمول", "lat": "B½♭", "semis": 10.5}, "phaseFinale": true, "tol": 28, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: لا⇄سي نصف بيمول — الأكتاف الأساسي مكتمل", "blurb": "إتقان هذا يعني: الأكتاف الكامل (دو-ري-مي½ب-فا-صول-لا-سي½ب-دو) تحت إصبعك بثقة."},
  {"id": 24, "subcat": "core", "level": 2, "note": "سي نصف بيمول⇄دو الجواب", "lat": "B½♭⇄C5", "kind": "exchange", "from": {"note": "سي نصف بيمول", "lat": "B½♭", "semis": 10.5}, "to": {"note": "دو الجواب", "lat": "C5", "semis": 12}, "tol": 26, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "phaseFinale": true, "title": "التبادل: سي نصف بيمول⇄دو الجواب — الأوكتاف الكامل بأزواجه المتجاورة", "blurb": "إتقان هذا يعني: كل زوج متجاور في الأوكتاف الكامل مُتقَن، بلا أي قفزة."},
  {"id": 25, "subcat": "core", "level": 2, "note": "دو", "lat": "C", "semis": 0, "kind": "longtone", "targetSec": 6, "tol": 20, "stabMax": 16, "need": 3, "review": true, "title": "مراجعة متباعدة: دو", "blurb": "عُد إلى نغمة القرار الأولى بلا مساعدة — هل ما زالت راسخة؟"},
  {"id": 26, "subcat": "speed", "level": 3, "note": "دو⇄ري", "lat": "C⇄D", "kind": "exchange", "from": {"note": "دو", "lat": "C", "semis": 0}, "to": {"note": "ري", "lat": "D", "semis": 2}, "tol": 25, "need": 7, "beatSec": 0.85, "beatStart": 0.85, "beatMin": 0.55, "stepDown": 0.07, "stepUp": 0.1, "reps": 4, "consolidate": true, "title": "يوم تثبيت: دو⇄ري", "blurb": "ثبّت ما أتقنته — بلا شرح جديد، تكرارٌ يرسّخ."},
  {"id": 27, "subcat": "core", "level": 2, "note": "دو→ري", "lat": "C→D", "kind": "transition", "from": {"note": "دو", "lat": "C", "semis": 0}, "to": {"note": "ري", "lat": "D", "semis": 2}, "tol": 25, "need": 1, "testMode": true, "title": "يوم اختبار: دو ← ري", "blurb": "محاولة واحدة، بلا تلميح افتتاحي. أرِني ما تتقنه فعلًا."},
  {"id": 28, "subcat": "speed", "level": 3, "note": "دو⇄ري", "lat": "C⇄D", "kind": "exchange", "from": {"note": "دو", "lat": "C", "semis": 0}, "to": {"note": "ري", "lat": "D", "semis": 2}, "tol": 25, "need": 7, "beatSec": 0.85, "beatStart": 0.85, "beatMin": 0.5, "stepDown": 0.08, "stepUp": 0.1, "reps": 4, "phaseFinale": true, "title": "أداء تأسيسي", "blurb": "اختم مرحلة تأسيس الصوت بأداء واحد متصل."},
  {"id": 29, "subcat": "shapes", "level": 3, "note": "♩", "lat": "", "kind": "rhythm", "beats": 8, "beatSec": 1, "beatMin": 1, "beatStart": 1.5, "stepDownBeat": 0.25, "tolLadder": [320, 260, 220], "rungNeed": [2, 2, 7], "need": 7, "phaseStart": true, "title": "الإيقاع: المتابعة مع النبضة", "blurb": "اعزف نغمة قصيرة مع كل نبضة — الدقة في التوقيت لا الطبقة."},
  {"id": 30, "subcat": "shapes", "level": 3, "note": "♩·", "lat": "", "kind": "rhythmdrop", "beats": 8, "beatSec": 1, "tolMs": 260, "dropLadder": [[4], [3, 6], [1, 3, 5, 7]], "rungNeed": [2, 2, 7], "need": 7, "title": "الإيقاع: حذف النبضات", "blurb": "استمرّ على النبضة حتى حين تختفي — ابنِ إيقاعك الداخلي لا اعتمادك على السمع."},
  {"id": 31, "subcat": "shapes", "level": 3, "note": "♪♪", "lat": "", "kind": "rhythm", "beats": 6, "beatSec": 1.2, "beatMin": 1.2, "beatStart": 1.9, "stepDownBeat": 0.35, "sub": 2, "tolLadder": [440, 380, 320], "rungNeed": [2, 2, 7], "need": 7, "title": "تقسيم الضربة: نغمتان لكل نبضة", "blurb": "نغمة عند بداية كل نبضة، وأخرى عند منتصفها بالضبط — نفس نبضك المُتقَن، بدقّة مضاعفة."},
  {"id": 32, "subcat": "shapes", "level": 3, "note": "♪♪·", "lat": "", "kind": "rhythm", "beats": 8, "beatSec": 1, "beatMin": 1, "beatStart": 1.5, "stepDownBeat": 0.25, "sub": 2, "tolLadder": [340, 280, 230], "rungNeed": [2, 2, 7], "need": 7, "title": "تقسيم الضربة: تثبيت", "blurb": "نفس التقسيم، بسرعة أقرب لسرعتك المعتادة — ثبّته حتى يصير بديهيًّا."},
  {"id": 33, "subcat": "shapes", "level": 3, "kind": "sustainRhythm", "beats": 2, "beatSec": 1, "holdTolMs": 280, "need": 7, "title": "النغمة الممتدّة: تا-آه", "blurb": "ابدأ نفَسك مع النبضة الأولى، واستمرّ بلا انقطاع حتى نهاية الثانية بالضبط."},
  {"id": 34, "subcat": "shapes", "level": 3, "kind": "sustainRhythm", "beats": 4, "beatSec": 0.9, "holdTolMs": 320, "need": 7, "title": "النغمة الممتدّة: تا-آه-آه-آه", "blurb": "أربع نبضات كاملة بنفَس واحد متّصل، من البداية للنهاية بلا أي انقطاع."},
  {"id": 35, "level": 4, "kind": "tongue", "beats": 6, "beatSec": 1.1, "tolLadder": [420, 360, 300], "minGapMs": 35, "maxGapMs": 160, "rungNeed": [2, 2, 7], "need": 7, "title": "النقر: تقديم", "blurb": "نغمة واحدة، لكن انقرها بلسانك بدل نفخة واحدة ممتدّة — نفَس مستمرّ، ولسان يفصل."},
  {"id": 36, "level": 4, "kind": "tongue", "beats": 8, "beatSec": 0.85, "tolLadder": [340, 280, 230], "minGapMs": 30, "maxGapMs": 130, "rungNeed": [2, 2, 7], "need": 7, "title": "النقر: تثبيت", "blurb": "نفس النقر، أسرع وأدقّ — حتى يصير لمسة لسان طبيعية لا تفكيرًا واعيًا."},
  {"id": 37, "subcat": "shapes", "level": 3, "note": "♬♬", "lat": "", "kind": "rhythm", "beats": 4, "beatSec": 1.4, "beatMin": 1.4, "beatStart": 2.2, "stepDownBeat": 0.4, "sub": 4, "tolLadder": [460, 400, 340], "rungNeed": [2, 2, 7], "need": 7, "title": "تقسيم الضربة: أربع نغمات (توكو-توكو)", "blurb": "أربع نغمات قصيرة متساوية في كل نبضة — توكو-توكو، توكو-توكو."},
  {"id": 38, "subcat": "shapes", "level": 3, "note": "♬♬·", "lat": "", "kind": "rhythm", "beats": 6, "beatSec": 1.1, "beatMin": 1.1, "beatStart": 1.8, "stepDownBeat": 0.35, "sub": 4, "tolLadder": [360, 300, 250], "rungNeed": [2, 2, 7], "need": 7, "title": "تقسيم الضربة: أربع نغمات — تثبيت", "blurb": "نفس التقسيم الرباعي، بسرعة أقرب لسرعتك المعتادة."},
  {"id": 39, "subcat": "extra", "level": 2, "note": "ري→فا", "lat": "D→F", "kind": "transition", "from": {"note": "ري", "lat": "D", "semis": 2}, "to": {"note": "فا", "lat": "F", "semis": 5}, "tol": 25, "need": 7, "tolLadder": [45, 35, 25], "gapLadder": [0.7, 0.55, 0.45], "holdFromLadder": [4.5, 3.2, 2.2], "holdToLadder": [4.5, 3.4, 2.6], "rungNeed": [2, 2, 7], "title": "الانتقال: ري ← فا", "blurb": "ابدأ بهامش واسع يضيق تدريجيًا، حتى الانتقال النظيف الكامل إلى فا."},
  {"id": 40, "subcat": "speed", "level": 3, "note": "ري⇄فا", "lat": "D⇄F", "kind": "exchange", "from": {"note": "ري", "lat": "D", "semis": 2}, "to": {"note": "فا", "lat": "F", "semis": 5}, "tol": 25, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: ري⇄فا مع المترونوم", "blurb": "انتقل مع كل نبضة — ري، فا، ري، فا، ري."},
  {"id": 41, "subcat": "extra", "level": 2, "note": "سي بيمول", "lat": "B♭", "semis": 10, "kind": "longtone", "targetSec": 10, "tol": 18, "stabMax": 15, "need": 7, "durLadder": [5, 7, 10], "stabMult": [1.6, 1.25, 1], "rungNeed": [2, 2, 7], "title": "نغمة سي بيمول الطويلة", "blurb": "أول بيمول تعزفه — يمهّد لمقامَي نهاوند وكرد لاحقًا."},
  {"id": 42, "subcat": "extra", "level": 2, "note": "لا→سي بيمول", "lat": "A→B♭", "kind": "transition", "from": {"note": "لا", "lat": "A", "semis": 9}, "to": {"note": "سي بيمول", "lat": "B♭", "semis": 10}, "tol": 22, "need": 7, "tolLadder": [40, 32, 22], "gapLadder": [0.6, 0.5, 0.4], "holdFromLadder": [4, 3, 2.2], "holdToLadder": [4, 3.2, 2.4], "rungNeed": [2, 2, 7], "title": "الانتقال: لا ← سي بيمول", "blurb": "نصف تون فقط بين النغمتين — انتقال ضيّق يحتاج دقّة أعلى."},
  {"id": 43, "subcat": "speed", "level": 3, "note": "لا⇄سي بيمول", "lat": "A⇄B♭", "kind": "exchange", "from": {"note": "لا", "lat": "A", "semis": 9}, "to": {"note": "سي بيمول", "lat": "B♭", "semis": 10}, "tol": 22, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: لا⇄سي بيمول مع المترونوم", "blurb": "انتقل مع كل نبضة — لا، سي بيمول، لا، سي بيمول، لا."},
  {"id": 44, "subcat": "extra", "level": 2, "note": "سي بيمول→دو", "lat": "B♭→C5", "kind": "transition", "from": {"note": "سي بيمول", "lat": "B♭", "semis": 10}, "to": {"note": "دو الجواب", "lat": "C5", "semis": 12}, "tol": 22, "need": 7, "tolLadder": [40, 32, 22], "gapLadder": [0.6, 0.5, 0.4], "holdFromLadder": [4, 3, 2.2], "holdToLadder": [4, 3.2, 2.4], "rungNeed": [2, 2, 7], "title": "الانتقال: سي بيمول ← دو الجواب", "blurb": "آخر خطوة قبل إتمام الأوكتاف الكامل."},
  {"id": 45, "subcat": "speed", "level": 3, "note": "سي بيمول⇄دو", "lat": "B♭⇄C5", "kind": "exchange", "from": {"note": "سي بيمول", "lat": "B♭", "semis": 10}, "to": {"note": "دو الجواب", "lat": "C5", "semis": 12}, "phaseFinale": true, "tol": 22, "need": 7, "beatSec": 1, "beatStart": 1, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4, "title": "التبادل: سي بيمول⇄دو الجواب — ختام امتداد المدى", "blurb": "إتقان هذا يعني أوكتافًا كاملًا تحت إصبعك — عجم ونهاوند وكرد صارت في متناولك."},
  /* ═══ أول تمرين مقام حقيقي — جنس راست السفلي، نموذج واحد مبنيّ ومُختبَر
     بالكامل قبل تكرار نفس المنهجية على بقية المقامات الستة ═══ */
  {"id": 46, "level": 5, "kind": "jins", "notesSemis": [0,2,3.5,5,3.5,2,0], "holdSec": 1.1, "tol": 30, "need": 5,
   "title": "جنس راست السفلي", "blurb": "دو - ري - مي نصف بيمول - فا، صعودًا ثم هبوطًا — أول جنس مقاميّ حقيقي تعزفه."},
  {"id": 47, "level": 5, "kind": "jins", "notesSemis": [7,9,10.5,12,10.5,9,7], "holdSec": 1.1, "tol": 30, "need": 5,
   "title": "جنس راست العلوي", "blurb": "صول - لا - سي نصف بيمول - دو الجواب، صعودًا ثم هبوطًا — نفس بنية الجنس السفلي، على درجة أعلى."},
  /* ═══ مي بيمول — نغمة تأسيسية معزولة (ثقب كامل، لا تعقيد فينجرينغ) تُكمل
     كل النغمات الثماني اللازمة لمقام نهاوند بالكامل ═══ */
  {"id": 48, "subcat": "extra", "level": 2, "note": "مي بيمول", "lat": "E♭", "semis": 3, "kind": "longtone", "targetSec": 9, "tol": 22, "stabMax": 16, "need": 7,
   "durLadder": [4,6,9], "stabMult": [1.6,1.25,1], "rungNeed": [2,2,7],
   "title": "نغمة مي بيمول", "blurb": "بيمول كامل، لا ربع صوت — أول نغمة تخدم مقام نهاوند مباشرة."},
  {"id": 49, "subcat": "extra", "level": 2, "note": "ري→مي بيمول", "lat": "D→E♭", "kind": "transition", "from": {"note":"ري","lat":"D","semis":2}, "to": {"note":"مي بيمول","lat":"E♭","semis":3},
   "tol": 24, "need": 7, "tolLadder": [40,32,24], "gapLadder": [0.6,0.5,0.4], "holdFromLadder": [4,3,2.2], "holdToLadder": [4,3.2,2.4], "rungNeed": [2,2,7],
   "title": "الانتقال: ري ← مي بيمول", "blurb": "نصف صوت واحد فقط — انتقال قصير ومباشر."},
  {"id": 50, "subcat": "extra", "level": 2, "note": "ري⇄مي بيمول", "lat": "D⇄E♭", "kind": "exchange", "from": {"note":"ري","lat":"D","semis":2}, "to": {"note":"مي بيمول","lat":"E♭","semis":3},
   "tol": 24, "need": 7, "beatSec": 1.0, "beatStart": 1.0, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4,
   "title": "التبادل: ري⇄مي بيمول", "blurb": "انتقل مع كل نبضة — ري، مي بيمول، ري، مي بيمول."},
  /* ═══ جنسا نهاوند — أول مقام يكتمل بأكمله فعليًّا (٨/٨ نغمات) بعد مي بيمول ═══ */
  {"id": 51, "level": 5, "kind": "jins", "notesSemis": [0,2,3,5,3,2,0], "holdSec": 1.1, "tol": 26, "need": 5,
   "title": "جنس نهاوند السفلي", "blurb": "دو - ري - مي بيمول - فا، صعودًا ثم هبوطًا."},
  {"id": 52, "level": 5, "kind": "jins", "notesSemis": [7,9,10,12,10,9,7], "holdSec": 1.1, "tol": 26, "need": 5,
   "title": "جنس نهاوند العلوي", "blurb": "صول - لا - سي بيمول - دو الجواب، صعودًا ثم هبوطًا."},
  /* ═══ جنسا بياتي — جاهزان تقنيًّا بالكامل، كل نغماتهما مُتقَنة سلفًا ═══ */
  {"id": 53, "level": 5, "kind": "jins", "notesSemis": [2,3.5,5,7,5,3.5,2], "holdSec": 1.1, "tol": 28, "need": 5,
   "title": "جنس بياتي السفلي", "blurb": "ري - مي نصف بيمول - فا - صول، صعودًا ثم هبوطًا — الجنس الأكثر شيوعًا في التراث العربي."},
  {"id": 54, "level": 5, "kind": "jins", "notesSemis": [7,9,10,12,10,9,7], "holdSec": 1.1, "tol": 26, "need": 5,
   "title": "جنس بياتي العلوي", "blurb": "صول - لا - سي بيمول - دو الجواب — طابع نهاوند علوي، يمنح بياتي عمقه المميَّز."},
  /* ═══ أربع نغمات مُعلَّمة صراحة «؟ يحتاج تأكيدك بالعزف» — فينجرينغها من
     الجدول الأصلي غير مؤكَّد معك عمليًّا بعد. تُبنى معزولة أولًا، وتحمل
     العلامة المرئية تلقائيًّا في كل تمرين تظهر فيه ═══ */
  {"id": 55, "subcat": "unconfirmed", "level": 2, "note": "دو دييز", "lat": "C♯", "semis": 1, "kind": "longtone", "targetSec": 8, "tol": 24, "stabMax": 17, "need": 7,
   "durLadder": [4,6,8], "stabMult": [1.6,1.25,1], "rungNeed": [2,2,7],
   "title": "نغمة دو دييز ؟", "blurb": "فينجرينغها من الجدول الأصلي، غير مؤكَّدة معك عمليًّا بعد — راقب استجابتها وأخبرني إن شعرت بخطأ."},
  {"id": 56, "subcat": "unconfirmed", "note": "دو→دو دييز ؟", "lat": "C→C♯", "level": 2, "kind": "transition", "from": {"note":"دو","lat":"C","semis":0}, "to": {"note":"دو دييز","lat":"C♯","semis":1},
   "tol": 24, "need": 7, "tolLadder": [40,32,24], "gapLadder": [0.6,0.5,0.4], "holdFromLadder": [4,3,2.2], "holdToLadder": [4,3.2,2.4], "rungNeed": [2,2,7],
   "title": "الانتقال: دو ← دو دييز ؟", "blurb": "نصف صوت واحد — فينجرينغ غير مؤكَّد بعد."},
  {"id": 57, "subcat": "unconfirmed", "note": "دو⇄دو دييز ؟", "lat": "C⇄C♯", "level": 2, "kind": "exchange", "from": {"note":"دو","lat":"C","semis":0}, "to": {"note":"دو دييز","lat":"C♯","semis":1},
   "tol": 24, "need": 7, "beatSec": 1.0, "beatStart": 1.0, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4,
   "title": "التبادل: دو⇄دو دييز ؟", "blurb": "فينجرينغ غير مؤكَّد بعد — راقب استجابتها."},
  {"id": 58, "subcat": "unconfirmed", "level": 2, "note": "مي", "lat": "E", "semis": 4, "kind": "longtone", "targetSec": 8, "tol": 24, "stabMax": 17, "need": 7,
   "durLadder": [4,6,8], "stabMult": [1.6,1.25,1], "rungNeed": [2,2,7],
   "title": "نغمة مي ؟", "blurb": "تحتاج تغطية نصفية حقيقية للثقب — فينجرينغها غير مؤكَّدة معك عمليًّا بعد."},
  {"id": 59, "subcat": "unconfirmed", "note": "فا→مي ؟", "lat": "F→E", "level": 2, "kind": "transition", "from": {"note":"فا","lat":"F","semis":5}, "to": {"note":"مي","lat":"E","semis":4},
   "tol": 24, "need": 7, "tolLadder": [40,32,24], "gapLadder": [0.6,0.5,0.4], "holdFromLadder": [4,3,2.2], "holdToLadder": [4,3.2,2.4], "rungNeed": [2,2,7],
   "title": "الانتقال: فا ← مي ؟", "blurb": "نصف صوت — تغطية نصفية للثقب، غير مؤكَّدة بعد."},
  {"id": 60, "subcat": "unconfirmed", "note": "فا⇄مي ؟", "lat": "F⇄E", "level": 2, "kind": "exchange", "from": {"note":"فا","lat":"F","semis":5}, "to": {"note":"مي","lat":"E","semis":4},
   "tol": 24, "need": 7, "beatSec": 1.0, "beatStart": 1.0, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4,
   "title": "التبادل: فا⇄مي ؟", "blurb": "فينجرينغ غير مؤكَّد بعد — راقب استجابتها."},
  {"id": 61, "subcat": "unconfirmed", "level": 2, "note": "لا بيمول", "lat": "A♭", "semis": 8, "kind": "longtone", "targetSec": 8, "tol": 24, "stabMax": 17, "need": 7,
   "durLadder": [4,6,8], "stabMult": [1.6,1.25,1], "rungNeed": [2,2,7],
   "title": "نغمة لا بيمول ؟", "blurb": "فينجرينغها من الجدول الأصلي، غير مؤكَّدة معك عمليًّا بعد."},
  {"id": 62, "subcat": "unconfirmed", "note": "صول→لا بيمول ؟", "lat": "G→A♭", "level": 2, "kind": "transition", "from": {"note":"صول","lat":"G","semis":7}, "to": {"note":"لا بيمول","lat":"A♭","semis":8},
   "tol": 24, "need": 7, "tolLadder": [40,32,24], "gapLadder": [0.6,0.5,0.4], "holdFromLadder": [4,3,2.2], "holdToLadder": [4,3.2,2.4], "rungNeed": [2,2,7],
   "title": "الانتقال: صول ← لا بيمول ؟", "blurb": "نصف صوت — فينجرينغ غير مؤكَّد بعد."},
  {"id": 63, "subcat": "unconfirmed", "note": "صول⇄لا بيمول ؟", "lat": "G⇄A♭", "level": 2, "kind": "exchange", "from": {"note":"صول","lat":"G","semis":7}, "to": {"note":"لا بيمول","lat":"A♭","semis":8},
   "tol": 24, "need": 7, "beatSec": 1.0, "beatStart": 1.0, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4,
   "title": "التبادل: صول⇄لا بيمول ؟", "blurb": "فينجرينغ غير مؤكَّد بعد — راقب استجابتها."},
  {"id": 64, "subcat": "unconfirmed", "level": 2, "note": "سي", "lat": "B", "semis": 11, "kind": "longtone", "targetSec": 8, "tol": 24, "stabMax": 17, "need": 7,
   "durLadder": [4,6,8], "stabMult": [1.6,1.25,1], "rungNeed": [2,2,7],
   "title": "نغمة سي ؟", "blurb": "تحتاج تغطية نصفية حقيقية للثقب — فينجرينغها غير مؤكَّدة معك عمليًّا بعد."},
  {"id": 65, "subcat": "unconfirmed", "note": "سي→دو الجواب ؟", "lat": "B→C5", "level": 2, "kind": "transition", "from": {"note":"سي","lat":"B","semis":11}, "to": {"note":"دو الجواب","lat":"C5","semis":12},
   "tol": 24, "need": 7, "tolLadder": [40,32,24], "gapLadder": [0.6,0.5,0.4], "holdFromLadder": [4,3,2.2], "holdToLadder": [4,3.2,2.4], "rungNeed": [2,2,7],
   "title": "الانتقال: سي ← دو الجواب ؟", "blurb": "نصف صوت — فينجرينغ غير مؤكَّد بعد."},
  {"id": 66, "subcat": "unconfirmed", "note": "سي⇄دو الجواب ؟", "lat": "B⇄C5", "level": 2, "kind": "exchange", "from": {"note":"سي","lat":"B","semis":11}, "to": {"note":"دو الجواب","lat":"C5","semis":12},
   "tol": 24, "need": 7, "beatSec": 1.0, "beatStart": 1.0, "beatMin": 0.55, "stepDown": 0.09, "stepUp": 0.13, "reps": 4,
   "title": "التبادل: سي⇄دو الجواب ؟", "blurb": "فينجرينغ غير مؤكَّد بعد — راقب استجابتها."},
  /* ═══ أجناس عجم وكرد وحجاز — تُستخدَم فيها النغمات المُعلَّمة أعلاه، فتحمل
     علامة التأكيد تلقائيًّا كذلك ═══ */
  {"id": 67, "level": 5, "kind": "jins", "notesSemis": [0,2,4,5,4,2,0], "holdSec": 1.1, "tol": 28, "need": 5,
   "title": "جنس عجم السفلي ؟", "blurb": "دو - ري - مي - فا، صعودًا ثم هبوطًا — يحتوي نغمة مي غير المؤكَّدة."},
  {"id": 68, "level": 5, "kind": "jins", "notesSemis": [7,9,11,12,11,9,7], "holdSec": 1.1, "tol": 28, "need": 5,
   "title": "جنس عجم العلوي ؟", "blurb": "صول - لا - سي - دو الجواب — يحتوي نغمة سي غير المؤكَّدة."},
  {"id": 69, "level": 5, "kind": "jins", "notesSemis": [0,1,3,5,3,1,0], "holdSec": 1.1, "tol": 28, "need": 5,
   "title": "جنس كرد السفلي ؟", "blurb": "دو - ري بيمول - مي بيمول - فا، صعودًا ثم هبوطًا — يحتوي دو دييز (ري بيمول) غير المؤكَّدة."},
  {"id": 70, "level": 5, "kind": "jins", "notesSemis": [5,7,8,10,8,7,5], "holdSec": 1.1, "tol": 28, "need": 5,
   "title": "جنس كرد العلوي ؟", "blurb": "فا - صول - لا بيمول - سي بيمول — يحتوي لا بيمول غير المؤكَّدة."},
  {"id": 71, "level": 5, "kind": "jins", "notesSemis": [0,1,4,5,4,1,0], "holdSec": 1.1, "tol": 30, "need": 5,
   "title": "جنس حجاز السفلي ؟", "blurb": "دو - ري بيمول - مي - فا — الثانية الزائدة المميِّزة لحجاز، يحتوي نغمتين غير مؤكَّدتين."},
  {"id": 72, "level": 5, "kind": "jins", "notesSemis": [5,7,8,10,8,7,5], "holdSec": 1.1, "tol": 28, "need": 5,
   "title": "جنس حجاز العلوي ؟", "blurb": "فا - صول - لا بيمول - سي بيمول — نفس الجنس العلوي المشترك مع كرد."},
  /* ═══ اختبار النقل الحقيقي — يجمع الأشكال الثلاثة (نوار، كروش، توكو-توكو)
     في تسلسل جديد لم يُتدرَّب عليه تحديدًا من قبل، وفق تسلسل غوردون التعليمي
     («قراءة أنماط غير مألوفة من النوتة» — المرحلة التي تُثبت الإتقان الحقيقي،
     لا الحفظ العضلي لتمرين واحد مكرَّر) ═══ */
  {"id": 73, "subcat": "shapes", "level": 3, "kind": "rhythm", "beats": 6, "beatSec": 1.3, "pattern": [1,2,1,4,2,1],
   "tolLadder": [420, 420, 420], "rungNeed": [1, 1, 5], "need": 5,
   "title": "قراءة إيقاعية مُختلَطة", "blurb": "نوار، كروش، نوار، توكو-توكو، كروش، نوار — تسلسل جديد يجمع كل ما أتقنته منفردًا. هذا اختبار القراءة الحقيقي."},
  /* ═══ أول تمرين تمييز سمعي — لا ميكروفون، لا كشف طبقة. المتدرّب يستمع
     ويتعرّف، لا يعزف فقط — النصف الغائب من الموسيقية حتى الآن ═══ */
  {"id": 74, "level": 5, "kind": "eartrain", "earOptions": ["rast","nahawand","bayati"], "need": 5,
   "title": "أيّ مقام تسمع؟ — الأساسيات", "blurb": "راست، نهاوند، بياتي — استمع وميّز بأذنك، لا بإصبعك هذه المرّة."},
];
/* ── LEVELS: a browsing/overview grouping over the same CURRICULUM sequence.
   Purely a navigation convenience — it does NOT change unlock order at all;
   firstIncomplete() and openDay() still work exactly as before across the
   full linear sequence. Days from different levels can be interleaved in
   the real required order (e.g. a rhythm day between two pitch days) — the
   level rail exists so a trainee can see "how much of X have I done" at a
   glance, not to gate progress by level. ── */
const LEVELS=[
  {id:1, key:'breath', name:'النفَس', color:'79,227,193'},
  {id:2, key:'pitch',  name:'دقّة النغمات', color:'230,184,92'},
  {id:3, key:'rhythm', name:'السرعة والإيقاع', color:'220,110,76'},
  {id:4, key:'tongue', name:'النقر', color:'155,110,220'},
  {id:5, key:'maqam',  name:'المقامات الأساسية', color:'74,59,122'},
  {id:6, key:'perf',   name:'الأداء والتقاسيم', color:'155,146,184', locked:true},
];
// one minimal single-stroke glyph per level — same line grammar as the rest
// of the app's iconography, colored via currentColor so --lc drives it.
const LVL_ICONS={
  breath:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 7.5c2-2.5 4-2.5 5.5-1s3 1.5 5-1 4.5-1.5 4.5-1.5"/><path d="M2.5 12c2.4-1.7 4.6-1.7 6.3 0s3.7 1.7 5.7 0"/></svg>',
  pitch:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 2.5v6.4a3 3 0 1 0 2 0V6"/><path d="M5.4 2.5h3.2"/><circle cx="8" cy="14.3" r="2.6"/><path d="M13.5 4v9.5"/><path d="M13.5 4l3 2"/></svg>',
  rhythm:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5 8.4 3.5h3.2L15 16.5"/><path d="M6.6 16.5h6.8"/><path d="M10 5.5l2.4 8"/><circle cx="10" cy="5.3" r="1" fill="currentColor" stroke="none"/></svg>',
  tongue:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="2.1"/><circle cx="10" cy="10" r="5.6" opacity=".55"/><circle cx="10" cy="10" r="8.4" opacity=".28"/></svg>',
  maqam:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 15.5 7 6.5l3 4.5 2-2.7 5 7.2Z"/></svg>',
  perf:'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M10 2.6 12 7.4l5.2.5-3.9 3.5 1.2 5.1L10 13.9l-4.5 2.6 1.2-5.1L2.8 7.9l5.2-.5Z"/></svg>'
};
const LVL_LOCK_ICON='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M6.8 9V6.2a3.2 3.2 0 0 1 6.4 0V9"/></svg>';
function levelDays(levelId){ return CURRICULUM.filter(d=>d.level===levelId); }
/* ── MAQAMAT: every maqam gets a fixed profile — written scale, factual
   song references (title/artist/composer, never lyrics — copyright), and an
   optional audio field that gracefully shows "coming later" until a real,
   rights-clear recording exists. Sourced from Maqam World (primary reference). ── */
const MAQAMAT=[
  {key:'ajam', name:'عجم', quarterTone:false, mood:'قوّة ووقار واحتفاء — أقرب المقامات لأذن معتادة على السلّم الكبير الغربي، لهذا غالبًا أول مقام يُقدَّم لمتعلّم جديد.',
   notesText:'دو - ري - مي - فا - صول - لا - سي - دو',
   semis:[0,2,4,5,7,9,11,12],
   songs:[{title:'أغدًا ألقاك', artist:'أم كلثوم', composer:'محمد عبد الوهاب', year:1971}],
   audioKey:null},
  {key:'nahawand', name:'نهاوند', quarterTone:false, mood:'دراما وعمق عاطفي — أقرب مقام لإحساس السلّم الصغير الغربي، يحمل شجنًا ورومانسية حقيقية.',
   notesText:'دو - ري - مي بيمول - فا - صول - لا - سي بيمول - دو',
   semis:[0,2,3,5,7,9,10,12],
   songs:[],
   audioKey:null},
  {key:'kurd', name:'كرد', quarterTone:false, mood:'حنين ودفء — أقرب نقطة انطلاق لأذن غربية أيضًا (سلّم صغير مألوف)، لكن بطابع شرقي حزين مميَّز.',
   notesText:'دو - ري بيمول - مي بيمول - فا - صول - لا بيمول - سي بيمول - دو',
   semis:[0,1,3,5,7,8,10,12],
   songs:[],
   audioKey:null},
  {key:'hijaz', name:'حجاز', quarterTone:false, mood:'شوق وتأمّل روحانيّ — الثانية الزائدة المميِّزة تمنحه طابعًا صحراويًّا بعيدًا، يُستخدم كثيرًا في الأذان والابتهالات.',
   notesText:'دو - ري بيمول - مي - فا - صول - لا بيمول - سي بيمول - دو',
   semis:[0,1,4,5,7,8,10,12],
   songs:[{title:'مدنقة جفاه مرقده', artist:'محمد عبد الوهاب', composer:'محمد عبد الوهاب', year:1938}],
   audioKey:null},
  {key:'bayati', name:'بياتي', quarterTone:true, mood:'الأكثر شيوعًا في التراث العربي كله — دفء وحيوية وقرب إنساني. كلمة «بياتي» من «بيت»؛ يُقال إنه أوّل مقام يجب أن يتعلّمه أي عازف عربي.',
   notesText:'ري - مي نصف بيمول - فا - صول - لا - سي بيمول - دو - ري',
   semis:[2,3.5,5,7,9,10,12,14],
   songs:[
     {title:'ع الباب المحبوب ودّيني', artist:'أم كلثوم', composer:'رياض السنباطي', year:1935},
     {title:'أكون سعيد', artist:'أم كلثوم', composer:'زكريا أحمد', year:1932},
   ],
   audioKey:null},
  {key:'rast', name:'راست', quarterTone:true, mood:'«أبو المقامات» — أساس النظام المقامي العربي كله، وقار وفخر واعتدال، غالبًا أول مقام تُبنى عليه تعاليم النظرية الموسيقية العربية.',
   notesText:'دو - ري - مي نصف بيمول - فا - صول - لا - سي نصف بيمول - دو',
   semis:[0,2,3.5,5,7,9,10.5,12],
   songs:[],
   audioKey:null},
];
function maqamAudioSrc(m){ return m.audioKey ? `maqam-audio/${m.audioKey}.mp3` : null; }
function maqamReadiness(m){
  const taughtSemis=new Set();
  CURRICULUM.forEach(d=>{ if(d.semis!=null) taughtSemis.add(d.semis); if(d.from&&d.from.semis!=null) taughtSemis.add(d.from.semis); if(d.to&&d.to.semis!=null) taughtSemis.add(d.to.semis); });
  const known=m.semis.filter(s=>taughtSemis.has(s)).length;
  return {known, total:m.semis.length};
}
let selectedMaqam=null;
let selectedSubcatByLevel={};
function renderMaqamPreview(){
  if(selectedMaqam==null && MAQAMAT.length) selectedMaqam=0;
  // ── the chip rail: IDENTICAL markup/classes to the home screen's level
  // rail, so the two screens read as one visual family, not two designs ──
  const MQ_COLORS=['230,184,92','79,227,193','220,110,76','155,110,220','230,184,92','74,59,122'];
  let railHtml='';
  MAQAMAT.forEach((m,i)=>{
    const {known,total}=maqamReadiness(m);
    const pct=Math.round(known/total*100);
    const isSel=selectedMaqam===i;
    railHtml+=`<div class="lvl-chip ${isSel?'sel':''}" style="--lc:${MQ_COLORS[i%MQ_COLORS.length]}" data-mq="${i}">
      <div class="lvl-num">${String(i+1).padStart(2,'0')}</div>
      <div class="lvl-name">${m.name}</div>
      <div class="lvl-bar"><div class="lvl-fill" style="width:${pct}%"></div></div>
      <div class="lvl-frac">${known} / ${total}</div>
    </div>`;
  });
  $('maqamRail').innerHTML=railHtml;
  $('maqamRail').querySelectorAll('[data-mq]').forEach(c=>c.addEventListener('click',()=>{
    selectedMaqam=+c.dataset.mq; renderMaqamPreview();
  }));

  // ── the single selected maqam's detail card ──
  let html='';
  const m=MAQAMAT[selectedMaqam];
  if(m){
    const {known,total}=maqamReadiness(m);
    const pct=Math.round(known/total*100);
    html=`<div class="maqam-card">
      <div class="maqam-name">${m.name}${m.quarterTone?' <span style="font-size:.6em;opacity:.6">(ربع صوت)</span>':''}</div>
      <p style="font-family:var(--f-body);font-size:.78rem;color:var(--muted);text-align:center;line-height:1.85;margin-bottom:12px">${m.mood}</p>
      <div class="maqam-notes">${m.notesText}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <div style="flex:1;height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${pct===100?'var(--live)':'var(--gold)'};border-radius:3px"></div>
        </div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:.62rem;color:var(--muted)">${known}/${total} نغمات مُتقَنة</div>
      </div>
      <div class="maqam-sec-lbl">أغانٍ مشهورة بهذا المقام</div>
      ${m.songs.length?m.songs.map(s=>`<div class="maqam-song">${s.title} — <span class="composer">${s.artist}${s.composer?' · لحن '+s.composer:''}${s.year?' · '+toAr(s.year):''}</span></div>`).join(''):'<div class="maqam-song" style="color:var(--muted)">لم تُضَف بعد</div>'}
      <div class="maqam-audio">
        <div class="ic">♪</div>
        <div class="txt">${m.audioKey?'مقطع تعريفي متاح':'مقطع صوتي تعريفي — سيُضاف لاحقًا'}</div>
      </div>
    </div>`;
  } else html='<p class="hint" style="margin-top:30px">لا مقامات مُضافة بعد.</p>';
  $('maqamCards').innerHTML=html;
}
$('maqamPrevBack').addEventListener('click', ()=>{ show('home'); renderHome(); });
function levelProgress(levelId){
  if(levelId===1) return {done: prog.foundation.breath?1:0, total:1};
  const days=levelDays(levelId);
  return {done: days.filter(d=>prog.done[d.id]).length, total: days.length};
}
function levelOfDay(id){ if(id==='breath') return 1; const d=CURRICULUM.find(x=>x.id===id); return d?d.level:2; }
const EARLY_NOTE_DAYS=[1,2,3,4]; // دو ري فا صول — the four foundational long-tones worth periodically re-testing
function mostOverdueEarlyDay(){
  let worst=null, worstDays=-1;
  EARLY_NOTE_DAYS.forEach(id=>{
    const rec=prog.done[id]; if(!rec||!rec.ts) return;
    const days=Math.floor((Date.now()-new Date(rec.ts).getTime())/86400000);
    if(days>worstDays){ worstDays=days; worst=id; }
  });
  return worst==null ? null : {id:worst, days:worstDays};
}
function dayLabel(id){
  const lvlId = levelOfDay(id);
  const lvl = LEVELS.find(L=>L.id===lvlId);
  if(!lvl) return dayLabel(id);
  const days = levelDays(lvlId);
  const pos = days.findIndex(d=>d.id===id)+1;
  return lvl.name+' · '+toAr(pos||1)+'/'+toAr(days.length||1);
}
let selectedLevel=null;
// constellation coordinates (viewBox 320x460) — hand-placed winding path bottom→top
const SKY=[[165,400],[110,368],[205,344],[135,306],[225,286],[95,258],[180,236],
          [258,214],[130,190],[215,166],[92,146],[190,124],[262,100],[150,74],[95,40],[175,14]];

