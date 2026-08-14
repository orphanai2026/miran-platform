/* ================= BREATH (foundational, pitch-agnostic) ================= */
let breathRung=0, breathTarget=3;
function openBreath(review){
  curDay=BREATH; _breathReview=!!review;
  breathRung = review ? BREATH.rungs.length-1 : (prog.foundation.rung||0);
  breathTarget=BREATH.rungs[breathRung];
  sessionLog={app:'miran', version:APP_VERSION, stage:'breath', review:_breathReview, rung:breathRung+1, target_sec:breathTarget, started:new Date().toISOString(), attempts:[]};
  $('sessEyebrow').textContent = review ? `مراجعة النفَس · ${breathTarget.toFixed(0)} ثوانٍ` : `مرحلة النفَس · الدرجة ${toAr(breathRung+1)}/${toAr(BREATH.rungs.length)}`;
  setGlyphText('✦'); $('sessLat').textContent=''; $('targetHz').textContent='أيّ نغمة';
  $('sustainLabel').textContent='مدة النفَس الثابت'; $('targetSec').textContent=breathTarget.toFixed(1);
  $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('sustainBar').style.width='0%';
  // pips reflect ladder rungs
  $('pips').innerHTML=''; for(let i=0;i<BREATH.rungs.length;i++){const d=document.createElement('div');d.className='pip'+(i<breathRung?' done':'');$('pips').appendChild(d);}
  if(!review && !prog.foundation.diaphragmSeen){
    prog.foundation.diaphragmSeen=true; saveProg();
    setIntroBlocking(true);
    _introTimeout=setTimeout(()=>showDervish(DERVISH.introDiaphragm[0],
      {audioKey:'intro_diaphragm', blocking:true, onEnd:()=>dervishIntroFor(BREATH)}), 500);
  } else {
    dervishIntroFor(BREATH);
  }
  syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawBreathIdle();},40);
}
let _breathReview=false;
/* the ney's own growth knots (عُقَد) along the cane — a real anatomical
   feature repurposed as the breath stage's achievement marker. Each of the
   5 rungs lights one knot gold when mastered; the current rung's knot
   breathes gently; future ones stay as quiet dark rings. */
function drawBreathNodes(rung){
  const {x0,L,R,cy}=REED, n=BREATH.rungs.length;
  const best = prog.foundation.bestSec||[];
  for(let i=0;i<n;i++){
    const nx = x0 + L*(0.12 + i*0.76/(n-1));
    const ny = cy - R - 13;
    const done = i<rung, current = i===rung;
    if(i<n-1 && i<rung){ // the stem only grows as far as you've actually mastered
      cx.strokeStyle='rgba(230,184,92,.45)'; cx.lineWidth=1.4; cx.beginPath();
      cx.moveTo(nx+6, ny); cx.lineTo(x0+L*(0.12+(i+1)*0.76/(n-1))-6, ny); cx.stroke();
    } else if(i<n-1){
      cx.strokeStyle='rgba(155,146,184,.12)'; cx.lineWidth=.8; cx.setLineDash([1,3]); cx.beginPath();
      cx.moveTo(nx+6, ny); cx.lineTo(x0+L*(0.12+(i+1)*0.76/(n-1))-6, ny); cx.stroke(); cx.setLineDash([]);
    }
    cx.save();
    if(done||current){ cx.shadowColor = done?'rgba(230,184,92,.7)':'rgba(79,227,193,.6)'; cx.shadowBlur = current?10:6; }
    cx.beginPath(); cx.arc(nx, ny, current?5.2:4, 0, 7);
    cx.fillStyle = done?'rgba(230,184,92,.92)':(current?'rgba(79,227,193,.85)':'#0a0818');
    cx.fill();
    cx.strokeStyle = done?'rgba(247,220,160,.9)':(current?'rgba(79,227,193,1)':'rgba(155,146,184,.35)');
    cx.lineWidth = current?1.6:1.1; cx.stroke();
    cx.restore();
    // real seconds achieved for mastered rungs; the target for current/future
    const label = done ? (best[i]!=null?best[i].toFixed(1):BREATH.rungs[i])+'s' : BREATH.rungs[i]+'s';
    cx.fillStyle = done?'rgba(230,184,92,.85)':(current?'rgba(79,227,193,.85)':'rgba(155,146,184,.4)');
    cx.font = "600 7px 'IBM Plex Mono',monospace"; cx.textAlign='center';
    cx.fillText(label, nx, ny+14); cx.textAlign='start';
  }
}
function drawBreathBg(){ drawReedGround(); reedGeom(); drawCane(null); }
function drawBreathIdle(){ drawBreathBg();
  drawAirColumn(1,0);
  drawMouthGauge('0.0', 0, 'ثانية');
  drawBreathNodes(breathRung||0);
  cx.textAlign='center'; cx.fillStyle='#F7DCA0'; cx.font="700 24px 'Aref Ruqaa',serif";
  cx.save(); cx.shadowColor='rgba(230,184,92,.45)'; cx.shadowBlur=12;
  cx.fillText('✦ النفَس', ORB.cx, 34); cx.restore();
  cx.fillStyle='rgba(155,146,184,.6)'; cx.font="600 9.5px Cairo,sans-serif";
  cx.fillText('أيّ نغمة — المهم الثبات والصفاء', ORB.cx, 52);
  cx.fillStyle=C.muted; cx.font="500 12px Cairo,sans-serif";
  cx.fillText('خذ نفَسًا عميقًا من البطن، ثم أصدر صوتًا ثابتًا', ORB.cx, ORB.h-32);
  cx.textAlign='start';
  drawContextStrip('مرحلة النفَس · الدرجة '+toAr((breathRung||0)+1)+'/'+toAr(BREATH.rungs.length), '');
}
function drawDynamicIdle(){ drawBreathBg();
  drawAirColumn(1,0);
  drawMouthGauge('0.0', 0, 'ثانية');
  cx.textAlign='center'; cx.fillStyle='#F7DCA0'; cx.font="700 24px 'Aref Ruqaa',serif";
  cx.save(); cx.shadowColor='rgba(230,184,92,.45)'; cx.shadowBlur=12;
  cx.fillText('◐ التحكّم الديناميكي', ORB.cx, 34); cx.restore();
  cx.fillStyle='rgba(155,146,184,.6)'; cx.font="600 9.5px Cairo,sans-serif";
  cx.fillText('أيّ نغمة — ابدأ خافتًا وانتهِ أقوى', ORB.cx, 52);
  cx.fillStyle=C.muted; cx.font="500 12px Cairo,sans-serif";
  cx.fillText('نفَس واحد ثابت الطبقة، متدرّج الشدّة', ORB.cx, ORB.h-32);
  cx.textAlign='start';
  drawContextStrip('التحكّم الديناميكي · قبل النغمات', `${dynAttempts}/${DYN_NEED}`);
}
/* breath: the bore fills with light as you hold; steadiness keeps it calm */
function renderBreath(runSec, voicedNow, steady){
  drawBreathBg();
  const frac=Math.min(1, runSec/Math.max(1,breathTarget));
  drawAirColumn(voicedNow?(steady?1:0.25):0, _threadStep++);
  if(voicedNow) drawBreathParticles(_threadStep, steady?1:0.2);
  // fill the bore progressively — the reed lights up as the breath lasts
  const {x0,L,R,cy}=REED;
  cx.save(); cx.globalAlpha=.16;
  const g=cx.createLinearGradient(x0,0,x0+L*frac,0);
  g.addColorStop(0, steady?'rgba(79,227,193,.9)':'rgba(255,179,71,.8)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=g; cx.fillRect(x0,cy-R,L*frac,R*2); cx.restore();
  drawBreathNodes(breathRung);
  drawMouthGauge(runSec.toFixed(1), frac, 'ثانية', steady?C.breath:'#FF9B78');
  drawNodeReadout(steady?'✓':'~', steady?'صافٍ':'يهتزّ', steady?C.live:C.breath);
  cx.textAlign='center'; cx.fillStyle='#F7DCA0'; cx.font="700 22px 'Aref Ruqaa',serif";
  cx.fillText('✦ النفَس', ORB.cx, 32);
  cx.fillStyle='rgba(155,146,184,.6)'; cx.font="600 9.5px Cairo,sans-serif";
  cx.fillText('الهدف '+breathTarget.toFixed(0)+' ثوانٍ', ORB.cx, 50); cx.textAlign='start';
  drawContextStrip('مرحلة النفَس · الدرجة '+toAr(breathRung+1)+'/'+toAr(BREATH.rungs.length),
    !voicedNow?'أصدر صوتًا':(steady?(frac>=1?'تجاوزت الهدف — أطِل!':'صوتٌ صافٍ'):'صوتك يهتزّ'),
    steady?'rgba(79,227,193,.75)':'rgba(255,179,71,.8)');
}
function startBreath(){
  recording=true; $('btnRecLabel').textContent='إنهاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  recData={t0:performance.now(),voiced:[],samp:[]}; setupCanvas();
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000;
    const voiced = !!(p.hz && p.clarity>=CLARITY); // ANY pitch counts
    recData.voiced.push({t:now,on:voiced});
    if(voiced) recData.samp.push({t:now, hz:p.hz});
    const run=longestRun(recData.voiced);
    // live steadiness: jitter over the last ~1.2s of voiced samples
    const recent=recData.samp.filter(s=>s.t>=now-1.2);
    let steady=true;
    if(recent.length>=6){ const med=median(recent.map(s=>s.hz)); const jit=std(recent.map(s=>1200*Math.log2(s.hz/med))); steady=jit<=BREATH.jitterMax; }
    renderBreath(run, voiced, steady);
    $('sustainNum').textContent=run.toFixed(1); $('sustainBar').style.width=Math.min(100,(run/breathTarget)*100)+'%';
    if(voiced) recData._lastVoiced=now;
    const endedBlowing = recData._lastVoiced!=null && (now-recData._lastVoiced)>0.8 && run>=0.5;
    if(endedBlowing) stopAttempt(); else if(recData._lastVoiced==null && now>6) stopAttempt(); else if(now>45) stopAttempt();
  };
}
function scoreBreath(d){
  const w=longestRunWindow(d.voiced); const run=w.dur;
  const inWin=(d.samp||[]).filter(s=>s.t>=w.start-0.05 && s.t<=w.end+0.05);
  const rawMedHz=inWin.length?median(inWin.map(s=>s.hz)):0;
  // plausibility filter: a reading more than 400¢ from the run's own median
  // is a register-jump/tracking artifact, not real vocal jitter — exclude it
  // from the jitter measurement (same principle already applied to exchange).
  const plausible = rawMedHz ? inWin.filter(s=>Math.abs(1200*Math.log2(s.hz/rawMedHz))<=400) : inWin;
  const cleanSamples = plausible.length>=6 ? plausible : inWin; // never drop below a usable sample size
  const medHz=cleanSamples.length?median(cleanSamples.map(s=>s.hz)):0;
  const jitter=cleanSamples.length>=6? std(cleanSamples.map(s=>1200*Math.log2(s.hz/medHz))) : 999;
  // confidence gate: if a real sustained sound was heard (run is fine) but
  // very little of it carried a trustworthy pitch reading, this is a signal
  // problem, not a real jitter failure — don't judge it either way.
  const expectedSamples = run*10; // ~10 pitch samples/sec is the normal rate
  const lowConf = run>=breathTarget && expectedSamples>6 && (inWin.length/expectedSamples)<0.35;
  const longEnough = run>=breathTarget;
  const steadyEnough = jitter<=BREATH.jitterMax;
  const ok = !lowConf && longEnough && steadyEnough;
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, low_confidence:lowConf, sustained_sec:+run.toFixed(2), target_sec:breathTarget, jitter_cents:+jitter.toFixed(1), ts:new Date().toISOString()});
  if(!lowConf) registerAttemptResult(ok);
  let head,body,cls;
  if(lowConf){
    cls='retry';
    head='لم أستطع الحكم بثقة كافية';
    body=`أطلت نفَسك ${run.toFixed(1)} ثانية، لكن جودة الإشارة كانت منخفضة جدًّا لقياس ثباته بدقّة — على الأرجح ضوضاء في الغرفة أو بُعد عن الميكروفون. هذه المحاولة لا تُحتسب ضدّك؛ أعِد في بيئة أهدأ أو اقترب قليلًا من الميكروفون.`;
    $('resultZone').innerHTML=`<div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
    return;
  }
  if(ok){
    cls='ok';
    if(_breathReview){
      head='نفَس ممتاز'; body=`أطلت نفَسك ${run.toFixed(1)} ثانية بصوتٍ صافٍ ثابت — مراجعة ناجحة.`;
      prog.foundation.lastBreathAt=new Date().toISOString(); saveProg();
      $('resultZone').innerHTML=`<div class="msg ok"><div class="head">${head}</div>${body}</div>`;
      return;
    }
    prog.foundation.bestSec = prog.foundation.bestSec || [];
    prog.foundation.bestSec[breathRung] = +run.toFixed(1); // the rung just mastered
    breathRung++; prog.foundation.rung=breathRung; saveProg();
    if(breathRung>=BREATH.rungs.length){
      head='اكتمل النفَس!'; body=`أطلت نفَسك ${run.toFixed(1)} ثانية بصوتٍ صافٍ ثابت. أنت جاهز للنغمات الآن.`;
      $('resultZone').innerHTML=`<div class="msg ok"><div class="head">${head}</div>${body}</div>`;
      setTimeout(finishBreath,900); return;
    }
    breathTarget=BREATH.rungs[breathRung];
    head=`درجة مكتملة (${toAr(breathRung)}/${toAr(BREATH.rungs.length)})`;
    body=`نفَسٌ ثابت وصافٍ ${run.toFixed(1)} ثانية (تذبذب ${jitter.toFixed(0)} سنت). الدرجة التالية: ${breathTarget.toFixed(0)} ثوانٍ.`;
    $('sessEyebrow').textContent=`مرحلة النفَس · الدرجة ${toAr(breathRung+1)}/${toAr(BREATH.rungs.length)}`;
    $('targetSec').textContent=breathTarget.toFixed(1);
    $('resultZone').innerHTML=`<div class="msg ok"><div class="head">${head}</div>${body}</div>`;
    $('pips').innerHTML=''; for(let i=0;i<BREATH.rungs.length;i++){const el=document.createElement('div');el.className='pip'+(i<breathRung?' done':'');$('pips').appendChild(el);}
  } else {
    cls='retry';
    if(!longEnough && !steadyEnough){ head='أطِل وثبّت'; body=`ثبتّ ${run.toFixed(1)} ثانية (الهدف ${breathTarget.toFixed(0)})، وصوتك اهتزّ ${jitter.toFixed(0)} سنت. خذ نفَسًا أعمق، وأطلق الهواء ببطءٍ ثابت لا يتموّج.`; }
    else if(!longEnough){ head='نفَسٌ أقصر قليلًا'; body=`صوتك كان صافيًا، لكنك ثبتّ ${run.toFixed(1)} ثانية والهدف ${breathTarget.toFixed(0)}. خذ نفَسًا أعمق من البطن وأطلقه أبطأ.`; }
    else { head='صوتك يهتزّ'; body=`أطلت نفَسك ${run.toFixed(1)} ثانية، لكن الطبقة تموّجت ${jitter.toFixed(0)} سنت (الحدّ ${BREATH.jitterMax}). ثبّت ضغط النفَس ولا ترخِ شفتيك — نريد صوتًا صافيًا لا يتذبذب.`; }
    $('resultZone').innerHTML=`<div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  }
}
function finishBreath(){
  prog.foundation.breath=true; prog.foundation.lastBreathAt=new Date().toISOString();
  if(prog.inProgress) delete prog.inProgress['breath']; saveProg(); stopAll();
  $('doneSub').textContent='اجتزت مرحلة النفَس — بوابة الرحلة فُتحت، والنغمات في انتظارك.';
  $('doneStats').innerHTML=`
    <div class="stat g"><div class="v">${BREATH.rungs[BREATH.rungs.length-1]}</div><div class="k">ثانية نفَس</div></div>
    <div class="stat g"><div class="v">✦</div><div class="k">النفَس أُتقن</div></div>
    <div class="stat g"><div class="v">${toAr(BREATH.rungs.length)}</div><div class="k">درجات</div></div>`;
  setTimeout(()=>dervishCelebrate(false), 400);
  show('done');
}

/* ── dynamic control: a genuinely different skill from duration — can you
   grow your volume deliberately (quiet → strong) while HOLDING the same
   pitch? Isolated on purpose, after breath-duration is already mastered,
   per the same "new skill = isolated first" principle used throughout. ── */
const DYN_TARGET=6, DYN_NEED=3;
let dynAttempts=0;
function openDynamicControl(){
  curDay={kind:'dynamic', id:'dynamic', title:'التحكّم الديناميكي'};
  sessionLog={app:'miran', version:APP_VERSION, stage:'dynamic', started:new Date().toISOString(), attempts:[]};
  $('sessEyebrow').textContent='التحكّم الديناميكي · قبل النغمات';
  setGlyphText('◐'); $('sessLat').textContent=''; $('targetHz').textContent='أيّ نغمة';
  $('sustainLabel').textContent='ابدأ خافتًا وانتهِ بصوت أقوى'; $('targetSec').textContent=DYN_TARGET.toFixed(1);
  $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('sustainBar').style.width='0%';
  $('pips').innerHTML=''; for(let i=0;i<DYN_NEED;i++){const el=document.createElement('div');el.className='pip'+(i<dynAttempts?' done':'');$('pips').appendChild(el);}
  if(!_seenIntro.has('dynamic')){ _seenIntro.add('dynamic');
    setIntroBlocking(true);
    _introTimeout=setTimeout(()=>showDervish(
      'ثبّت نغمة واحدة، لكن غيّر شدّة نفَسك هذه المرّة: ابدأ بصوت خافت جدًّا، وقوِّه تدريجيًّا حتى تنتهي بصوت قويّ واضح — بلا تغيير الطبقة نفسها.',
      {audioKey:'intro_dynamic', blocking:true}), 500);
  }
  syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawDynamicIdle();},40);
}
function startDynamic(){
  recording=true; $('btnRecLabel').textContent='إنهاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  recData={t0:performance.now(),voiced:[],samp:[]}; setupCanvas();
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000;
    const voiced = !!(p.hz && p.clarity>=CLARITY);
    recData.voiced.push({t:now,on:voiced});
    if(voiced) recData.samp.push({t:now, hz:p.hz, rms:p.rms||0});
    const run=longestRun(recData.voiced);
    renderBreath(run, voiced, true);
    $('sustainNum').textContent=run.toFixed(1); $('sustainBar').style.width=Math.min(100,(run/DYN_TARGET)*100)+'%';
    if(voiced) recData._lastVoiced=now;
    const endedBlowing = recData._lastVoiced!=null && (now-recData._lastVoiced)>0.8 && run>=0.5;
    if(endedBlowing) stopAttempt(); else if(recData._lastVoiced==null && now>6) stopAttempt(); else if(now>20) stopAttempt();
  };
}
function scoreDynamic(d){
  const w=longestRunWindow(d.voiced); const run=w.dur;
  const inWin=(d.samp||[]).filter(s=>s.t>=w.start-0.05 && s.t<=w.end+0.05);
  const longEnough = run>=DYN_TARGET*0.8;
  const early=inWin.filter(s=>s.t<=w.start+run*0.35), late=inWin.filter(s=>s.t>=w.end-run*0.35);
  const avg=arr=>arr.length?arr.reduce((a,b)=>a+b.rms,0)/arr.length:0;
  const earlyRms=avg(early), lateRms=avg(late);
  const ratio = earlyRms>0.0008 ? lateRms/earlyRms : (lateRms>0.008?99:0);
  const grew = ratio>=1.6; // late portion must be genuinely, deliberately louder — not incidental variation
  const expected=run*8;
  const lowConf = longEnough && expected>6 && (inWin.length/expected)<0.35;
  const ok = !lowConf && longEnough && grew;
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, low_confidence:lowConf,
    sustained_sec:+run.toFixed(2), early_rms:+earlyRms.toFixed(4), late_rms:+lateRms.toFixed(4), growth_ratio:+ratio.toFixed(2), ts:new Date().toISOString()});
  let head,body,cls;
  if(lowConf){
    cls='retry'; head='لم أستطع الحكم بثقة كافية';
    body='جودة الإشارة كانت منخفضة جدًّا لقياس شدّة صوتك بدقّة. أعِد في بيئة أهدأ أو اقترب من الميكروفون — هذه المحاولة لا تُحتسب ضدّك.';
  } else if(!longEnough){
    cls='retry'; head='نفَسك أقصر من الهدف';
    body=`استمررت ${run.toFixed(1)} ثانية من أصل ${DYN_TARGET} — أعطِ نفسك وقتًا كافيًا لتنمية الصوت تدريجيًّا، لا فجأة.`;
  } else if(!grew){
    cls='retry'; head='الشدّة لم تتغيّر بوضوح كافٍ';
    body='ابدأ أخفت ممّا فعلت، وانتهِ أقوى بوضوح — يجب أن يكون الفرق واضحًا للأذن، لا خفيًّا.';
  } else {
    cls='ok'; dynAttempts++;
    head=`تحكّم واضح (${toAr(dynAttempts)}/${toAr(DYN_NEED)})`;
    body = dynAttempts>=DYN_NEED
      ? 'أتقنت التحكّم الديناميكي — النغمات جاهزة لك الآن.'
      : `نمَت شدّة صوتك بوضوح (×${ratio.toFixed(1)}) على مدى ${run.toFixed(1)} ثانية. ${DYN_NEED-dynAttempts} محاولة أخرى.`;
  }
  $('resultZone').innerHTML=`<div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  if(cls==='ok' && dynAttempts>=DYN_NEED){
    prog.foundation.dynamicDone=true; saveProg();
    setTimeout(()=>{ $('doneSub').textContent='أتقنت التحكّم بشدّة صوتك — النغمات في انتظارك فعليًّا الآن.';
      $('doneStats').innerHTML=`<div class="stat g"><div class="v">◐</div><div class="k">تحكّم دينامي</div></div>
        <div class="stat g"><div class="v">${toAr(DYN_NEED)}</div><div class="k">محاولات ناجحة</div></div>`;
      dervishCelebrate(false); show('done'); }, 900);
  }
}

