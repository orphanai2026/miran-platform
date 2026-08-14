/* ================= RHYTHM (Phase 2 pilot — onset timing, pitch-agnostic) ================= */
let rhRung=-1, rhTolMs=250;
let rhBeatSec=1.1, rhHoldCount=0; // current tempo in an active rhythm session, and successes held at it
let rdRung=0, rdDrop=new Set();
function drawRhythmBg(){ drawReedGround(); reedGeom(); drawCane(null); }
function drawRhythmIdle(){
  if(!curDay || curDay.beatSec==null) return; // stale delayed call from a day we've since left — nothing to draw safely
  drawRhythmBg(); drawAirColumn(1,0);
  cx.textAlign='center'; cx.fillStyle='#F7DCA0'; cx.font="700 24px 'Aref Ruqaa',serif";
  cx.save(); cx.shadowColor='rgba(230,184,92,.45)'; cx.shadowBlur=12;
  cx.fillText('♩ الإيقاع', ORB.cx, 34); cx.restore();
  cx.fillStyle=C.muted; cx.font="500 12px Cairo,sans-serif";
  cx.fillText('اعزف نغمة قصيرة مع كل نبضة', ORB.cx, ORB.h-32); cx.textAlign='start';
  drawContextStrip(dayLabel(curDay.id)+' · إيقاع',
    'نبضة كل '+(curDay.kind==='rhythm'?rhBeatSec:curDay.beatSec).toFixed(2)+' ث'); }

/* the beats travel ALONG the bore — time flows the way the air flows */
function beatX(i,n){ const {x0,L}=REED; return x0 + (L*(i+0.5)/n); }
/* Kodály rhythm syllables — the SAME spoken system in the reference chart,
   applied to exercises we already train. Not a new skill: a spoken name
   for the rhythmic feel the trainee is already producing with their fingers. */
function kodalySyllable(i, subN, silent){
  if(silent) return '−';
  if(!subN || subN<=1) return 'تا';
  if(subN===2) return 'تِ';           // each half of a تِ-تِ (eighth) pair
  if(subN===4) return ['تُو','كُو','تُو','كُو'][i%4]; // تُوكُو-تُوكُو — chosen for the ney's lip-driven articulation, not a literal translation of tika-tika
  return 'تا';
}
// small drawn note-shape (filled/hollow head + stem + flag) so the written
// rhythmic symbol sits right on the beat it represents — live feedback, not
// a separate reference chart the trainee has to remember before playing.
function drawNoteShape(x, y, subN, isSub, col){
  const s=0.75; // scale
  cx.save(); cx.strokeStyle=col; cx.fillStyle=col; cx.lineWidth=1.3;
  const filled = subN>1 || true; // النوار والكروش والتوكو كلها رؤوس مملوءة في هذا المدى الإيقاعي
  cx.beginPath(); cx.ellipse(x-5*s, y, 4.2*s, 3.2*s, -0.35, 0, 7);
  if(filled) cx.fill(); else cx.stroke();
  cx.beginPath(); cx.moveTo(x-1.2*s, y-1.5*s); cx.lineTo(x-1.2*s, y-16*s); cx.stroke();
  if(subN>=2){ // flag for eighth/sixteenth-style points
    cx.beginPath(); cx.moveTo(x-1.2*s, y-16*s);
    cx.quadraticCurveTo(x+7*s, y-13*s, x+4*s, y-6*s);
    cx.stroke();
  }
  if(subN>=4 && isSub){ // second flag for the finer توكو-توكو subdivision
    cx.beginPath(); cx.moveTo(x-1.2*s, y-11*s);
    cx.quadraticCurveTo(x+6*s, y-8*s, x+3.5*s, y-2*s);
    cx.stroke();
  }
  cx.restore();
}
function drawBeatRow(beats, hits, curBeatIdx, dropSet, subN){
  const n=beats.length, {cy,R}=REED, sub=subN||1;
  const by=cy+R*0.62;
  cx.strokeStyle='rgba(74,59,122,.5)'; cx.lineWidth=1;
  cx.beginPath(); cx.moveTo(beatX(0,n),by); cx.lineTo(beatX(n-1,n),by); cx.stroke();
  for(let i=0;i<n;i++){
    const px=beatX(i,n), st=hits[i], active=i===curBeatIdx;
    const isSub = sub>1 && (i%sub!==0); // a mid-beat subdivision point, not the beat itself
    const rad = isSub?4.2:6; // sub-points read as visually secondary to the real beat
    const silent = dropSet && dropSet.has(i);
    const col = st===true?C.live : st===false?C.breath : active?C.gold:(isSub?'rgba(155,146,184,.28)':'rgba(155,146,184,.4)');
    if(active&&st===undefined){ cx.strokeStyle='rgba(230,184,92,.5)'; cx.lineWidth=1.8;
      cx.beginPath(); cx.arc(px,by,rad+5,0,7); cx.stroke(); }
    if(st===true){ const g=cx.createRadialGradient(px,by,1,px,by,rad+7);
      g.addColorStop(0,'rgba(79,227,193,.5)'); g.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=g; cx.beginPath(); cx.arc(px,by,rad+7,0,7); cx.fill(); }
    if(silent && st===undefined){ cx.strokeStyle=col; cx.lineWidth=1.7;
      cx.beginPath(); cx.arc(px,by,rad,0,7); cx.stroke(); }
    else { cx.fillStyle=col; cx.beginPath(); cx.arc(px,by,rad,0,7); cx.fill(); }
    // the written note shape lives only on the active beat — quiet elsewhere,
    // so the display stays calm instead of a row of cluttered symbols
    if(active && !silent) drawNoteShape(px, by-rad-26, sub, isSub, 'rgba(230,184,92,.9)');
    // the spoken syllable, quiet unless this beat is active right now
    cx.fillStyle = active ? 'rgba(230,184,92,.95)' : 'rgba(155,146,184,.4)';
    cx.font = active ? "700 11px Cairo,sans-serif" : "600 9px Cairo,sans-serif";
    cx.textAlign='center';
    cx.fillText(kodalySyllable(i, sub, silent), px, by-rad-8);
    cx.textAlign='start';
  }
}
function renderRhythmBeats(beats, hits, curBeatIdx, subN){
  drawRhythmBg();
  const done=hits.filter(h=>h===true).length;
  drawAirColumn(done/Math.max(1,hits.length), _threadStep++);
  drawBeatRow(beats, hits, curBeatIdx, null, subN);
  const sub=subN||1;
  cx.textAlign='center'; cx.fillStyle=C.bone; cx.font="500 34px 'IBM Plex Mono',monospace";
  cx.fillText(String(Math.min(Math.floor(curBeatIdx/sub)+1, Math.ceil(beats.length/sub))), ORB.cx, 40);
  cx.fillStyle='rgba(155,146,184,.7)'; cx.font="600 10px Cairo,sans-serif";
  cx.fillText('من '+Math.ceil(beats.length/sub), ORB.cx, 56); cx.textAlign='start';
  drawExitStreak(attempts||0, NEED||7);
  drawContextStrip(dayLabel(curDay.id)+(sub>1?' · تقسيم الضربة':' · إيقاع'),
    rhBeatSec.toFixed(2)+' ث · هامش '+rhTolMs+' م.ث', 'rgba(79,227,193,.7)');
}
function renderDropBeats(beats, hits, curBeatIdx, dropSet){
  drawRhythmBg();
  const done=hits.filter(h=>h===true).length;
  drawAirColumn(done/Math.max(1,hits.length), _threadStep++);
  drawBeatRow(beats, hits, curBeatIdx, dropSet);
  cx.textAlign='center'; cx.fillStyle=C.bone; cx.font="500 34px 'IBM Plex Mono',monospace";
  cx.fillText(String(Math.min(curBeatIdx+1,beats.length)), ORB.cx, 40);
  cx.fillStyle='rgba(155,146,184,.7)'; cx.font="600 10px Cairo,sans-serif";
  cx.fillText('من '+beats.length, ORB.cx, 56);
  cx.fillStyle='rgba(155,146,184,.55)'; cx.font="600 9px Cairo,sans-serif";
  cx.fillText('الدائرة المفرَغة = نبضة صامتة', ORB.cx, ORB.h-30); cx.textAlign='start';
  drawExitStreak(attempts||0, NEED||7);
  drawContextStrip(dayLabel(curDay.id)+' · حذف النبضات',
    toAr(dropSet.size)+' صامتة', 'rgba(255,179,71,.75)');
}
/* ── sustained note across beats (تا-آه / تا-آه-آه-آه): a different skill
   from discrete-onset rhythm — start ON the beat, hold with ZERO
   re-articulation, release ON the target beat. Completes the Kodály set
   started with تا/تِ-تِ, for the half-note and whole-note durations. ── */
function startSustainRhythm(){
  recording=true; $('btnRecLabel').textContent='إنهاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  const beatSec=curDay.beatSec, nBeats=curDay.beats;
  recData={t0:performance.now(), voiced:[], wasVoiced:false, lastBeatPlayed:-1};
  setupCanvas();
  const END=nBeats*beatSec+1.0;
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000;
    const beatIdx=Math.min(Math.floor(now/beatSec+0.001), nBeats);
    if(beatIdx!==recData.lastBeatPlayed){ recData.lastBeatPlayed=beatIdx; playTick(beatIdx===0||beatIdx===nBeats?1300:1100); }
    const voiced=!!(p.hz && p.clarity>=CLARITY);
    recData.voiced.push({t:now,on:voiced});
    renderSustainRhythm(now, voiced, nBeats, beatSec, beatIdx);
    $('sustainNum').textContent=Math.min(now,END).toFixed(1);
    $('sustainBar').style.width=Math.min(100,(now/END)*100)+'%';
    if(now>=END) stopAttempt();
  };
}
function scoreSustainRhythm(d){
  const beatSec=curDay.beatSec, nBeats=curDay.beats, target=nBeats*beatSec;
  const tol=curDay.holdTolMs||250;
  const w=longestRunWindow(d.voiced);
  const startOffMs=Math.abs(w.start*1000);
  const endOffMs=Math.abs((w.end-target)*1000);
  // count ALL distinct voiced segments across the whole capture (same 0.15s
  // break threshold as longestRunWindow) — more than one substantial segment
  // means the breath really stopped and restarted somewhere, even if that
  // break isn't inside whichever segment happened to end up "longest"
  const segs=[]; let cs=null, lo=null;
  d.voiced.forEach(s=>{ if(s.on){ if(cs==null)cs=s.t; lo=s.t; } else { if(cs!=null && s.t-lo>0.15){ segs.push(lo-cs); cs=null; } } });
  if(cs!=null) segs.push(lo-cs);
  const substantialSegs=segs.filter(dur=>dur>0.2).length;
  const hadInnerBreak = substantialSegs>1;
  const durOk = startOffMs<=tol && endOffMs<=tol;
  const totalVoicedFrames=d.voiced.filter(s=>s.on).length;
  const lowConf = totalVoicedFrames < d.voiced.length*0.25 && (w.dur)>1;
  const ok = !lowConf && durOk && !hadInnerBreak;
  attempts = attempts||0; NEED = curDay.need||7;
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, low_confidence:lowConf,
    start_off_ms:+startOffMs.toFixed(0), end_off_ms:+endOffMs.toFixed(0), had_inner_break:hadInnerBreak, ts:new Date().toISOString()});
  let head,body,cls;
  if(lowConf){ cls='retry'; head='لم أستطع الحكم بثقة كافية';
    body='إشارة الصوت كانت ضعيفة جدًّا لتتبّع استمرارية نفَسك بدقّة. أعِد المحاولة في بيئة أهدأ — هذه لا تُحتسب ضدّك.';
  } else if(hadInnerBreak){ cls='retry'; head='انقطع نفَسك في المنتصف';
    body='توقّفت واستأنفت أكثر من مرّة — هذا نفَسان منفصلان، لا نغمة واحدة ممتدّة. حافظ على استمرار الهواء من البداية للنهاية بلا انقطاع.';
  } else if(!durOk){ cls='retry';
    if(startOffMs>tol && endOffMs>tol){ head='البداية والنهاية بحاجة دقّة أكبر'; body=`ابدأ عند النبضة الأولى بالضبط، واستمرّ حتى النبضة ${toAr(nBeats+1)} تمامًا — لا قبل ولا بعد.`; }
    else if(startOffMs>tol){ head='بدأت مبكرًا أو متأخّرًا'; body='دع النبضة الأولى تبدأ نفَسك بالضبط، لا قبلها بلحظة ولا بعدها.'; }
    else { head='أنهيت مبكرًا أو أطلت أكثر من اللازم'; body=`النغمة يجب أن تنتهي بالضبط عند النبضة ${toAr(nBeats+1)} — لا أقصر ولا أطول.`; }
  } else {
    cls='ok'; attempts++; head=`نغمة ممتدّة نظيفة (${toAr(attempts)}/${toAr(NEED)})`;
    body=`استمررت من النبضة الأولى حتى ${toAr(nBeats+1)} بلا انقطاع — بالضبط ما يحتاجه ${nBeats===2?'"تا-آه"':'"تا-آه-آه-آه"'}.`;
  }
  $('resultZone').innerHTML=`<div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  if(cls==='ok' && attempts>=NEED){ setTimeout(()=>finishDay({bestStartOffMs:+startOffMs.toFixed(0), bestEndOffMs:+endOffMs.toFixed(0)}),900); }
}
function renderSustainRhythm(now, voiced, nBeats, beatSec, curBeatIdx){
  drawRhythmBg();
  const target=nBeats*beatSec;
  drawAirColumn(voiced?1:0.2, _threadStep++);
  const {x0,L,R,cy}=REED, by=cy+R*0.62;
  cx.strokeStyle='rgba(74,59,122,.5)'; cx.lineWidth=1;
  cx.beginPath(); cx.moveTo(beatX(0,nBeats),by); cx.lineTo(beatX(nBeats,nBeats+1),by); cx.stroke();
  // the held span itself — fills as you sustain, breaks visually if you stop
  const heldFrac=Math.min(1, now/target);
  cx.strokeStyle = voiced? 'rgba(79,227,193,.9)' : 'rgba(155,146,184,.3)';
  cx.lineWidth=5; cx.lineCap='round';
  cx.beginPath(); cx.moveTo(beatX(0,nBeats+1), by); cx.lineTo(beatX(0,nBeats+1)+(beatX(nBeats,nBeats+1)-beatX(0,nBeats+1))*heldFrac, by); cx.stroke();
  cx.lineCap='butt';
  // beat boundary ticks (start + target release point are the only ones that matter)
  [0,nBeats].forEach(i=>{
    const px=x0 + L*(0.12+i*0.76/nBeats);
    cx.fillStyle = i===0?'rgba(79,227,193,.85)':'rgba(230,184,92,.85)';
    cx.beginPath(); cx.arc(px,by,5,0,7); cx.fill();
  });
  cx.textAlign='center'; cx.fillStyle='#F7DCA0'; cx.font="700 22px 'Aref Ruqaa',serif";
  cx.fillText(nBeats===2?'تا-آه':'تا-آه-آه-آه', ORB.cx, 32);
  cx.fillStyle='rgba(155,146,184,.6)'; cx.font="600 9.5px Cairo,sans-serif";
  cx.fillText('ابدأ مع الأولى، استمرّ حتى '+toAr(nBeats+1), ORB.cx, 50); cx.textAlign='start';
  drawExitStreak(attempts||0, NEED||7);
  drawContextStrip(dayLabel(curDay.id)+' · نغمة ممتدّة', voiced?'مستمرّ':'صامت', voiced?'rgba(79,227,193,.75)':'rgba(155,146,184,.5)');
}
/* ── tonguing / articulation (النقر): a genuinely NEW physical skill, isolated
   on purpose per the pedagogy-review principle. Research correction applied:
   real tonguing does NOT stop the breath — only the tongue interrupts the
   sound briefly. So the target gap between repeated onsets is SHORT
   (a quick flick), and a gap that's too long is treated as a breath restart,
   not real articulation, and explicitly coached against. ── */
/* ── jins (تسلسل نغمات الجنس): a genuinely new detection shape — not a pair
   like transition/exchange, a full ordered SEQUENCE of 3+ notes. Segments the
   recording into distinct held notes post-hoc (same gap-threshold approach as
   longestRunWindow), then checks the segment COUNT and each segment's PITCH
   against the expected up-then-down sequence, in order. ── */
function jinsSegments(voiced, samp){
  const segs=[]; let cs=null, lo=null;
  voiced.forEach(s=>{ if(s.on){ if(cs==null)cs=s.t; lo=s.t; } else { if(cs!=null && s.t-lo>0.15){ if(lo-cs>0.3) segs.push({start:cs,end:lo}); cs=null; } } });
  if(cs!=null && (lo-cs)>0.3) segs.push({start:cs,end:lo});
  return segs.map(seg=>{
    const pts=samp.filter(p=>p.t>=seg.start-0.03 && p.t<=seg.end+0.03).map(p=>p.hz);
    pts.sort((a,b)=>a-b);
    return {start:seg.start, end:seg.end, hz: pts.length?pts[Math.floor(pts.length/2)]:null};
  });
}
/* ── ear training (أيّ مقام تسمع؟): the missing "listen and recognize" half
   of musicianship — every other exercise in Miran is about PRODUCING a
   sound correctly; this is the first that asks the trainee to RECOGNIZE
   one instead. No microphone, no calibration — pure listening + choice. ── */
let earCorrectKey=null, earAttempts=0, earNeed=5;
function openEarTrain(day){
  curDay=day; earNeed=day.need||5; earAttempts=restoreStreak();
  sessionLog={app:'miran', version:APP_VERSION, day:day.id, kind:'eartrain', started:new Date().toISOString(), attempts:[]};
  $('earEyebrow').textContent=`${dayLabel(day.id)} · أيّ مقام تسمع؟`;
  renderEarPips();
  show('eartrain');
  nextEarRound();
}
function renderEarPips(){
  $('earPips').innerHTML='';
  for(let i=0;i<earNeed;i++){ const d=document.createElement('div'); d.className='pip'+(i<earAttempts?' done':''); $('earPips').appendChild(d); }
}
function nextEarRound(){
  $('earResult').innerHTML='';
  const keys=curDay.earOptions;
  earCorrectKey=keys[Math.floor(Math.random()*keys.length)];
  const shuffled=[...keys].sort(()=>Math.random()-0.5);
  $('earOptions').innerHTML=shuffled.map(k=>{
    const m=MAQAMAT.find(x=>x.key===k);
    return `<button class="ear-opt" data-key="${k}" style="padding:14px;border-radius:14px;border:1px solid rgba(155,146,184,.3);
      background:rgba(255,255,255,.03);color:var(--bone);font-family:var(--f-head);font-weight:700;font-size:.92rem;cursor:pointer">${m.name}</button>`;
  }).join('');
  $('earOptions').querySelectorAll('.ear-opt').forEach(b=>b.addEventListener('click',()=>checkEarAnswer(b.dataset.key)));
  playEarPhrase();
}
function playEarPhrase(){
  ensureOutput();
  const m=MAQAMAT.find(x=>x.key===earCorrectKey);
  const seq=m.semis; const noteDur=0.36, gap=0.05;
  const base=audioCtx.currentTime+0.08;
  seq.forEach((semis,i)=>{ const hz=calib?calib.qararHz:523.25; tone(hz*Math.pow(2,semis/12), base+i*(noteDur+gap), noteDur, 0.18); });
}
$('earPlayBtn').addEventListener('click', playEarPhrase);
function checkEarAnswer(pickedKey){
  const ok = pickedKey===earCorrectKey;
  const correctName = MAQAMAT.find(x=>x.key===earCorrectKey).name;
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, picked:pickedKey, correct:earCorrectKey, ts:new Date().toISOString()});
  $('earOptions').querySelectorAll('.ear-opt').forEach(b=>{
    if(b.dataset.key===earCorrectKey) b.style.borderColor='var(--live)';
    if(b.dataset.key===pickedKey && !ok) b.style.borderColor='var(--breath)';
    b.disabled=true;
  });
  if(ok){
    earAttempts++; renderEarPips();
    $('earResult').innerHTML=`<div class="msg ok"><div class="head">صحيح! (${toAr(earAttempts)}/${toAr(earNeed)})</div>هذا فعلًا مقام ${correctName}.</div>`;
    if(earAttempts>=earNeed){
      setTimeout(()=>finishDay({earCorrect:earAttempts}), 1100);
    } else {
      setTimeout(nextEarRound, 1300);
    }
  } else {
    earAttempts=0; renderEarPips();
    $('earResult').innerHTML=`<div class="msg retry"><div class="head">ليس تمامًا</div>كان هذا مقام ${correctName} — استمع مرّة أخرى وقارن.</div>`;
    setTimeout(nextEarRound, 1800);
  }
}
$('earBack').addEventListener('click', ()=>{ stopListen(); renderHome(); show('home'); });
function startJins(){
  recording=true; $('btnRecLabel').textContent='إنهاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  recData={t0:performance.now(), voiced:[], samp:[]}; setupCanvas();
  const END=curDay.notesSemis.length*curDay.holdSec+2.5;
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000;
    const voiced=!!(p.hz && p.clarity>=CLARITY);
    recData.voiced.push({t:now,on:voiced});
    if(voiced) recData.samp.push({t:now, hz:p.hz});
    const segs=jinsSegments(recData.voiced, recData.samp);
    renderJins(now, voiced, segs);
    $('sustainNum').textContent=Math.min(now,END).toFixed(1);
    $('sustainBar').style.width=Math.min(100,(now/END)*100)+'%';
    if(now>=END) stopAttempt();
  };
}
function scoreJins(d){
  const expected=curDay.notesSemis;
  const segs=jinsSegments(d.voiced, d.samp);
  const countOk = segs.length===expected.length;
  let allPitchOk=true, details=[];
  const n=Math.min(segs.length, expected.length);
  for(let i=0;i<n;i++){
    const targetHz=calib.qararHz*Math.pow(2, expected[i]/12);
    const dev = segs[i].hz ? centsBetween(segs[i].hz, targetHz) : null;
    const ok = dev!=null && Math.abs(dev)<=curDay.tol;
    if(!ok) allPitchOk=false;
    details.push({i, semis:expected[i], devCents: dev!=null?+dev.toFixed(1):null, ok});
  }
  const ok = countOk && allPitchOk && n===expected.length;
  attempts=attempts||0; NEED=curDay.need||7;
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, segCount:segs.length, expectedCount:expected.length, notes:details, ts:new Date().toISOString()});
  let head,body,cls;
  if(!countOk){
    cls='retry'; head = segs.length<expected.length ? 'نغمات أقلّ من المطلوب' : 'نغمات أكثر من المطلوب';
    body = segs.length<expected.length
      ? `سمعت ${toAr(segs.length)} نغمة فقط من أصل ${toAr(expected.length)} — تأكّد أن كل نغمة منفصلة بوضوح عن التي تليها.`
      : `سمعت ${toAr(segs.length)} نغمة، أكثر من ${toAr(expected.length)} المطلوبة — تجنّب أي تذبذب أو انقطاع غير مقصود وسط نغمة واحدة.`;
  } else if(!allPitchOk){
    cls='retry'; const bad=details.find(x=>!x.ok);
    head='إحدى النغمات تحتاج دقّة أكبر';
    body=`النغمة رقم ${toAr(bad.i+1)} في التسلسل انحرفت ${Math.abs(bad.devCents).toFixed(0)} سنتًا عن هدفها — راجعها تحديدًا.`;
  } else {
    cls='ok'; attempts++; head=`جنس نظيف (${toAr(attempts)}/${toAr(NEED)})`;
    body='كل نغمة في مكانها الصحيح، بالترتيب الصحيح — هذا هو الجنس كاملًا.';
  }
  $('resultZone').innerHTML=`<div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  if(cls==='ok' && attempts>=NEED){ setTimeout(()=>finishDay({bestSegCount:segs.length}),900); }
}
function renderJins(now, voiced, segs){
  drawRhythmBg();
  drawAirColumn(voiced?1:0.2, _threadStep++);
  cx.textAlign='center'; cx.fillStyle='#F7DCA0'; cx.font="700 22px 'Aref Ruqaa',serif";
  cx.fillText(curDay.title||'الجنس', ORB.cx, 32);
  cx.fillStyle='rgba(155,146,184,.6)'; cx.font="600 9.5px Cairo,sans-serif";
  cx.fillText(`نغمة ${toAr(Math.min(segs.length+1, curDay.notesSemis.length))} من ${toAr(curDay.notesSemis.length)}`, ORB.cx, 50);
  cx.textAlign='start';
  drawExitStreak(attempts||0, NEED||7);
  drawContextStrip(dayLabel(curDay.id)+' · جنس', voiced?'يُسجَّل':'صامت', voiced?'rgba(79,227,193,.7)':'rgba(155,146,184,.5)');
}
function startTongue(){
  recording=true; $('btnRecLabel').textContent='إنهاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  const beatSec=curDay.beatSec, nBeats=curDay.beats;
  const beatTimes=Array.from({length:nBeats+1},(_,i)=>i*beatSec);
  recData={t0:performance.now(), onsets:[], gaps:[], hits:new Array(nBeats+1).fill(undefined), wasVoiced:false, lastOffAt:null, lastBeatPlayed:-1};
  setupCanvas();
  const END=nBeats*beatSec+0.7;
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000;
    const beatIdx=Math.min(Math.floor(now/beatSec+0.5), nBeats);
    if(beatIdx!==recData.lastBeatPlayed && now>=beatIdx*beatSec-0.02){ recData.lastBeatPlayed=beatIdx; playTick(beatIdx%4===0?1300:1100); }
    const voiced=!!(p.hz && p.clarity>=CLARITY);
    if(!voiced && recData.wasVoiced) recData.lastOffAt=now; // falling edge: the tongue just cut the sound
    if(voiced && !recData.wasVoiced){ // rising edge = a new tap
      recData.onsets.push(now);
      const gapMs = recData.lastOffAt!=null ? (now-recData.lastOffAt)*1000 : null;
      if(gapMs!=null) recData.gaps.push(gapMs);
      let bi=-1,bd=Infinity;
      beatTimes.forEach((bt,i)=>{ if(recData.hits[i]===undefined){ const dd=Math.abs(now-bt); if(dd<bd){bd=dd;bi=i;} } });
      if(bi>=0 && bd<=beatSec/2){
        const offMs=(now-beatTimes[bi])*1000; const corrected=offMs-(latencyCal?latencyCal.ms:0);
        const timingOk = Math.abs(corrected)<=rhTolMs;
        // the FIRST tap has no prior gap to judge — timing alone decides it.
        // every tap after must ALSO show a real, short tongue-gap, not silence-free bleed nor a full breath restart.
        const gapOk = bi===0 ? true : (gapMs!=null && gapMs>=curDay.minGapMs && gapMs<=curDay.maxGapMs);
        recData.hits[bi] = timingOk && gapOk;
      }
    }
    recData.wasVoiced=voiced;
    const curIdx=Math.min(Math.floor(now/beatSec), nBeats);
    renderRhythmBeats(beatTimes, recData.hits, curIdx, 1);
    $('sustainNum').textContent=Math.min(now,END).toFixed(1);
    $('sustainBar').style.width=Math.min(100,(now/END)*100)+'%';
    if(now>=END) stopAttempt();
  };
}
function scoreTongue(d){
  const nBeats=curDay.beats;
  const hits=d.hits.filter(h=>h===true).length;
  const misses=d.hits.filter(h=>h===false).length;
  const missed=d.hits.filter(h=>h===undefined).length;
  const total=nBeats+1;
  const tooLong = d.gaps.filter(g=>g>curDay.maxGapMs).length;
  const tooShort = d.gaps.filter(g=>g<curDay.minGapMs).length;
  const ok = hits>=total-1 && misses===0 && missed===0; // near-perfect: every tap timed AND separated correctly
  attempts=attempts||0; NEED=curDay.need||7;
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, hits, misses, missed,
    gaps_ms:d.gaps.map(g=>+g.toFixed(0)), too_long_breaks:tooLong, too_short_bleeds:tooShort, ts:new Date().toISOString()});
  let head,body,cls;
  if(missed>0){ cls='retry'; head='فاتتك نقرة'; body='حافظ على نقر كل نبضة — لا تدع أيّ نبضة تمرّ بلا نقرة.'; }
  else if(tooLong>tooShort && tooLong>0){ cls='retry'; head='توقّفت عن التنفّس بين النقرات';
    body='الفجوة بين نقراتك طويلة جدًّا — هذا يعني أنك تُوقف نفَسك وتُعيده، لا تنقر بلسانك فقط. أبقِ الهواء مستمرًّا طوال الوقت، ودع لسانك وحده يقطع الصوت بلمسة سريعة.'; }
  else if(tooShort>0){ cls='retry'; head='النقرات متلاصقة جدًّا'; body='لا توجد فاصلة واضحة كافية بين نقراتك — النغمات تكاد تلتحم ببعضها. اجعل لمسة اللسان أوضح قليلًا.'; }
  else if(misses>0){ cls='retry'; head='التوقيت يحتاج دقّة أكبر'; body='الفاصلة بين نقراتك جيدة، لكن توقيتها مع النبضة يحتاج ضبطًا أدقّ.'; }
  else { cls='ok'; attempts++; head=`نقر نظيف (${toAr(attempts)}/${toAr(NEED)})`;
    body='لمسة لسان واضحة، نفَس متواصل — بالضبط النقر الصحيح.'; }
  $('resultZone').innerHTML=`<div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  if(cls==='ok' && attempts>=NEED){ setTimeout(()=>finishDay({bestGapsMs:d.gaps.map(g=>+g.toFixed(0))}),900); }
}
/* ── speed-lock: offered once, right when the trainee first reaches target
   tempo — NOT another test. Free, continuous practice at the locked target
   speed with zero pass/fail threat, so the tempo settles into real
   confidence, not just a single successful pass. Entirely optional. ── */
function offerSpeedLock(beatMin){
  if(!document.getElementById('resultZone') || document.getElementById('resultZone').style.display==='none') return;
  const html=`<div class="msg ok" id="speedLockOffer" style="margin-top:10px;border:1px solid rgba(230,184,92,.4);background:rgba(230,184,92,.06)">
    <div class="head">✦ وصلت الهدف! ثبّته الآن؟</div>
    وصلت سرعتك المستهدفة (${beatMin.toFixed(2)} ث) — تثبيتها بممارسة حرّة الآن يمنحك ثقة حقيقية بها، بلا أي اختبار جديد.
    <div style="display:flex;gap:8px;margin-top:12px">
      <button id="btnLockNow" style="flex:1;padding:10px;border-radius:100px;border:none;
        background:linear-gradient(135deg,var(--live),#2a8f7c);color:#08081a;font-family:var(--f-head);
        font-weight:700;font-size:.82rem;cursor:pointer">ثبّته الآن</button>
      <button id="btnLockLater" style="flex:1;padding:10px;border-radius:100px;border:1px solid rgba(155,146,184,.3);
        background:transparent;color:var(--bone);font-family:var(--f-head);font-weight:600;font-size:.82rem;cursor:pointer">أكمل لاحقًا</button>
    </div>
  </div>`;
  $('resultZone').insertAdjacentHTML('beforeend', html);
  document.getElementById('btnLockNow').addEventListener('click', ()=> openSpeedLockPicker(beatMin));
  document.getElementById('btnLockLater').addEventListener('click', ()=>{ const el=document.getElementById('speedLockOffer'); if(el) el.remove(); });
}
function openSpeedLockPicker(beatMin){
  _speedLockDay=curDay; _speedLockBeat=beatMin;
  const opts=[{lbl:'٣٠ ثانية',sec:30},{lbl:'دقيقة',sec:60},{lbl:'دقيقتان',sec:120},{lbl:'بلا حدّ',sec:0}];
  $('resultZone').innerHTML=`<div class="msg ok">
    <div class="head">لكم من الوقت؟</div>
    اختر مدّة الممارسة الحرّة — لا حكم، لا فشل، فقط تثبيت.
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px" id="lockDurBtns"></div>
  </div>`;
  const box=document.getElementById('lockDurBtns');
  opts.forEach(o=>{
    const b=document.createElement('button');
    b.textContent=o.lbl;
    b.style.cssText='padding:11px;border-radius:12px;border:1px solid rgba(79,227,193,.3);background:rgba(79,227,193,.08);color:var(--live);font-family:var(--f-head);font-weight:700;font-size:.8rem;cursor:pointer';
    b.addEventListener('click', ()=> startSpeedLock(o.sec));
    box.appendChild(b);
  });
}
let _speedLockDay=null, _speedLockBeat=1, _speedLockActive=false, _speedLockTimer=null;
function startSpeedLock(durationSec){
  _speedLockActive=true;
  const beatSec=_speedLockBeat;
  const startT=performance.now();
  let lastBeatPlayed=-1, beatsHeard=0, beatsTotal=0, wasVoiced=false;
  $('resultZone').innerHTML='';
  $('btnRec').style.display='none'; // no attempt-recording here — this is free practice, not a scored attempt
  setupCanvas();
  onFrame=(p)=>{
    if(!_speedLockActive) return;
    const now=(performance.now()-startT)/1000;
    const beatIdx=Math.floor(now/beatSec+0.001);
    if(beatIdx!==lastBeatPlayed){ lastBeatPlayed=beatIdx; playTick(beatIdx%4===0?1300:1100); beatsTotal++; }
    const voiced=!!(p.hz && p.clarity>=CLARITY);
    if(voiced && !wasVoiced) beatsHeard++;
    wasVoiced=voiced;
    drawSpeedLock(now, durationSec, beatsTotal?Math.min(1,beatsHeard/Math.max(1,beatsTotal)):0);
    if(durationSec>0 && now>=durationSec) endSpeedLock();
  };
  drawSpeedLock(0, durationSec, 0);
}
function drawSpeedLock(now, durationSec, continuity){
  drawRhythmBg();
  drawAirColumn(continuity, _threadStep++);
  cx.textAlign='center'; cx.fillStyle='#F7DCA0'; cx.font="700 24px 'Aref Ruqaa',serif";
  cx.fillText('✦ تثبيت السرعة', ORB.cx, 34);
  cx.fillStyle='rgba(155,146,184,.65)'; cx.font="600 10px Cairo,sans-serif";
  const timeTxt = durationSec>0 ? `${now.toFixed(0)} / ${durationSec} ث` : `${now.toFixed(0)} ث · بلا حدّ`;
  cx.fillText(timeTxt, ORB.cx, 54);
  cx.textAlign='start';
  drawContextStrip(dayLabel(_speedLockDay.id)+' · ممارسة حرّة', `نبضة كل ${_speedLockBeat.toFixed(2)} ث · لا حكم هنا`, 'rgba(230,184,92,.75)');
  // a single, unhurried stop control — replaces the normal attempt button entirely
  if(!document.getElementById('btnEndLock')){
    const b=document.createElement('button');
    b.id='btnEndLock'; b.textContent='إنهاء التثبيت';
    b.style.cssText='display:block;margin:14px auto 0;padding:12px 28px;border-radius:100px;border:none;background:linear-gradient(135deg,var(--gold),#b8873a);color:#1a1408;font-family:var(--f-head);font-weight:700;font-size:.86rem;cursor:pointer';
    b.addEventListener('click', endSpeedLock);
    $('resultZone').appendChild(b);
  }
}
function endSpeedLock(){
  _speedLockActive=false; onFrame=null; clearTimeout(_speedLockTimer);
  const btn=document.getElementById('btnEndLock'); if(btn) btn.remove();
  $('btnRec').style.display='';
  $('resultZone').innerHTML=`<div class="msg ok"><div class="head">✦ ثُبِّتت السرعة</div>
    ممارسة حرّة حقيقية عند ${_speedLockBeat.toFixed(2)} ثانية — هذا الرقم الآن مألوف لأذنك وإصبعك، لا مجرّد رقم اجتزته مرّة.</div>`;
  drawRhythmIdle();
}
// builds the target-time grid for a MIXED pattern (curDay.pattern = per-beat
// subdivision array, e.g. [1,1,2,4,1,1] = quarter,quarter,eighth-pair,
// sixteenth-group,quarter,quarter) — falls back to the old uniform-sub
// behaviour when no pattern is given, so nothing existing breaks.
function buildPatternGrid(beatSec, nBeats, uniformSub, pattern){
  const times=[0]; const meta=[{beatIdx:0, sub:pattern?pattern[0]:uniformSub, subIdx:0}];
  const beats = pattern || Array.from({length:nBeats},()=>uniformSub);
  for(let b=0;b<nBeats;b++){
    const sub=beats[b]||1, step=beatSec/sub;
    for(let k=1;k<=sub;k++){
      times.push(b*beatSec + k*step);
      meta.push({beatIdx:b+ (k===sub?1:0), sub, subIdx:k%sub});
    }
  }
  return {times, meta};
}
function startRhythm(){
  recording=true; $('btnRecLabel').textContent='إنهاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  const beatSec=rhBeatSec, nBeats=curDay.beats, subN=curDay.sub||1;
  const pattern=curDay.pattern||null;
  const grid = pattern ? buildPatternGrid(beatSec, nBeats, subN, pattern) : null;
  const stepSec=beatSec/subN; // subdivision: same nearest-target matching logic, just a finer time grid
  const nSteps=pattern ? grid.times.length-1 : nBeats*subN;
  const beatTimes=pattern ? grid.times : Array.from({length:nSteps+1},(_,i)=>i*stepSec);
  const pointSub=i=>pattern ? grid.meta[i].sub : subN; // this point's own subdivision level, for mixed patterns
  const isSubPoint=i=>pattern ? (grid.meta[i].subIdx!==0) : (subN>1 && (i%subN!==0)); // true for a mid-beat target, not the beat itself
  recData={t0:performance.now(), onsets:[], hits:new Array(nSteps+1).fill(undefined), wasVoiced:false, lastBeatPlayed:-1};
  setupCanvas();
  const END=nBeats*beatSec+(subN>1||pattern?1.1:0.7); // subdivision needs a longer tail — more points means more room for the final onset to drift late and still register
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000;
    const beatIdx=Math.min(Math.floor(now/beatSec+0.5), nBeats); // tick sound stays on the REAL beat only, never sub-points
    if(beatIdx!==recData.lastBeatPlayed && now>=beatIdx*beatSec-0.02){ recData.lastBeatPlayed=beatIdx; playTick(beatIdx%4===0?1300:1100); }
    const voiced = !!(p.hz && p.clarity>=CLARITY);
    if(voiced && !recData.wasVoiced){ // rising edge = onset
      recData.onsets.push(now);
      // search radius must be at least as wide as the LOOSEST tolerance this
      // onset could be judged against (up to 1.6x at position 0) — otherwise
      // an onset that's genuinely within the stated tolerance never even gets
      // assigned to a target, silently counted as missed regardless of how
      // forgiving the tolerance ladder claims to be. Confirmed as the real
      // root cause: search radius (300ms) was narrower than tolerance (up to 704ms).
      const searchRadius = Math.max(stepSec/2, rhTolMs*1.6/1000);
      // prefer the EARLIEST open target within radius, not the nearest one —
      // picking "nearest" lets a late onset jump ahead and steal a future
      // target that hasn't been played yet, leaving its real target unmatched
      // and cascading the misalignment through every point after it. Earliest-
      // open-first matches a late onset to the target it was actually aimed at.
      let bi=-1;
      for(let i=0;i<beatTimes.length;i++){
        if(recData.hits[i]===undefined && Math.abs(now-beatTimes[i])<=searchRadius){ bi=i; break; }
      }
      if(bi>=0){
        const offMs=(now-beatTimes[bi])*1000; const corrected=offMs-(latencyCal?latencyCal.ms:0);
        // position 0 starts from silence (the pickup beats aren't voiced) —
        // every other point continues from an already-sounding note, so only
        // the first genuinely needs breath-onset latency accounted for.
        // Confirmed by real attempt data: position 0 failed disproportionately
        // often until this matched the same leniency exchange's hold-0 got.
        const tol = bi===0 ? rhTolMs*1.6 : (isSubPoint(bi) ? rhTolMs*1.4 : rhTolMs);
        recData.hits[bi] = Math.abs(corrected)<=tol;
      }
    }
    recData.wasVoiced=voiced;
    let curIdx=0; for(let i=0;i<beatTimes.length;i++){ if(beatTimes[i]<=now) curIdx=i; }
    renderRhythmBeats(beatTimes, recData.hits, curIdx, pattern?1:subN);
    $('sustainNum').textContent=Math.min(now,END).toFixed(1);
    $('sustainBar').style.width=Math.min(100,(now/END)*100)+'%';
    if(now>=END) stopAttempt();
  };
}
function scoreRhythm(d){
  const nBeats=curDay.beats, subN=curDay.sub||1;
  const hits=d.hits.filter(h=>h===true).length;
  const misses=d.hits.filter(h=>h===false).length;
  const missed=d.hits.filter(h=>h===undefined).length;
  const total = curDay.pattern ? curDay.pattern.reduce((a,b)=>a+b,0)+1 : nBeats*subN+1;
  // allowance scales with point count — a flat "1 miss max" is fair for simple
  // rhythm (7 points) but disproportionately strict for subdivision (13-17
  // points, roughly double or more) since there's simply more to get right.
  const allowedMisses=Math.max(1, Math.ceil(total/8));
  const ok = hits>=total-allowedMisses;
  const missedPositions = d.hits.map((h,i)=>h!==true?i:null).filter(i=>i!==null);
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, hits, misses, missed_beats:missed,
    missed_positions:missedPositions, allowed_misses:allowedMisses, tol_ms:rhTolMs, latency_correction_ms:latencyCal?latencyCal.ms:0, ts:new Date().toISOString()});
  registerAttemptResult(ok);
  let head,body,cls;
  if(!ok){
    cls='retry'; attempts=0;
    const badIdx = d.hits.findIndex(h=>h!==true); // the first beat that failed this attempt
    const pattern = badIdx>=0 ? checkFailPattern({k:curDay.id,r:'beat',i:badIdx}) : null;
    if(pattern){
      head=`نمط متكرّر: النبضة رقم ${toAr(pattern.i+1)} تفوتك دائمًا`; _failPattern=[];
      body=`نفس النبضة تفوتك في محاولاتك الأخيرة — استمع للنقرات القليلة قبلها وتوقّع لحظتها بدل انتظار سماعها.`;
    } else {
      head = missed>1 ? 'فاتتك عدّة نبضات' : 'التوقيت يحتاج دقة أكبر';
      body = missed>1 ? `لم تعزف عند ${toAr(missed)} نبضات. حافظ على نغمة قصيرة عند كل نقطة.`
        : `أصبت ${toAr(hits)} من ${toAr(total)} نبضات ضمن هامش ${rhTolMs} م.ث. استمع للنقر وتوقّع اللحظة قبل وصولها بقليل.`;
    }
  } else {
    cls='ok'; attempts++; _failPattern=[]; head=`إيقاع دقيق (${toAr(attempts)}/${toAr(NEED)})`;
    body=`أصبت ${toAr(hits)} من ${toAr(total)} نبضات. ${attempts<NEED?'أعِد — نحتاج '+toAr(NEED)+' متتالية.':''}`;
  }
  $('resultZone').innerHTML=`<div class="stats">
      <div class="stat g"><div class="v">${hits}/${total}</div><div class="k">نبضات مضبوطة</div></div>
      <div class="stat b"><div class="v">${rhTolMs}</div><div class="k">هامش التوقيت (م.ث)</div></div>
      <div class="stat g"><div class="v">${toAr(curDay.beats)}</div><div class="k">نبضات الدورة</div></div>
    </div><div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  renderPips();
  if(attempts>=NEED){
    if(rhRung>=0 && rhRung<curDay.tolLadder.length-1){
      setTimeout(()=>{
        rhRung++; attempts=0; rhTolMs=curDay.tolLadder[rhRung]; NEED=curDay.rungNeed[rhRung];
        // speed rises together with tolerance tightening — one ladder, not two
        // separate progressions, so the trainee always practises at a tempo
        // that matches how forgiving the timing margin currently is.
        if(curDay.beatMin!=null && curDay.stepDownBeat){
          rhBeatSec = Math.max(curDay.beatMin, +(rhBeatSec-curDay.stepDownBeat).toFixed(2));
        }
        $('sessEyebrow').textContent=`${dayLabel(curDay.id)} · إيقاع · الدرجة ${toAr(rhRung+1)}/${toAr(curDay.tolLadder.length)}`;
        $('targetHz').textContent=`نبضة كل ${rhBeatSec.toFixed(2)} ث`;
        $('resultZone').innerHTML=`<div class="msg ok"><div class="head">رفعنا المستوى!</div>السرعة ارتفعت (نبضة كل ${rhBeatSec.toFixed(2)} ث) وهامش التوقيت صار أضيق (±${rhTolMs} م.ث).</div>`;
        renderPips();
      },900);
    } else {
      setTimeout(()=>finishDay({bestHits:hits, bestTolMs:rhTolMs, bestBeatSec:rhBeatSec}),900);
    }
  }
}

