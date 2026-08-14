/* ================= PERSISTENCE (localStorage, safe) ================= */
const store={
  get(k,f){ try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch(e){return (this._m&&this._m[k])??f;} },
  set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){(this._m=this._m||{})[k]=v;} },
  _m:{}
};
let calib = store.get('miran_cal', null);          // {qararHz, concertA4, cents, ts}
let latencyCal = store.get('miran_latency', null);  // {ms, ts} — personal onset-latency offset for rhythm scoring
let prog  = store.get('miran_prog', {done:{}, streakDays:0, lastDate:null});
prog.foundation = prog.foundation || {breath:false, rung:0};
if(prog.foundation.breath && prog.foundation.dynamicDone===undefined) prog.foundation.dynamicDone=true; // grandfather pre-existing completions
function saveProg(){ store.set('miran_prog', prog); }
/* ── schema migrations: each one shifts saved day-id keys to match a
   curriculum insertion. They run in order and each is idempotent/one-time,
   so a save from ANY earlier version ends up correctly migrated regardless
   of how many insertions have happened since. ── */
const shiftProgKeys=(fromId)=>{
  const shiftKeys=(obj)=>{
    if(!obj) return;
    Object.keys(obj).filter(k=>/^\d+$/.test(k)).map(Number).sort((a,b)=>b-a) // highest first, never overwrite a not-yet-moved key
      .forEach(oldId=>{ if(oldId>=fromId){ obj[oldId+1]=obj[oldId]; delete obj[oldId]; } });
  };
  shiftKeys(prog.done); shiftKeys(prog.inProgress);
};
if(!prog.schemaV || prog.schemaV<2){
  // day6 "الإيقاع الأساسي" was inserted before the old exchange day (old id>=6 shifted +1)
  shiftProgKeys(6); prog.schemaV=2; saveProg();
}
if(!prog.schemaV || prog.schemaV<3){
  // day5 "صول — تثبيت مركَّز" was inserted right after the original صول long-tone day (id>=5 shifted +1)
  shiftProgKeys(5); prog.schemaV=3; saveProg();
}
if(!prog.schemaV || prog.schemaV<4){
  // reorder: مي½ب (was 36-38) moved between ري and فا; سي½ب (was 39-41) moved
  // between لا and سي بيمول — matches true pitch order instead of being
  // appended at the curriculum's end. Not a uniform shift, so remap explicitly.
  const REMAP_V4={1:1,2:2,3:6,4:7,5:8,6:9,7:10,8:11,9:12,10:13,11:14,12:15,13:16,14:17,15:18,16:19,17:20,18:21,19:22,20:23,21:27,22:28,23:29,24:30,25:31,26:32,27:33,28:34,29:35,30:36,31:37,32:38,33:39,34:40,35:41,36:3,37:4,38:5,39:24,40:25,41:26};
  const remapKeys=(obj)=>{
    if(!obj) return;
    const fresh={};
    Object.keys(obj).forEach(k=>{ const nk = /^\d+$/.test(k) ? (REMAP_V4[+k]||+k) : k; fresh[nk]=obj[k]; });
    Object.keys(obj).forEach(k=>delete obj[k]);
    Object.assign(obj, fresh);
  };
  remapKeys(prog.done); remapKeys(prog.inProgress);
  prog.schemaV=4; saveProg();
}
if(!prog.schemaV || prog.schemaV<5){
  // full restructure: all 8 octave-note longtones first, then ALL adjacent
  // transitions, then ALL adjacent exchanges (strict ascending pitch order,
  // no skip-interval pairs until every adjacent pair is mastered) — per
  // explicit design requirement. Two brand-new adjacent pairs were added
  // (مي½ب-فا، سي½ب-دو الجواب) so pre-existing users never had progress on
  // those ids; everything else remaps via this exact bijection.
  const REMAP_V5={1:1,2:2,3:3,6:4,7:5,8:6,22:7,24:8,31:9,10:10,9:11,4:12,42:13,13:14,23:15,25:16,44:17,11:18,5:19,43:20,15:21,27:22,26:23,45:24,16:25,17:26,18:27,19:28,20:29,21:30,34:31,35:32,36:33,37:34,38:35,39:36,40:37,41:38,12:39,14:40,28:41,29:42,30:43,32:44,33:45};
  const remapKeysV5=(obj)=>{
    if(!obj) return;
    const fresh={};
    Object.keys(obj).forEach(k=>{ const nk = /^\d+$/.test(k) ? (REMAP_V5[+k]||+k) : k; fresh[nk]=obj[k]; });
    Object.keys(obj).forEach(k=>delete obj[k]);
    Object.assign(obj, fresh);
  };
  remapKeysV5(prog.done); remapKeysV5(prog.inProgress);
  prog.schemaV=5; saveProg();
}
function saveCalib(){ store.set('miran_cal', calib); }
function saveLatencyCal(){ store.set('miran_latency', latencyCal); }
/* Foundational pre-stage: breath before pitch. Pitch-agnostic — measures only
   how long a steady sound is sustained, over an ascending ladder of durations. */
const BREATH={ id:'breath', kind:'breath', note:'✦', lat:'', rungs:[4,6,8,10,12], jitterMax:30,
  title:'مرحلة النفَس', blurb:'قبل الطبقة: أصدر صوتًا ثابتًا صافيًا وأطِل نفَسك — أيُّ نغمة، المهم الثبات والصفاء والاستمرار.'};

const CONCERT_A4=440;
const neyConcertPitch=q=>{const a=q/Math.pow(2,3/12);return{impliedA4:a,centsOff:1200*Math.log2(a/CONCERT_A4)};};
const dayTarget=d=> calib ? calib.qararHz*Math.pow(2, d.semis/12) : null;   // Hz for a day's note
function firstIncomplete(){ for(const d of CURRICULUM){ if(d.kind!=='soon' && !prog.done[d.id]) return d.id; } return CURRICULUM.length; }
function isUnlocked(id){ // immediate unlock: any built day up to first-incomplete, plus completed ones
  if(!prog.foundation.breath) return false; // breath stage gates the whole journey
  const fi=firstIncomplete(); return id<=fi && CURRICULUM.find(d=>d.id===id).kind!=='soon'; }

