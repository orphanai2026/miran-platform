/* ================= TRANSITION EXERCISE ================= */
let TR_HOLD_FROM=2.2, TR_MOVE=0.35, TR_HOLD_TO=2.6; // seconds — now rung-adjustable, see holdLadder
let TR_END=TR_HOLD_FROM+TR_MOVE+TR_HOLD_TO;
/* ── TRANSITION / EXCHANGE, drawn inside the reed ──
   Two notes, so two fingerings sit side by side above the cane and the
   ACTIVE one lights up as the target moves. The air column morphs between
   the two pitches, and the ball rides the bore vertically. yT() keeps its
   old contract (cents → y) so all scoring code is untouched. */
const TR_CMIN=-70, TR_CMAX=270;
function yT(c){
  const {R,cy}=REED.L?REED:reedGeom();
  const k=(Math.max(TR_CMIN,Math.min(TR_CMAX,c))-TR_CMIN)/(TR_CMAX-TR_CMIN);
  return (cy+R*0.9) - k*(R*1.8);
}
function activeTargetCents(now){
  if(now<TR_HOLD_FROM) return 0;
  if(now<TR_HOLD_FROM+TR_MOVE){ const k=(now-TR_HOLD_FROM)/TR_MOVE; return TR.span*(0.5-0.5*Math.cos(k*Math.PI)); }
  return TR.span; }

/* two fingerings, side by side — the active one is lit, the other dimmed */
function drawPairLane(fA, fB, arA, arB, activeIsB){
  const mx=ORB.cx, gap=94;
  [[fA,arA,mx-gap,!activeIsB],[fB,arB,mx+gap,activeIsB]].forEach(([f,ar,px,on])=>{
    cx.textAlign='center';
    cx.save();
    if(on){ cx.shadowColor='rgba(230,184,92,.5)'; cx.shadowBlur=13; }
    cx.globalAlpha = on?1:0.42;
    cx.fillStyle='#F7DCA0'; cx.font=(on?"700 25px ":"700 20px ")+"'Aref Ruqaa',serif";
    cx.fillText(ar, px, 32);
    cx.restore();
    if(!f) return;
    cx.save(); cx.globalAlpha = on?1:0.38;
    const tw=84, tx=px-tw/2, ty=52;
    for(let i=0;i<6;i++) drawHole(tx+(i+0.5)*(tw/6), ty, 4.4, 4.4, f.note.front[i]);
    drawHole(tx-15, ty, 3.8, 3.8, f.note.thumb);
    cx.restore();
  });
  // the arrow between them shows the direction of travel
  cx.save(); cx.globalAlpha=.7; cx.strokeStyle=C.live; cx.lineWidth=1.6;
  cx.beginPath(); cx.moveTo(mx-24,42); cx.lineTo(mx+24,42); cx.stroke();
  cx.beginPath(); cx.moveTo(mx+24,42); cx.lineTo(mx+17,38); cx.moveTo(mx+24,42); cx.lineTo(mx+17,46); cx.stroke();
  cx.restore();
}
function drawTransitionBg(now, targetFn){
  if(!curDay || !curDay.from || !curDay.to) return null; // a stale delayed call from a day we've since navigated away from — nothing to draw
  const fn = targetFn || activeTargetCents;
  drawReedGround(); reedGeom();
  const at=fn(now);
  const fA=fingeringFor(curDay.from.semis), fB=fingeringFor(curDay.to.semis);
  drawPairLane(fA,fB,curDay.from.note,curDay.to.note, at>TR.span*0.5);
  // the cane wears whichever fingering is currently targeted
  drawCane(at>TR.span*0.5 ? fB : fA);
  // the air column morphs between the two pitches
  const calm = 1 - Math.min(1, Math.abs(at-(at>TR.span*0.5?TR.span:0))/Math.max(1,TR.span))*0.8;
  drawAirColumn(calm, now*8);
  // target band inside the bore
  const ay=yT(at), {x0,L}=REED;
  cx.strokeStyle='rgba(79,227,193,.85)'; cx.lineWidth=2;
  cx.beginPath(); cx.moveTo(x0,ay); cx.lineTo(x0+L,ay); cx.stroke();
  const tolPx=Math.abs(yT(0)-yT(TOL));
  cx.fillStyle='rgba(79,227,193,.13)'; cx.fillRect(x0,ay-tolPx,L,tolPx*2);
  return {ay, tolU:tolPx};
}
function drawTransitionIdle(){
  if(!curDay || !curDay.from || !curDay.to) return; // stale delayed call — nothing to draw safely
  drawTransitionBg(0);
  drawMouthGauge('0.0', 0, 'ثانية');
  drawExitStreak(attempts||0, NEED||7);
  cx.fillStyle=C.muted; cx.font="500 12px Cairo,sans-serif"; cx.textAlign='center';
  cx.fillText('اضغط «ابدأ» ثم ابدأ على '+curDay.from.note, ORB.cx, ORB.h-32);
  cx.textAlign='start';
  drawContextStrip(dayLabel(curDay.id)+' · '+(curDay.kind==='exchange'?'تبادل':'انتقال'),
    curDay.kind==='exchange'&&TR?(TR.beatSec.toFixed(2)+' ث (الهدف '+curDay.beatMin.toFixed(2)+')'):'');
}
function cueChime(){ if(!audioCtx)return; const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.frequency.value=880; g.gain.value=0.0001; o.connect(g).connect(audioCtx.destination); o.start();
  g.gain.exponentialRampToValueAtTime(0.28,audioCtx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.3); o.stop(audioCtx.currentTime+0.32); }

function startTransition(){
  recording=true; $('btnRecLabel').textContent='إلغاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  recData={t0:performance.now(),pts:[],voiced:[]}; setupCanvas(); _tail=[]; _rings=[]; _lastTs=0; recData._cued=false;
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000, nowS=performance.now()/1000;
    if(!recData._cued && now>=TR_HOLD_FROM){ recData._cued=true; cueChime(); }
    const {ay,tolU}=drawTransitionBg(now);
    const inTune=p.hz && p.clarity>=CLARITY; let c=null;
    if(inTune){ c=centsBetween(p.hz,TR.fromHz); while(c-100>600)c-=1200; while(c-100<-600)c+=1200; recData.pts.push({t:now,c}); }
    recData.voiced.push({t:now,on:inTune});
    // ball + tail
    const dt=Math.min(0.05,(nowS-_lastTs)||0.016); _lastTs=nowS;
    if(inTune){ const py=yT(c); const at=activeTargetCents(now);
      const nearActive=Math.abs(c-at)<=TOL; const offBoth=Math.abs(c-0)>TOL && Math.abs(c-TR.span)>TOL;
      _tail.push({x:ORB.cx,y:py,ok:!offBoth}); if(_tail.length>60)_tail.shift();
      for(let i=1;i<_tail.length;i++){const a=i/_tail.length,s=_tail[i];
        cx.strokeStyle=(s.ok?'rgba(79,227,193,':'rgba(255,179,71,')+(a*.7).toFixed(3)+')'; cx.lineWidth=1+a*2.5;
        cx.beginPath(); cx.moveTo(_tail[i-1].x,_tail[i-1].y); cx.lineTo(s.x,s.y); cx.stroke(); }
      const col=nearActive?C.live:(offBoth?C.breath:C.muted);
      const g=cx.createRadialGradient(ORB.cx,py,1,ORB.cx,py,24); g.addColorStop(0,nearActive?'rgba(79,227,193,.5)':'rgba(255,179,71,.4)'); g.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=g; cx.beginPath(); cx.arc(ORB.cx,py,24,0,7); cx.fill();
      cx.fillStyle=col; cx.beginPath(); cx.arc(ORB.cx,py,10,0,7); cx.fill();
      cx.fillStyle='rgba(255,255,255,.85)'; cx.beginPath(); cx.arc(ORB.cx-3,py-3,3,0,7); cx.fill();
    } else { cx.fillStyle='rgba(155,146,184,.5)'; cx.beginPath(); cx.arc(ORB.cx,ay,7,0,7); cx.fill(); }
    // anatomy gauges: breath at the mouth, mastery at the open end
    drawMouthGauge(now.toFixed(1), now/TR_END, 'ثانية');
    drawExitStreak(attempts||0, NEED||7);
    const phase = now<TR_HOLD_FROM ? ('اثبت على '+curDay.from.note)
                : (now<TR_HOLD_FROM+TR_MOVE ? ('الآن → '+curDay.to.note) : ('اثبت على '+curDay.to.note));
    drawContextStrip(dayLabel(curDay.id)+' · انتقال', phase, 'rgba(79,227,193,.75)');
    $('sustainNum').textContent=Math.min(now,TR_END).toFixed(1);
    $('sustainBar').style.width=Math.min(100,(now/TR_END)*100)+'%';
    if(now>=TR_END) stopAttempt();
  };
}
function scoreTransition(d){
  const P=t0=>d.pts.filter(p=>p.t>=t0[0]&&p.t<t0[1]).map(p=>p.c);
  const fromSeg=P([0.6,TR_HOLD_FROM-0.1]), toSeg=P([TR_HOLD_FROM+TR_MOVE+0.5, TR_END]);
  const fromM=fromSeg.length?median(fromSeg):null, toM=toSeg.length?median(toSeg):null;
  const reachedFrom = fromM!=null && Math.abs(fromM-0)<=TOL;
  const reachedTo   = toM!=null && Math.abs(toM-TR.span)<=TOL;
  const fromNote=curDay.from.note, toNote=curDay.to.note;
  // transition gap: voiced time in the cue window where off BOTH notes
  const winPts=d.voiced.filter(v=>v.t>=TR_HOLD_FROM-0.1 && v.t<=TR_HOLD_FROM+TR_MOVE+0.9);
  let gap=0; d.pts.filter(p=>p.t>=TR_HOLD_FROM-0.1 && p.t<=TR_HOLD_FROM+TR_MOVE+0.9)
    .forEach((p,i,arr)=>{ if(i>0 && Math.abs(p.c-0)>TOL && Math.abs(p.c-TR.span)>TOL) gap+=(p.t-arr[i-1].t); });
  let ok=false,head='',body='',cls='retry';
  if(!reachedFrom){
    const pattern=checkFailPattern({k:curDay.id,r:'from-missed'});
    if(pattern){ head=`نمط متكرّر: لا تثبت على ${fromNote}`; _failPattern=[];
      body=`نغمة البداية ${fromNote} تفوتك بتكرار — تأكّد أنك مستقرّ عليها تمامًا قبل أن تبدأ المحاولة، لا في لحظة الضغط على «ابدأ».`; }
    else { head=`ابدأ ثابتًا على ${fromNote}`; body=`لم أسمع ${fromNote} ثابتة في البداية. اعزف ${fromNote} واثبت لحظة قبل الإشارة.`; }
  }
  else if(!reachedTo){
    if(toM==null||toM<TR.span-TOL){
      const pattern=checkFailPattern({k:curDay.id,r:'to-under'});
      if(pattern){ head=`نمط متكرّر: لا تصل إلى ${toNote}`; _failPattern=[];
        body=`طبقتك تتوقّف قبل ${toNote} بتكرار — قد تكون تفتح الثقب جزئيًّا لا كاملًا. تأكّد من فتح الثقب المطلوب دفعة واحدة وبثقة.`; }
      else { head=`لم تصل إلى ${toNote}`; body=`دعِ النغمة تصعد إلى ${toNote} وتثبت.`; }
    }
    else {
      const pattern=checkFailPattern({k:curDay.id,r:'to-over'});
      if(pattern){ head=`نمط متكرّر: تتجاوز ${toNote} دائمًا`; _failPattern=[];
        body=`طبقتك ترتفع فوق ${toNote} بتكرار — نفخك يقوى أكثر مما يلزم عند الانتقال. خفّف ضغط النفخ تحديدًا في لحظة الوصول، لا طوال المحاولة.`; }
      else { head=`تجاوزت ${toNote}`; body=`ارتفعت فوق ${toNote} بـ${(toM-TR.span).toFixed(0)} سنت. خفّف ضغط النفخ قليلًا عند الوصول.`; }
    }
  }
  else if(gap>trGapMax){
    const pattern=checkFailPattern({k:curDay.id,r:'gap'});
    if(pattern){ head='نمط متكرّر: انتقالك بطيء دائمًا'; _failPattern=[];
      body=`نغمة عابرة تظهر بين ${fromNote} و${toNote} في كل محاولاتك الأخيرة — انتقالك تدريجي لا فوري. تدرّب على فتح/إغلاق الثقب بحركة إصبع واحدة حاسمة، لا انزلاقًا تدريجيًّا.`; }
    else { head='انتقال غير نظيف'; body=`ظهرت نغمة عابرة ${Math.round(gap*1000)} مللي ثانية بين ${fromNote} و${toNote} (وميض كهرماني في الذيل). انتقل أسرع: افتح الثقب دفعة واحدة.`; }
  }
  else { ok=true; cls='ok'; attempts++; _failPattern=[]; head=`انتقال نظيف (${toAr(attempts)}/${toAr(NEED)})`; body=`ثبتّ على ${fromNote}، وقطعت المسافة إلى ${toNote} بنظافة (${Math.round(gap*1000)} مللي ثانية) ووصلت بدقة. ${attempts<NEED?'أعِد — نحتاج '+toAr(NEED)+' متتالية.':''}`; }
  if(!ok){ if(attempts>0){ body+=` — انقطعت السلسلة (كنت عند ${toAr(attempts)})، نبدأ من جديد.`; } attempts=0; }
  registerAttemptResult(ok);
  sessionLog.attempts.push({n:sessionLog.attempts.length+1,success:ok,from_cents:fromM!=null?+fromM.toFixed(1):null,to_cents:toM!=null?+toM.toFixed(1):null,gap_ms:Math.round(gap*1000),ts:new Date().toISOString()});
  $('resultZone').innerHTML=`<div class="stats">
      <div class="stat ${reachedFrom?'g':'w'}"><div class="v">${fromM!=null?(fromM>=0?'+':'')+fromM.toFixed(0):'—'}</div><div class="k">${fromNote} (سنت)</div></div>
      <div class="stat ${reachedTo?'g':'w'}"><div class="v">${toM!=null?(toM-TR.span>=0?'+':'')+(toM-TR.span).toFixed(0):'—'}</div><div class="k">${toNote} (انحراف)</div></div>
      <div class="stat ${gap<=trGapMax?'g':'b'}"><div class="v">${Math.round(gap*1000)}</div><div class="k">فجوة الانتقال (م.ث)</div></div>
    </div><div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  renderPips();
  if(attempts>=NEED){
    if(trRung>=0 && trRung<curDay.tolLadder.length-1){
      setTimeout(()=>{
        trRung++; attempts=0;
        TOL=curDay.tolLadder[trRung]; trGapMax=curDay.gapLadder[trRung]; NEED=curDay.rungNeed[trRung];
        if(curDay.holdFromLadder){ TR_HOLD_FROM=curDay.holdFromLadder[trRung]; TR_HOLD_TO=curDay.holdToLadder[trRung]; TR_END=TR_HOLD_FROM+TR_MOVE+TR_HOLD_TO; }
        $('sessEyebrow').textContent=`${dayLabel(curDay.id)} · انتقال · الدرجة ${toAr(trRung+1)}/${toAr(curDay.tolLadder.length)}`;
        $('resultZone').innerHTML=`<div class="msg ok"><div class="head">رفعنا المستوى!</div>الهامش صار أضيق (±${TOL}¢) — تبدأ سلسلة الإتقان من جديد عند هذه الدرجة.</div>`;
        renderPips();
      },900);
    } else {
      setTimeout(()=>finishDay({bestGapMs:Math.round(gap*1000), bestToOffset:toM!=null?+(toM-TR.span).toFixed(1):0}),900);
    }
  }
}

