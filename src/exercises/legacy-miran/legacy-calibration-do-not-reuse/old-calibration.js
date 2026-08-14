/* ============================================================================
 * ملف معزول عمدًا — لا يُستخدم كأساس لأي شيء جديد.
 *
 * هذا هو منطق CALIBRATION الأصلي من مِران القديم (معايرة القرار الشخصي +
 * معايرة زمن التأخر الشخصي "onset-latency"). نُقل هنا حرفيًا بلا أي تعديل
 * سلوكي، فقط لفصله فيزيائيًا عن محرك المنهج/التمارين في ../js/.
 *
 * المعايرة الجديدة (تطبق القرارات 1-3 من سجل القرارات) مبنية من الصفر في
 * src/calibration/ ولا علاقة لها بهذا الكود ولا تعتمد عليه بأي شكل.
 *
 * لا يزال هذا الملف مُحمَّلاً في index.html (بنفس ترتيب التحميل الأصلي)
 * لأن شاشة المعايرة القديمة في الواجهة ما زالت تستخدمه حاليًا — إزالته
 * الآن تغيير سلوكي خارج نطاق مرحلة الفصل هذه. أي دمج مستقبلي لصفحة
 * المعايرة الجديدة (#2) يجب أن يستبدل هذا الملف بالكامل لا أن يبني عليه.
 * ========================================================================== */
/* ================= CALIBRATION ================= */
$('btnCalib').addEventListener('click', async ()=>{
  $('btnCalib').disabled=true; $('calibHint').textContent='…جارٍ تشغيل الميكروفون';
  try{ await initAudio(); if(audioCtx.state==='suspended')await audioCtx.resume(); if(!rafId)loop(); }
  catch(e){ $('btnCalib').disabled=false; $('calibReadout').className='cents-live off';
    $('calibReadout').textContent='تعذّر الميكروفون — اسمح بالإذن'; return; }
  const CAL_LEAD=1300, CAL_WINDOW=3600; // settle first (breath-attack is unstable), THEN capture the steady part
  const samples=[]; const t0=performance.now(); $('calibHint').textContent='ابدأ النفخ الآن — استقرّ بهدوء…';
  let _capturingShown=false;
  onFrame=(p)=>{
    const elapsed=performance.now()-t0;
    if(elapsed<CAL_LEAD){
      if(p.hz && p.clarity>=CLARITY){ $('calibReadout').className='cents-live ok'; $('calibReadout').textContent=p.hz.toFixed(1)+' Hz'; }
      return; // settling — heard, shown, but not yet counted toward the result
    }
    if(!_capturingShown){ _capturingShown=true; $('calibHint').textContent='الآن ألتقط — ثبّت نفَسك…'; }
    if(p.hz && p.clarity>=CLARITY){ samples.push(p.hz);
      $('calibReadout').className='cents-live ok'; $('calibReadout').textContent=p.hz.toFixed(1)+' Hz'; }
    if(elapsed-CAL_LEAD>CAL_WINDOW){
      onFrame=null; $('btnCalib').disabled=false;
      if(samples.length<15){ $('calibReadout').className='cents-live off';
        $('calibReadout').textContent='لم أسمع نغمة ثابتة — أعد المحاولة'; $('calibHint').textContent='انفخ برفق واثبت — سآخذ وقتي هذه المرّة أيضًا.'; return; }
      samples.sort((a,b)=>a-b); let med=samples[Math.floor(samples.length/2)];
      const cloud=samples.filter(h=>Math.abs(1200*Math.log2(h/med))<80); cloud.sort((a,b)=>a-b);
      const q=cloud.length?cloud[Math.floor(cloud.length/2)]:med;
      const cp=neyConcertPitch(q);
      calib={qararHz:q, concertA4:CONCERT_A4, cents:cp.centsOff, ts:new Date().toISOString()}; saveCalib();
      renderHome(); show('home');
    }
  };
});

/* ---- personal onset-latency calibration ---- */
const LATCAL_LEAD=4, LATCAL_BEATS=8, LATCAL_BEAT_SEC=0.9;
function drawLatCal(beatTimes, hits, curIdx, nowSec){
  const cvs=$('latcalCanvas'); const c2=cvs.getContext('2d');
  const r=cvs.getBoundingClientRect(); if(r.width && cvs.width!==r.width*2){ const dpr=Math.min(2,window.devicePixelRatio||1); cvs.width=r.width*dpr; cvs.height=200*dpr; c2.setTransform(dpr,0,0,dpr,0,0); }
  const w=r.width||440, h=200, cy=h/2;
  c2.clearRect(0,0,w,h); c2.fillStyle=C.void; c2.fillRect(0,0,w,h);
  const n=beatTimes.length, pad=30, gap=(w-2*pad)/(n-1);
  for(let i=0;i<n;i++){
    const x=pad+i*gap; const lead=i<LATCAL_LEAD;
    const state=hits[i]; const active=i===curIdx;
    let col = lead?'rgba(155,146,184,.4)' : state!=null?C.live : active?'rgba(230,184,92,.9)':'rgba(155,146,184,.35)';
    if(active){ c2.strokeStyle='rgba(230,184,92,.5)'; c2.lineWidth=2; c2.beginPath(); c2.arc(x,cy,14,0,7); c2.stroke(); }
    c2.fillStyle=col; c2.beginPath(); c2.arc(x,cy,7,0,7); c2.fill();
  }
  c2.fillStyle='rgba(237,232,245,.8)'; c2.font="500 13px Cairo,sans-serif"; c2.textAlign='center';
  const phase = curIdx<LATCAL_LEAD ? 'استمع فقط…' : `اعزف مع النبضة ${toAr(Math.min(curIdx-LATCAL_LEAD+1,LATCAL_BEATS))}/${toAr(LATCAL_BEATS)}`;
  c2.fillText(phase, w/2, 24); c2.textAlign='start';
}
$('btnLatCal').addEventListener('click', async ()=>{
  $('btnLatCal').disabled=true; $('latcalHint').textContent='…جارٍ تشغيل الميكروفون';
  try{ await initAudio(); if(audioCtx.state==='suspended')await audioCtx.resume(); if(!rafId)loop(); }
  catch(e){ $('btnLatCal').disabled=false; $('latcalHint').textContent='تعذّر الميكروفون — اسمح بالإذن'; return; }
  $('latcalHint').textContent='استمع للنبضات الأربع، ثم اعزف مع كل نبضة بعدها.';
  const total=LATCAL_LEAD+LATCAL_BEATS;
  const beatTimes=Array.from({length:total},(_,i)=>i*LATCAL_BEAT_SEC);
  const t0=performance.now(); const offsets=[]; const hits=new Array(total).fill(null);
  let wasVoiced=false, lastBeatPlayed=-1;
  onFrame=(p)=>{
    const now=(performance.now()-t0)/1000;
    const beatIdx=Math.min(Math.floor(now/LATCAL_BEAT_SEC+0.5), total-1);
    if(beatIdx!==lastBeatPlayed && now>=beatIdx*LATCAL_BEAT_SEC-0.02){ lastBeatPlayed=beatIdx; playTick(beatIdx%4===0?1300:1100); }
    const voiced=!!(p.hz && p.clarity>=CLARITY);
    if(voiced && !wasVoiced && beatIdx>=LATCAL_LEAD){
      let bi=-1,bd=Infinity;
      beatTimes.forEach((bt,i)=>{ if(i>=LATCAL_LEAD && hits[i]==null){ const dd=Math.abs(now-bt); if(dd<bd){bd=dd;bi=i;} } });
      if(bi>=0 && bd<=LATCAL_BEAT_SEC/2){ const offMs=(now-beatTimes[bi])*1000; hits[bi]=offMs; offsets.push(offMs); }
    }
    wasVoiced=voiced;
    const curIdx=Math.min(Math.floor(now/LATCAL_BEAT_SEC), total-1);
    drawLatCal(beatTimes, hits, curIdx, now);
    if(now>=total*LATCAL_BEAT_SEC+0.6){
      onFrame=null; $('btnLatCal').disabled=false;
      if(offsets.length<5){ $('latcalHint').textContent='لم ألتقط نبضات كافية — أعد المحاولة، وحافظ على نغمة قصيرة عند كل نبضة.'; return; }
      offsets.sort((a,b)=>a-b); const med=offsets[Math.floor(offsets.length/2)];
      latencyCal={ms:Math.round(med), ts:new Date().toISOString()}; saveLatencyCal();
      const continueToDay=targetDayId; // capture BEFORE renderHome() resets targetDayId to the next-incomplete day
      renderHome();
      if(continueToDay) openDay(continueToDay); else show('home'); // continue straight into whichever day asked for this calibration
    }
  };
});

