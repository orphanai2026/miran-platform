/* ================= EXCHANGE EXERCISE (repeated دو⇄ري with strict metronome) =================
   Entry sync: instead of a fixed silent settle, the lead-in is TWO PICKUP BEATS at the
   exercise's own tempo (like a conductor's count-in) — so the player's internal pulse
   carries straight from the pickup into beat 0 at the real tempo, instead of jumping from
   an unrelated fixed pause into a possibly much faster/slower pattern. */
const TR_EX_TAIL=0.6;
// exercises that start noticeably faster than the standard 1.0s baseline
// (like consolidation/finale days revisiting an already-mastered pair) get
// one extra pickup beat — real time to lock the ear onto the new, faster
// tempo before scoring begins, instead of carrying over muscle memory from
// the slower pace the pair was originally learned at.
function exLeadBeats(day){ return (day && day.beatStart!=null && day.beatStart<0.9) ? 3 : 2; }
function activeTargetCentsExchange(now0){
  const lead=exLeadBeats(curDay)*TR.beatSec;
  const now=Math.max(0, now0-lead);
  const b=TR.beatSec, slide=Math.min(0.25*b,0.18), reps=TR.reps;
  let idx=Math.floor(now/b); if(idx>reps) idx=reps;
  const noteAt=i=>(i%2===0?0:TR.span);
  if(idx>=reps) return noteAt(reps);
  const within=now-idx*b, cur=noteAt(idx), next=noteAt(idx+1);
  if(within<b-slide) return cur;
  const k=(within-(b-slide))/slide; return cur+(next-cur)*(0.5-0.5*Math.cos(k*Math.PI));
}
function startExchange(){
  recording=true; $('btnRecLabel').textContent='إلغاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  recData={t0:performance.now(),pts:[],voiced:[]}; setupCanvas(); recData._lastBeat=-99; recData._goCued=false; recData._lastPickup=-1;
  const b=TR.beatSec, reps=TR.reps, lead=exLeadBeats(curDay)*b, END=lead+reps*b+TR_EX_TAIL;
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000;
    // pickup beats: same tick, same tempo as the real pattern — sets the player's clock BEFORE beat 0
    if(now<lead){
      const pIdx=Math.floor(now/b);
      if(pIdx!==recData._lastPickup && now>=pIdx*b-0.02){ recData._lastPickup=pIdx; playTick(1100); }
    } else if(!recData._goCued){ recData._goCued=true; cueChime(); }
    const now2=Math.max(0,now-lead);
    const beatIdx=Math.min(Math.floor(now2/b), reps);
    if(now>=lead && beatIdx!==recData._lastBeat){ recData._lastBeat=beatIdx; playTick(beatIdx%2===0?1200:1500); }
    const {ay}=drawTransitionBg(now, activeTargetCentsExchange);
    const inTune=p.hz && p.clarity>=CLARITY; let c=null;
    if(inTune){ c=centsBetween(p.hz,TR.fromHz); while(c-100>600)c-=1200; while(c-100<-600)c+=1200; recData.pts.push({t:now,c}); }
    recData.voiced.push({t:now,on:inTune});
    if(inTune){ const py=yT(c); const at=activeTargetCentsExchange(now); const near=Math.abs(c-at)<=TOL;
      const g=cx.createRadialGradient(ORB.cx,py,1,ORB.cx,py,22); g.addColorStop(0, near?'rgba(79,227,193,.5)':'rgba(255,179,71,.4)'); g.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=g; cx.beginPath(); cx.arc(ORB.cx,py,22,0,7); cx.fill();
      cx.fillStyle= near?C.live:C.breath; cx.beginPath(); cx.arc(ORB.cx,py,9,0,7); cx.fill();
      cx.fillStyle='rgba(255,255,255,.85)'; cx.beginPath(); cx.arc(ORB.cx-3,py-3,3,0,7); cx.fill();
    } else { cx.fillStyle='rgba(155,146,184,.5)'; cx.beginPath(); cx.arc(ORB.cx,ay,7,0,7); cx.fill(); }
    drawMouthGauge(now.toFixed(1), now/END, 'ثانية');
    drawExitStreak(attempts||0, NEED||7);
    const beatsLeft = Math.max(0, exLeadBeats(curDay) - Math.floor(now/b));
    const hint = now<lead ? ('استعد على '+curDay.from.note+'… '+toAr(beatsLeft))
                          : ('النبضة '+toAr(Math.min(beatIdx+1,reps+1))+' / '+toAr(reps+1));
    drawContextStrip(dayLabel(curDay.id)+' · تبادل · '+TR.beatSec.toFixed(2)+' ث (الهدف '+curDay.beatMin.toFixed(2)+')',
      hint, 'rgba(79,227,193,.75)');
    $('sustainNum').textContent=Math.min(now,END).toFixed(1);
    $('sustainBar').style.width=Math.min(100,(now/END)*100)+'%';
    if(now>=END) stopAttempt();
  };
}
/* ── adaptive pattern diagnosis: if the SAME failure signature repeats,
   name that pattern specifically instead of repeating a generic message.
   Works for ANY signature shape via structural comparison, so every
   exercise kind (long-tone, transition, exchange, rhythm) can share it. ── */
let _failPattern=[];
function checkFailPattern(sig){
  _failPattern.push(sig); if(_failPattern.length>4) _failPattern.shift();
  if(_failPattern.length>=3){
    const last3=_failPattern.slice(-3);
    const k0=JSON.stringify(last3[0]);
    if(last3.every(s=>JSON.stringify(s)===k0)) return last3[0];
  }
  return null;
}
/* ── systematic drift detector: a rolling window of SIGNED cent offsets
   (not pass/fail) across recent confident pitch readings. If most of them
   lean the same direction regardless of which note or hold, that's a
   calibration-drift signature — the reference point itself is off, not any
   one skill — so it suggests recalibrating instead of a playing correction. */
let _driftSamples=[], _driftSuggested=false;
function resetDrift(){ _driftSamples=[]; _driftSuggested=false; }
function trackDrift(offsets){
  if(!offsets || !offsets.length) return;
  _driftSamples.push(...offsets); if(_driftSamples.length>40) _driftSamples=_driftSamples.slice(-40);
  if(_driftSuggested || _driftSamples.length<20) return;
  const mean=_driftSamples.reduce((a,b)=>a+b,0)/_driftSamples.length;
  const sameSign=_driftSamples.filter(x=>Math.sign(x)===Math.sign(mean)).length/_driftSamples.length;
  if(Math.abs(mean)>=15 && sameSign>=0.7){
    _driftSuggested=true;
    const dir = mean>0 ? 'أعلى' : 'أخفض';
    showDervish(`لاحظت نمطًا عبر محاولاتك الأخيرة: طبقتك تميل باستمرار ${dir} من كل هدف تقريبًا، بمقدار شبه ثابت (${Math.abs(mean).toFixed(0)} سنتًا في المتوسط). هذا النمط المنتظم عبر نغمات مختلفة غالبًا يعني أن معايرة نايك نفسها تحتاج تحديثًا، لا مهارتك — جرّب إعادة المعايرة بنفَس هادئ ومسترخٍ من الصفحة الرئيسية.`, {sticky:true});
  }
}
function scoreExchange(d){
  const b=TR.beatSec, slide=Math.min(0.25*b,0.18), reps=TR.reps, lead=exLeadBeats(curDay)*b;
  const noteAt=i=>(i%2===0?0:TR.span);
  const holds=[];
  for(let i=0;i<=reps;i++){
    // hold 0 starts from SILENCE (the pickup beats, not a sounding note) —
    // every other hold continues from an already-sounding note, so it has no
    // onset delay to absorb. At fast tempos this left hold-0 as little as
    // 175ms to capture a stable reading — not enough for breath onset to
    // settle. Give it a gentler trailing margin instead of the standard cut.
    const start=lead+i*b+(i===0?0.15:slide+0.05);
    const end=(i===0)?lead+b-slide*0.4-0.02:(i<reps)?lead+(i+1)*b-slide-0.05:lead+i*b+TR_EX_TAIL-0.05;
    // plausibility filter: a reading more than 400¢ from BOTH this exercise's
    // notes is a register-jump artifact (rare, real, but not this hold's pitch)
    // — exclude it from the median instead of letting it skew the result.
    // plausibility filter: threshold scales with the exchange's own span so
    // narrow exchanges (e.g. a semitone) aren't left with a proportionally
    // loose filter, and wide ones aren't left with a proportionally tight one
    // — 2x span matches the original 200¢-exchange design ratio, with a floor
    // so very narrow exchanges still tolerate normal pitch variance.
    const plausTol = Math.max(250, TR.span*2);
    const raw=d.pts.filter(p=>p.t>=start&&p.t<end).map(p=>p.c);
    const seg=raw.filter(c=>Math.abs(c-0)<=plausTol || Math.abs(c-TR.span)<=plausTol);
    const med=seg.length?median(seg):(raw.length?median(raw):null); // fall back to raw if EVERY point looked implausible, rather than silently dropping the hold
    holds.push({i, med, ok: med!=null && Math.abs(med-noteAt(i))<=TOL});
  }
  let maxGap=0;
  for(let i=0;i<reps;i++){
    const wStart=lead+(i+1)*b-slide-0.05, wEnd=lead+(i+1)*b+slide+0.15;
    const seg=d.pts.filter(p=>p.t>=wStart&&p.t<=wEnd);
    let gap=0; seg.forEach((p,idx,arr)=>{ if(idx>0){ const offBoth=Math.abs(p.c-noteAt(i))>TOL && Math.abs(p.c-noteAt(i+1))>TOL; if(offBoth) gap+=(p.t-arr[idx-1].t); } });
    maxGap=Math.max(maxGap,gap);
  }
  const missed=holds.filter(h=>!h.ok);
  const nullHolds=holds.filter(h=>h.med==null).length;
  let ok=false,head='',body='',cls='retry',lowConf=false,graceThisAttempt=false;
  const prevBeat=b;
  if(nullHolds>Math.floor(holds.length/2)){
    lowConf=true; cls='retry';
    head='لم أستطع الحكم بثقة كافية';
    body=`لم ألتقط طبقة واضحة في معظم الوقفات (${toAr(nullHolds)} من ${toAr(holds.length)}) — على الأرجح ضوضاء في الغرفة أو بُعد عن الميكروفون، لا خطأ في عزفك. هذه المحاولة لا تُحتسب ضدّك ولا تكسر سلسلتك؛ أعِد في بيئة أهدأ.`;
  }
  else if(missed.length){
    const m=missed[0];
    const dir = m.med==null ? 'missing' : (m.med>noteAt(m.i) ? 'sharp' : 'flat');
    const pattern = checkFailPattern({hold:m.i, dir});
    if(pattern && pattern.hold===reps && pattern.dir==='sharp'){
      head='نمط متكرّر: النغمة الأخيرة ترتفع'; _failPattern=[];
      body=`لاحظت أن نغمتك الأخيرة في كل دورة ترتفع باستمرار — هذا يحدث غالبًا من إرهاق النفَس بحلول نهاية التكرار. خذ نفَسًا أعمق وأهدأ قبل أن تبدأ الدورة كلها، ولا تدفع الهواء أقوى كلما اقتربت من النهاية.`;
      showDervish(body, {sticky:true});
    } else if(pattern){
      head='نمط متكرّر يستحق انتباهك'; _failPattern=[];
      const dirAr = pattern.dir==='sharp'?'ترتفع':(pattern.dir==='flat'?'تنخفض':'تغيب');
      body=`الوقفة رقم ${toAr(pattern.hold+1)} تحديدًا ${dirAr} بتكرار في محاولاتك الأخيرة. ركّز عليها وحدها للحظة قبل إعادة الدورة كاملة.`;
      showDervish(body, {sticky:true});
    } else {
      head = m.med==null ? 'فاتتك إحدى الوقفات' : 'انحراف في إحدى النغمات';
      body = m.med==null ? `لم أسمعك ثابتًا عند الوقفة رقم ${toAr(m.i+1)}. حافظ على العزف مع كل نبضة.`
        : `عند الوقفة ${toAr(m.i+1)} انحرفت الطبقة ${Math.abs(m.med-noteAt(m.i)).toFixed(0)} سنت. تابع المترونوم بدقة أكبر.`;
    }
    const nearFinalF=prevBeat<=curDay.beatMin+curDay.stepDown+0.01;
    if(nearFinalF && !exGraceUsed){ exGraceUsed=true; graceThisAttempt=true; body+=' لديك فرصة أخرى عند نفس السرعة قبل أن نتراجع — جرّبها الآن.'; }
    else { exGraceUsed=false; TR.beatSec = Math.min(curDay.beatStart, +(prevBeat+curDay.stepUp).toFixed(2)); }
  } else if(maxGap>0.4){ head='بعض الانتقالات غير نظيفة'; body=`أطول فجوة بين نغمتين ${Math.round(maxGap*1000)} مللي ثانية. انتقل أسرع مع كل نبضة.`;
    const nearFinalG=prevBeat<=curDay.beatMin+curDay.stepDown+0.01;
    if(nearFinalG && !exGraceUsed){ exGraceUsed=true; graceThisAttempt=true; body+=' لديك فرصة أخرى عند نفس السرعة قبل أن نتراجع — جرّبها الآن.'; }
    else { exGraceUsed=false; TR.beatSec = Math.min(curDay.beatStart, +(prevBeat+curDay.stepUp*0.5).toFixed(2)); }
  }
  else { ok=true; cls='ok'; attempts++; _failPattern=[]; exGraceUsed=false; head=`تبادل نظيف (${toAr(attempts)}/${toAr(NEED)})`;
    exHoldCount++;
    // the final two tempo tiers (closest to the target) need more proof than
    // the earlier ones — his own data showed the real difficulty concentrates
    // right at the fastest speeds, not spread evenly across the whole ladder.
    const nearFinal = TR.beatSec <= curDay.beatMin + curDay.stepDown + 0.01;
    const holdNeeded = nearFinal ? 4 : 2;
    let speedMsg='';
    if(exHoldCount>=holdNeeded){
      const newBeat = Math.max(curDay.beatMin, +(prevBeat-curDay.stepDown).toFixed(2));
      exHoldCount=0;
      if(newBeat<prevBeat){
        TR.beatSec=newBeat;
        const justArrived = newBeat===curDay.beatMin && !exTargetReachedThisSession;
        if(justArrived) exTargetReachedThisSession=true;
        speedMsg=`نرفع السرعة الآن — نبضة كل ${TR.beatSec.toFixed(2)} ث. تبدأ سلسلة الإتقان من جديد عند هذه السرعة الجديدة.`;
        attempts=0; // mastery streak resets — the 7-consecutive bar must be proven at the tempo you've actually settled at
        if(justArrived){
          setTimeout(()=>offerSpeedLock(curDay.beatMin), 1100);
        }
      } else {
        speedMsg='أنت عند أسرع سرعة — أكمل نحو الإتقان الكامل هنا.';
      }
    } else if(attempts<NEED){ speedMsg=`ثبّت هذه السرعة ${toAr(holdNeeded-exHoldCount)} ${holdNeeded-exHoldCount===1?'مرّة':'مرّات'} أخرى قبل أن نُسرّع.`; }
    body=`أتقنت ${toAr(reps)} انتقالات متتالية، بأقصى فجوة ${Math.round(maxGap*1000)} مللي ثانية. ${speedMsg}`; }
  $('sessEyebrow').textContent=`${dayLabel(curDay.id)} · تبادل · ${TR.beatSec.toFixed(2)} ث (الهدف ${curDay.beatMin.toFixed(2)})`;
  if(!ok && !lowConf && !graceThisAttempt){ if(attempts>0){ body+=` — انقطعت السلسلة (كنت عند ${toAr(attempts)})، نبدأ من جديد.`; } attempts=0; exHoldCount=0; }
  if(!lowConf) registerAttemptResult(ok);
  if(!lowConf) trackDrift(holds.filter(h=>h.med!=null).map(h=>h.med-noteAt(h.i)));
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, low_confidence:lowConf, beat_sec:prevBeat,
    holds:holds.map(h=>({i:h.i,med:h.med!=null?+h.med.toFixed(1):null,ok:h.ok})),
    maxGapMs:Math.round(maxGap*1000), ts:new Date().toISOString()});
  $('resultZone').innerHTML=`<div class="stats">
      <div class="stat ${!missed.length?'g':'w'}"><div class="v">${holds.filter(h=>h.ok).length}/${holds.length}</div><div class="k">وقفات مضبوطة</div></div>
      <div class="stat ${maxGap<=0.4?'g':'b'}"><div class="v">${Math.round(maxGap*1000)}</div><div class="k">أطول فجوة (م.ث)</div></div>
      <div class="stat g"><div class="v">${prevBeat.toFixed(2)}</div><div class="k">سرعة المحاولة (ث/نبضة)</div></div>
    </div><div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  renderPips();
  if(attempts>=NEED) setTimeout(()=>finishDay({bestGapMs:Math.round(maxGap*1000), bestHoldsOk:holds.filter(h=>h.ok).length, fastestBeatSec:TR.beatSec}),900);
}

