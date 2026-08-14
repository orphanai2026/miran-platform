/* ================= SESSION ================= */
let targetDayId=1, curDay=null, targetHz=null, TARGET_SEC=6, TOL=20, STAB_MAX=20, NEED=3, TR=null;
let attempts=0, recording=false, recData=null, sessionLog=null;
const canvas=$('orbit'), cx=canvas.getContext('2d');
let ORB={w:0,h:0,cx:0,cy:0,unit:0}; const ORB_RANGE=55;

/* ── RANEEN palette (canvas) ── cyan = live · gold = mastery · violet = path ── */
const C={void:'#08081a', deep:'#12102c', violet:'#4A3B7A', vDim:'rgba(74,59,122,.5)',
         live:'#4FE3C1', liveSoft:'rgba(79,227,193,.14)', gold:'#E6B85C', goldHi:'#F7DCA0',
         breath:'#FFB347', bone:'#EDE8F5', muted:'#9B92B8'};

function setupCanvas(){ const r=canvas.getBoundingClientRect(); if(!r.width)return;
  const cssH = 300;
  const dpr=Math.min(2,window.devicePixelRatio||1); canvas.width=r.width*dpr; canvas.height=cssH*dpr;
  cx.setTransform(dpr,0,0,dpr,0,0);
  ORB={w:r.width,h:cssH,cx:r.width/2,cy:cssH/2,unit:(cssH/2-14)/ORB_RANGE}; }
function orbY(c){ return ORB.cy - Math.max(-ORB_RANGE,Math.min(ORB_RANGE,c))*ORB.unit; }

/* shared night ground + faint construction geometry */
function groundBg(){ const {w,h,cx:mx,cy}=ORB; cx.clearRect(0,0,w,h);
  const g=cx.createRadialGradient(mx,cy*.92,10,mx,cy,Math.max(w,h)*.72);
  g.addColorStop(0,C.deep); g.addColorStop(1,C.void); cx.fillStyle=g; cx.fillRect(0,0,w,h); }
function sacredRings(R){ const {cx:mx,cy}=ORB;
  cx.save(); cx.globalAlpha=.34;
  cx.strokeStyle=C.violet; cx.lineWidth=.8; cx.setLineDash([1.5,8]);
  cx.beginPath(); cx.arc(mx,cy,R*1.42,0,7); cx.stroke(); cx.setLineDash([]);
  cx.lineWidth=.7; cx.beginPath(); cx.arc(mx,cy,R*.52,0,7); cx.stroke();
  cx.restore(); }
function drawOrbitBg(){ groundBg(); const {cx:mx,cy}=ORB; const R=82;
  sacredRings(R);
  cx.strokeStyle='rgba(79,227,193,.5)'; cx.lineWidth=1.4; cx.setLineDash([2,7]);
  cx.beginPath(); cx.arc(mx,cy,R,0,7); cx.stroke(); cx.setLineDash([]); }

/* ══ THE REED · shared anatomy renderer ═══════════════════════════════
   Draws a longitudinal cross-section of the ney and places every number in
   its anatomically natural home, so nothing floats without a reason:
     at the mouth   → breath duration      (amber, LEFT of the bore)
     on the body    → note name + live fingering  (gold, ABOVE the bore)
     in the bore    → pitch deviation, at the wave's node   (cyan, CENTRE)
     at the open end→ mastery streak       (cyan, RIGHT of the bore)
   Reserved lanes mean these can never overlap each other or the wave.
   ═══════════════════════════════════════════════════════════════════ */
const REED={x0:0,L:0,R:40,cy:0};
function reedGeom(){
  REED.x0 = 62; REED.L = ORB.w-124; REED.R = 40;
  REED.cy = ORB.cy + 22;                 // leave the top lane for name+holes
  return REED;
}
function drawReedGround(){ const {w,h}=ORB; cx.clearRect(0,0,w,h);
  const g=cx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0d0b20'); g.addColorStop(1,'#080616');
  cx.fillStyle=g; cx.fillRect(0,0,w,h); }

/* one finger hole, honouring partial coverage (0..1 = fraction still covered) */
function drawHole(px,py,rx,ry,s){
  if(s>=1){ cx.fillStyle='rgba(230,184,92,.88)'; cx.beginPath(); cx.ellipse(px,py,rx,ry,0,0,7); cx.fill(); return; }
  cx.fillStyle='#0a0818'; cx.beginPath(); cx.ellipse(px,py,rx,ry,0,0,7); cx.fill();
  if(s>0){ cx.save(); cx.beginPath(); cx.moveTo(px,py);
    const a0=Math.PI/2; cx.ellipse(px,py,rx,ry,0,a0,a0+Math.PI*2*s); cx.closePath();
    cx.fillStyle='rgba(230,184,92,.88)'; cx.fill(); cx.restore(); }
  cx.strokeStyle='rgba(230,184,92,'+(s>0?'.7':'.42')+')'; cx.lineWidth=1;
  cx.beginPath(); cx.ellipse(px,py,rx,ry,0,0,7); cx.stroke();
}

/* the note's identity lane: name, pitch, kind chip, and its live fingering */
function drawNoteLane(fing, noteAr, hzVal){
  const mx=ORB.cx;
  cx.textAlign='center';
  cx.save(); cx.shadowColor='rgba(230,184,92,.45)'; cx.shadowBlur=13;
  cx.fillStyle=C.goldHi||'#F7DCA0'; cx.font="700 27px 'Aref Ruqaa',serif";
  cx.fillText(noteAr, mx, 32); cx.restore();
  if(hzVal){ cx.fillStyle='rgba(155,146,184,.6)'; cx.font="500 9.5px 'IBM Plex Mono',monospace";
    cx.fillText((fing?fing.reg+' · ':'')+Math.round(hzVal)+' Hz', mx, 46); }
  if(!fing) return;
  const N=fing.note;
  const KIND={base:['أساسية','79,227,193'],flat:['بيمول','155,146,184'],
              half:['نصف بيمول · ربع صوت','255,179,71'],sharp:['دييز','230,184,92']};
  const kd=KIND[N.kind]||KIND.base;
  cx.font="600 9px Cairo,sans-serif";
  const cw=cx.measureText(kd[0]).width+16;
  cx.fillStyle='rgba('+kd[1]+',.14)';
  cx.beginPath(); cx.roundRect(mx-cw/2,52,cw,15,8); cx.fill();
  cx.strokeStyle='rgba('+kd[1]+',.4)'; cx.lineWidth=1; cx.stroke();
  cx.fillStyle='rgba('+kd[1]+',.95)'; cx.fillText(kd[0], mx, 63);
  // the live fingering row
  const tw=132, tx=mx-tw/2, ty=82;
  for(let i=0;i<6;i++) drawHole(tx+(i+0.5)*(tw/6), ty, 6, 6, N.front[i]);
  drawHole(tx-22, ty, 5.2, 5.2, N.thumb);
  cx.fillStyle='rgba(155,146,184,.45)'; cx.font="600 7.5px Cairo,sans-serif";
  cx.fillText('خلفي', tx-22, ty+15);
  if(N.hard){ cx.fillStyle='#FF9B78'; cx.font="600 8.5px Cairo,sans-serif";
    cx.fillText('نصف فتحة — تحتاج تحكّمًا دقيقًا', mx, ty+27); }
}

/* the cane itself, with its holes mirrored from the fingering above */
function drawCane(fing){
  const {x0,L,R,cy}=reedGeom();
  cx.save();
  const w=cx.createLinearGradient(0,cy-R-15,0,cy+R+15);
  w.addColorStop(0,'rgba(230,184,92,.24)'); w.addColorStop(.5,'rgba(230,184,92,.05)');
  w.addColorStop(1,'rgba(230,184,92,.24)');
  cx.fillStyle=w; cx.fillRect(x0,cy-R-15,L,15); cx.fillRect(x0,cy+R,L,15);
  cx.strokeStyle='rgba(230,184,92,.5)'; cx.lineWidth=1.2;
  cx.beginPath(); cx.moveTo(x0,cy-R); cx.lineTo(x0+L,cy-R);
  cx.moveTo(x0,cy+R); cx.lineTo(x0+L,cy+R); cx.stroke();
  cx.restore();
  if(fing) for(let i=0;i<6;i++)
    drawHole(x0+L*(0.27+i*0.105), cy-R-7.5, 5.4, 3.6, fing.note.front[i]);
}

/* the standing wave: open pipe → displacement antinodes at both ends,
   node at the centre for the fundamental. Steadiness drives its calm. */
function drawAirColumn(steadyFrac, tPhase){
  const {x0,L,R,cy}=REED;
  const calm=Math.max(0,Math.min(1,steadyFrac));
  const amp=R*0.72, jit=(1-calm)*6;
  const col = calm>0.55 ? C.live : C.breath;
  cx.save();
  cx.shadowColor=col; cx.shadowBlur=8+calm*10;
  cx.strokeStyle=col; cx.lineWidth=2.2;
  for(const sgn of [1,-1]){
    cx.beginPath();
    for(let i=0;i<=L;i+=2){
      const u=i/L, disp=Math.cos(Math.PI*u);
      const j=jit?Math.sin(u*21+tPhase)*jit:0;
      cx.lineTo(x0+i, cy+sgn*(disp*amp+j));
    }
    cx.stroke();
  }
  cx.restore();
  cx.save(); cx.globalAlpha=.32; cx.strokeStyle=C.breath; cx.lineWidth=1.1;
  cx.beginPath();
  for(let i=0;i<=L;i+=2){ const u=i/L; cx.lineTo(x0+i, cy+Math.cos(2*Math.PI*u)*amp*0.45); }
  cx.stroke(); cx.restore();
}
function drawBreathParticles(tPhase, calm){
  const {x0,L,cy}=REED;
  for(let k=0;k<13;k++){
    const p=((tPhase*2.2+k*29)%(L+70))-40;
    if(p<0||p>L) continue;
    const u=p/L;
    const y=cy+Math.sin(k*3.1+tPhase/6)*(calm>0.55?6:13)*Math.abs(Math.cos(Math.PI*u));
    cx.fillStyle='rgba(255,179,71,'+(Math.min(1,p/60)*(1-u*.5)*.75)+')';
    cx.beginPath(); cx.arc(x0+p,y,calm>0.55?1.8:1.3,0,7); cx.fill();
  }
}
/* AT THE MOUTH — breath duration, outside the bore so it never collides */
function drawMouthGauge(val, frac, label, col){
  const {x0,cy}=REED, mx=x0-30;
  const g=cx.createRadialGradient(mx,cy,2,mx,cy,40);
  g.addColorStop(0,'rgba(255,179,71,.26)'); g.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=g; cx.beginPath(); cx.arc(mx,cy,40,0,7); cx.fill();
  cx.strokeStyle='rgba(255,179,71,.16)'; cx.lineWidth=2.8;
  cx.beginPath(); cx.arc(mx,cy,23,0,7); cx.stroke();
  cx.save(); cx.shadowColor=C.breath; cx.shadowBlur=9; cx.lineCap='round';
  cx.strokeStyle=col||C.breath; cx.lineWidth=2.8;
  cx.beginPath(); cx.arc(mx,cy,23,-Math.PI/2,-Math.PI/2+Math.max(0,Math.min(1,frac))*Math.PI*2); cx.stroke();
  cx.restore();
  cx.textAlign='center'; cx.fillStyle=col||C.breath;
  cx.font="500 15px 'IBM Plex Mono',monospace"; cx.fillText(val, mx, cy+3);
  cx.fillStyle='rgba(155,146,184,.6)'; cx.font="600 8px Cairo,sans-serif";
  cx.fillText(label, mx, cy+15);
}
/* IN THE BORE — the deviation, on its own plate at the wave's node */
function drawNodeReadout(txt, sub, col){
  const {x0,L,cy}=REED, nx=x0+L/2;
  cx.save(); cx.fillStyle='rgba(10,8,24,.9)';
  cx.beginPath(); cx.roundRect(nx-38,cy-19,76,38,11); cx.fill();
  cx.strokeStyle=col.replace(')',',.3)').replace('rgb','rgba'); cx.lineWidth=1;
  try{cx.stroke();}catch(e){}
  cx.restore();
  cx.textAlign='center'; cx.fillStyle=col;
  cx.font="500 22px 'IBM Plex Mono',monospace"; cx.fillText(txt, nx, cy+1);
  cx.fillStyle='rgba(155,146,184,.65)'; cx.font="600 8.5px Cairo,sans-serif";
  cx.fillText(sub, nx, cy+15);
}
/* AT THE OPEN END — mastery streak as emitted arcs */
function drawExitStreak(done, need){
  const {x0,L,cy}=REED, ex=x0+L+30;
  const g=cx.createRadialGradient(ex,cy,2,ex,cy,42);
  g.addColorStop(0,'rgba(79,227,193,.2)'); g.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=g; cx.beginPath(); cx.arc(ex,cy,42,0,7); cx.fill();
  const n=Math.max(1,need);
  for(let i=0;i<n;i++){
    const a=-Math.PI/2+(i/n)*Math.PI*2, lit=i<done;
    cx.strokeStyle= lit?C.live:'rgba(155,146,184,.22)';
    cx.lineWidth= lit?3:2;
    if(lit){ cx.save(); cx.shadowColor=C.live; cx.shadowBlur=7; }
    cx.beginPath(); cx.arc(ex,cy,24,a-(Math.PI/n)*0.62,a+(Math.PI/n)*0.62); cx.stroke();
    if(lit) cx.restore();
  }
  cx.textAlign='center'; cx.fillStyle=C.live;
  cx.font="500 15px 'IBM Plex Mono',monospace"; cx.fillText(done+'/'+need, ex, cy+3);
  cx.fillStyle='rgba(155,146,184,.6)'; cx.font="600 8px Cairo,sans-serif";
  cx.fillText('إتقان', ex, cy+15);
}
/* quiet context strip along the bottom */
function drawContextStrip(left, right, rightCol){
  cx.textAlign='left'; cx.fillStyle='rgba(155,146,184,.45)';
  cx.font="600 9.5px Cairo,sans-serif"; cx.fillText(left, 14, ORB.h-12);
  if(right){ cx.textAlign='right'; cx.fillStyle=rightCol||'rgba(155,146,184,.55)';
    cx.fillText(right, ORB.w-14, ORB.h-12); }
  cx.textAlign='start';
}

/* ── LONG TONE, drawn inside the reed ──
   The air column IS the pitch: steady breath = a calm standing wave;
   wavering breath = a wave that shudders. A rolling window of your recent
   deviation drives how calm it looks, so the picture is your playing. */
let _thread=[]; let _threadStep=0; const THREAD_N=110;

function currentFingering(){
  if(!curDay) return null;
  if(curDay.semis!=null) return fingeringFor(curDay.semis);
  if(curDay.from && curDay.from.semis!=null) return fingeringFor(curDay.from.semis);
  return null;
}
function dayHasFlaggedFingering(day){
  if(!day) return false;
  const semisList=[];
  if(day.semis!=null) semisList.push(day.semis);
  if(day.from && day.from.semis!=null) semisList.push(day.from.semis);
  if(day.to && day.to.semis!=null) semisList.push(day.to.semis);
  if(day.notesSemis) semisList.push(...day.notesSemis);
  return semisList.some(s=>{ const f=fingeringFor(s); return f && f.note.flagged; });
}
function calmFromThread(){
  const pts=_thread.filter(p=>!p.mute).slice(-26);
  if(!pts.length) return 0;
  const inTol=pts.filter(p=>p.ok).length/pts.length;
  const vals=pts.map(p=>p.c); const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
  const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)*(b-mean),0)/vals.length);
  const steadiness=Math.max(0,1-sd/Math.max(8,STAB_MAX));
  return Math.max(0,Math.min(1,inTol*0.55+steadiness*0.45));
}
function drawThreadBg(){
  drawReedGround(); reedGeom();
  const f=currentFingering();
  drawNoteLane(f, curDay&&curDay.note?curDay.note:'', targetHz);
  drawCane(f);
}
function drawThreadIdle(){
  drawThreadBg();
  drawAirColumn(1, 0);
  drawMouthGauge('0.0', 0, 'ثانية');
  drawExitStreak(attempts||0, NEED||7);
  cx.textAlign='center'; cx.fillStyle=C.muted; cx.font="500 12px Cairo,sans-serif";
  cx.fillText('اضغط «ابدأ» ثم انفخ', ORB.cx, ORB.h-32); cx.textAlign='start';
  drawContextStrip(dayLabel(curDay?curDay.id:1)+' · نغمة طويلة', '');
}
function _pushThread(entry){ entry.slot=_threadStep%THREAD_N; _threadStep++;
  _thread.push(entry); if(_thread.length>THREAD_N)_thread.shift(); }

function _reedFrame(cents, inTune, mute){
  const calm = mute?0:calmFromThread();
  const run = recData? longestRun(recData.voiced||[]) : 0;
  drawThreadBg();
  drawAirColumn(calm, _threadStep/3);
  drawBreathParticles(_threadStep, calm);
  drawMouthGauge(run.toFixed(1), TARGET_SEC?run/TARGET_SEC:0, 'ثانية');
  if(mute) drawNodeReadout('—','لا صوت','rgba(155,146,184,.8)');
  else{
    const ok=inTune&&Math.abs(cents)<=TOL;
    drawNodeReadout((cents>=0?'+':'')+cents.toFixed(0),'سنت', ok?C.live:C.breath);
  }
  drawExitStreak(attempts||0, NEED||7);
  drawContextStrip(dayLabel(curDay?curDay.id:1)+' · نغمة طويلة',
    mute?'':(calm>0.55?'الموجة مستقرّة':'الموجة مضطربة'),
    mute?'':(calm>0.55?'rgba(79,227,193,.7)':'rgba(255,179,71,.75)'));
}
function renderThread(cents, inTune){
  _pushThread({c:cents, ok:inTune&&Math.abs(cents)<=TOL});
  _reedFrame(cents, inTune, false);
}
function renderThreadSilent(){
  _pushThread({c:0, ok:false, mute:true});
  _reedFrame(0,false,true);
}

function restoreStreak(){
  const rec = prog.inProgress && prog.inProgress[curDay.id];
  if(!rec || !rec.attempts || !rec.attempts.length) return 0;
  let c=0;
  for(let i=rec.attempts.length-1;i>=0;i--){ if(rec.attempts[i].success) c++; else break; }
  return Math.min(c, NEED);
}
function setGlyphText(text){
  const el=$('sessGlyph'); el.textContent=text;
  // long note-pair names (quarter-tone combinations especially) wrap to three
  // lines at full size — step the font down so they read as cleanly as short
  // single-word names like "دو" do, instead of looking like an afterthought.
  el.style.fontSize = text.length>14 ? '1.7rem' : text.length>9 ? '2.2rem' : '';
  const flagged = dayHasFlaggedFingering(curDay);
  $('flagBadge').style.display = flagged ? 'inline' : 'none';
  if(flagged){
    const eyeEl=$('sessEyebrow');
    if(!eyeEl.textContent.includes('يحتاج تأكيدك')) eyeEl.textContent += ' · ؟ يحتاج تأكيدك بالعزف';
  }
}
function startSession(id){
  curDay=CURRICULUM[id-1];
  if(curDay.kind==='soon') return;
  attempts=0; NEED=curDay.need; TOL=curDay.tol; failStreak=0;
  if(curDay.kind==='transition'){
    TR={fromHz:calib.qararHz*Math.pow(2,curDay.from.semis/12),
        toHz:calib.qararHz*Math.pow(2,curDay.to.semis/12),
        span:(curDay.to.semis-curDay.from.semis)*100};
    trRung = curDay.tolLadder ? 0 : -1;
    if(curDay.tolLadder){ TOL=curDay.tolLadder[0]; trGapMax=curDay.gapLadder[0]; NEED=curDay.rungNeed[0];
      TR_HOLD_FROM=curDay.holdFromLadder?curDay.holdFromLadder[0]:2.2; TR_HOLD_TO=curDay.holdToLadder?curDay.holdToLadder[0]:2.6; TR_END=TR_HOLD_FROM+TR_MOVE+TR_HOLD_TO; }
    else { TOL=curDay.tol; trGapMax=0.45; TR_HOLD_FROM=2.2; TR_HOLD_TO=2.6; TR_END=TR_HOLD_FROM+TR_MOVE+TR_HOLD_TO; }
    attempts=restoreStreak(); _failPattern=[]; resetDrift();
    sessionLog={app:'miran', version:APP_VERSION, day:id, kind:'transition', pair:curDay.lat,
      concert_A4:CONCERT_A4, qarar_hz:+calib.qararHz.toFixed(2),
      from_hz:+TR.fromHz.toFixed(2), to_hz:+TR.toHz.toFixed(2), started:new Date().toISOString(), attempts:[]};
    $('sessEyebrow').textContent = curDay.tolLadder ? `${dayLabel(id)} · انتقال · الدرجة ${toAr(trRung+1)}/${toAr(curDay.tolLadder.length)}` : `${dayLabel(id)} · انتقال`;
    setGlyphText(curDay.from.note+' → '+curDay.to.note); $('sessLat').textContent=curDay.lat;
    $('targetHz').textContent=`${TR.fromHz.toFixed(0)} → ${TR.toHz.toFixed(0)} Hz`;
    $('sustainLabel').textContent='تقدّم التمرين';
    $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('targetSec').textContent='—'; $('sustainBar').style.width='0%';
    renderPips(); syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawTransitionIdle();},40);
    dervishIntroFor(curDay);
    return;
  }
  if(curDay.kind==='exchange'){
    exHoldCount=0; exGraceUsed=false; exTargetReachedThisSession=false; _failPattern=[];
    TR={fromHz:calib.qararHz*Math.pow(2,curDay.from.semis/12),
        toHz:calib.qararHz*Math.pow(2,curDay.to.semis/12),
        span:(curDay.to.semis-curDay.from.semis)*100, beatSec:curDay.beatStart, reps:curDay.reps};
    attempts=restoreStreak(); _failPattern=[]; resetDrift();
    { const rec=prog.inProgress&&prog.inProgress[curDay.id];
      if(rec&&rec.attempts&&rec.attempts.length){ const lastBS=rec.attempts[rec.attempts.length-1].beat_sec; if(lastBS) TR.beatSec=lastBS; } }
    sessionLog={app:'miran', version:APP_VERSION, day:id, kind:'exchange', pair:curDay.lat,
      concert_A4:CONCERT_A4, qarar_hz:+calib.qararHz.toFixed(2),
      from_hz:+TR.fromHz.toFixed(2), to_hz:+TR.toHz.toFixed(2), beat_sec_start:TR.beatSec, started:new Date().toISOString(), attempts:[]};
    $('sessEyebrow').textContent=`${dayLabel(id)} · تبادل · ${TR.beatSec.toFixed(2)} ث (الهدف ${curDay.beatMin.toFixed(2)})`;
    setGlyphText(curDay.from.note+' ⇄ '+curDay.to.note); $('sessLat').textContent=curDay.lat;
    $('targetHz').textContent=`${TR.fromHz.toFixed(0)} ⇄ ${TR.toHz.toFixed(0)} Hz`;
    $('sustainLabel').textContent='تقدّم التمرين';
    $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('targetSec').textContent='—'; $('sustainBar').style.width='0%';
    renderPips(); syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawTransitionIdle();},40);
    dervishIntroFor(curDay);
    return;
  }
  if(curDay.kind==='rhythm'){
    rhRung = curDay.tolLadder ? 0 : -1;
    rhTolMs = curDay.tolLadder ? curDay.tolLadder[0] : 250;
    NEED = curDay.tolLadder ? curDay.rungNeed[0] : curDay.need;
    attempts=restoreStreak(); _failPattern=[]; resetDrift();
    // tempo ladder: start slow (beatStart) and speed up toward the target
    // (beatMin) as the trainee masters each speed — same proven progressive
    // design as the exchange exercises, now applied to rhythm/subdivision too.
    rhBeatSec = curDay.beatStart!=null ? curDay.beatStart : curDay.beatSec;
    rhHoldCount = 0;
    sessionLog={app:'miran', version:APP_VERSION, day:id, kind:'rhythm', beats:curDay.beats, beat_sec:curDay.beatSec, started:new Date().toISOString(), attempts:[]};
    $('sessEyebrow').textContent = curDay.tolLadder ? `${dayLabel(id)} · إيقاع · الدرجة ${toAr(rhRung+1)}/${toAr(curDay.tolLadder.length)}` : `${dayLabel(id)} · إيقاع`;
    setGlyphText('♩'); $('sessLat').textContent='';
    $('targetHz').textContent=`نبضة كل ${rhBeatSec.toFixed(2)} ث`;
    $('sustainLabel').textContent='تقدّم الدورة';
    $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('targetSec').textContent='—'; $('sustainBar').style.width='0%';
    renderPips(); syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawRhythmIdle();},40);
    dervishIntroFor(curDay);
    return;
  }
  if(curDay.kind==='rhythmdrop'){
    rdRung=0; rdDrop=new Set(curDay.dropLadder[0]); NEED=curDay.rungNeed[0]; attempts=restoreStreak(); _failPattern=[]; resetDrift();
    sessionLog={app:'miran', version:APP_VERSION, day:id, kind:'rhythmdrop', beats:curDay.beats, beat_sec:curDay.beatSec, started:new Date().toISOString(), attempts:[]};
    $('sessEyebrow').textContent=`${dayLabel(id)} · إيقاع · حذف · الدرجة ${toAr(rdRung+1)}/${toAr(curDay.dropLadder.length)}`;
    setGlyphText('♩'); $('sessLat').textContent='';
    $('targetHz').textContent=`نبضة كل ${curDay.beatSec.toFixed(2)} ث`;
    $('sustainLabel').textContent='تقدّم الدورة';
    $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('targetSec').textContent='—'; $('sustainBar').style.width='0%';
    renderPips(); syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawRhythmIdle();},40);
    dervishIntroFor(curDay);
    return;
  }
  if(curDay.kind==='sustainRhythm'){
    NEED=curDay.need||7; attempts=restoreStreak(); _failPattern=[]; resetDrift();
    sessionLog={app:'miran', version:APP_VERSION, day:id, kind:'sustainRhythm', beats:curDay.beats, beat_sec:curDay.beatSec, started:new Date().toISOString(), attempts:[]};
    $('sessEyebrow').textContent=`${dayLabel(id)} · نغمة ممتدّة`;
    setGlyphText('♩'); $('sessLat').textContent='';
    $('targetHz').textContent=`${curDay.beats} نبضات متّصلة`;
    $('sustainLabel').textContent='استمرارية النغمة';
    $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('targetSec').textContent='—'; $('sustainBar').style.width='0%';
    renderPips(); syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawRhythmIdle();},40);
    dervishIntroFor(curDay);
    return;
  }
  if(curDay.kind==='jins'){
    NEED=curDay.need||7; attempts=restoreStreak(); _failPattern=[]; resetDrift();
    sessionLog={app:'miran', version:APP_VERSION, day:id, kind:'jins', notesSemis:curDay.notesSemis, started:new Date().toISOString(), attempts:[]};
    $('sessEyebrow').textContent=`${dayLabel(id)} · جنس`;
    setGlyphText('♫'); $('sessLat').textContent='';
    $('targetHz').textContent=`${toAr(curDay.notesSemis.length)} نغمات بالترتيب`;
    $('sustainLabel').textContent='تقدّم الجنس';
    $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('targetSec').textContent='—'; $('sustainBar').style.width='0%';
    renderPips(); syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawRhythmIdle();},40);
    dervishIntroFor(curDay);
    return;
  }
  if(curDay.kind==='tongue'){
    rhRung = curDay.tolLadder ? 0 : -1;
    rhTolMs = curDay.tolLadder ? curDay.tolLadder[0] : 250;
    NEED = curDay.tolLadder ? curDay.rungNeed[0] : curDay.need;
    attempts=restoreStreak(); _failPattern=[]; resetDrift();
    sessionLog={app:'miran', version:APP_VERSION, day:id, kind:'tongue', beats:curDay.beats, beat_sec:curDay.beatSec, started:new Date().toISOString(), attempts:[]};
    $('sessEyebrow').textContent = curDay.tolLadder ? `${dayLabel(id)} · نقر · الدرجة ${toAr(rhRung+1)}/${toAr(curDay.tolLadder.length)}` : `${dayLabel(id)} · نقر`;
    setGlyphText('♩'); $('sessLat').textContent='';
    $('targetHz').textContent=`نبضة كل ${curDay.beatSec.toFixed(2)} ث`;
    $('sustainLabel').textContent='تقدّم الدورة';
    $('resultZone').innerHTML=''; $('sustainNum').textContent='0.0'; $('targetSec').textContent='—'; $('sustainBar').style.width='0%';
    renderPips(); syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawRhythmIdle();},40);
    if(!_seenIntro.has('tongue-air') && !prog.tongueAirSeen){
      _seenIntro.add('tongue-air'); prog.tongueAirSeen=true; saveProg();
      setIntroBlocking(true);
      _introTimeout=setTimeout(()=>showDervish(
        'قبل أن تنفخ: جرّب النطق بلا الناي أولًا — قل «تُو-تُو-تُو» بلسانك عدّة مرّات. الآن افعل الشيء نفسه بالناي: لا توقف نفَسك بين كل نقرة — لسانك وحده يقطع الصوت، والهواء يبقى مستمرًّا خلفه.',
        {audioKey:'intro_tongue_air', blocking:true, onEnd:()=>dervishIntroFor(curDay)}), 500);
    } else dervishIntroFor(curDay);
    return;
  }
  targetHz=dayTarget(curDay);
  ltRung = curDay.durLadder ? 0 : -1;
  if(curDay.durLadder){ TARGET_SEC=curDay.durLadder[0]; STAB_MAX=Math.round(curDay.stabMax*curDay.stabMult[0]); NEED=curDay.rungNeed[0]; }
  else { TARGET_SEC=curDay.targetSec; STAB_MAX=curDay.stabMax; }
  attempts=restoreStreak(); _failPattern=[]; resetDrift();
  sessionLog={app:'miran', version:APP_VERSION, day:id, note:curDay.lat, kind:curDay.kind,
    concert_A4:CONCERT_A4, qarar_hz:+calib.qararHz.toFixed(2), target_hz:+targetHz.toFixed(2), started:new Date().toISOString(), attempts:[]};
  $('sessEyebrow').textContent = curDay.durLadder ? `${dayLabel(id)} · نغمة طويلة · الدرجة ${toAr(ltRung+1)}/${toAr(curDay.durLadder.length)}` : `${dayLabel(id)} · نغمة طويلة`;
  setGlyphText(curDay.note); $('sessLat').textContent=curDay.lat;
  $('targetHz').textContent=targetHz.toFixed(1)+' Hz'; $('targetSec').textContent=TARGET_SEC.toFixed(1);
  $('sustainLabel').textContent='ثبات النفَس على النغمة';
  $('resultZone').innerHTML='';
  $('sustainNum').textContent='0.0'; $('sustainBar').style.width='0%';
  renderPips(); syncListenBtn(); show('session'); setTimeout(()=>{setupCanvas();drawThreadIdle();},40);
  dervishIntroFor(curDay);
}
let ltRung=-1;
let trRung=-1, trGapMax=0.45;
let exHoldCount=0; // successes held at the current exchange tempo before speeding up (needs 2, or 4 near the target)
let exTargetReachedThisSession=false; // fires the speed-lock invitation once per session, right when beatMin is first reached
let exGraceUsed=false; // near the target tempo, the FIRST failure at a given speed is forgiven — only a second consecutive one pushes the tempo back
function renderPips(){ $('pips').innerHTML=''; for(let i=0;i<NEED;i++){const d=document.createElement('div');d.className='pip'+(i<attempts?' done':'');$('pips').appendChild(d);} }

function drawIdleBall(){ // dim resting ball at centre + hint
  const {cx:mx,cy}=ORB; cx.fillStyle='rgba(155,146,184,.45)'; cx.beginPath(); cx.arc(mx,cy,8,0,7); cx.fill();
  cx.fillStyle='rgba(155,146,184,.7)'; cx.font="500 13px Cairo,sans-serif"; cx.textAlign='center';
  cx.fillText('اضغط «ابدأ العزف»', mx, ORB.h-16); cx.textAlign='start'; }
// live orbit render: ball at (centre-x, y=cents), fading breath tail, calm-rings
let _rings=[], _tail=[], _steadyAcc=0, _lastTs=0;
function renderOrbit(cents, inTune, now){
  drawOrbitBg(); const {cx:mx,cy}=ORB; const px=mx, py=orbY(cents);
  const dt=Math.min(0.05,(now-_lastTs)||0.016); _lastTs=now;
  _tail.push({x:px,y:py,ok:inTune}); if(_tail.length>70)_tail.shift();
  if(inTune){ _steadyAcc+=dt; if(_steadyAcc>0.5){_steadyAcc=0;_rings.push({r:TOL*ORB.unit,a:.5});} } else _steadyAcc=0;
  for(let i=_rings.length-1;i>=0;i--){const r=_rings[i]; r.r+=dt*46; r.a-=dt*.55; if(r.a<=0){_rings.splice(i,1);continue;}
    cx.strokeStyle='rgba(79,227,193,'+r.a.toFixed(3)+')'; cx.lineWidth=2; cx.beginPath(); cx.arc(mx,cy,r.r,0,7); cx.stroke(); }
  for(let i=1;i<_tail.length;i++){const a=i/_tail.length,s=_tail[i];
    cx.strokeStyle=(s.ok?'rgba(79,227,193,':'rgba(255,179,71,')+(a*.7).toFixed(3)+')'; cx.lineWidth=1+a*2.5;
    cx.beginPath(); cx.moveTo(_tail[i-1].x,_tail[i-1].y); cx.lineTo(s.x,s.y); cx.stroke(); }
  const col=inTune?C.live:C.breath;
  const g=cx.createRadialGradient(px,py,1,px,py,26); g.addColorStop(0,inTune?'rgba(79,227,193,.5)':'rgba(255,179,71,.45)'); g.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=g; cx.beginPath(); cx.arc(px,py,26,0,7); cx.fill();
  cx.fillStyle=col; cx.beginPath(); cx.arc(px,py,10,0,7); cx.fill();
  cx.fillStyle='rgba(255,255,255,.85)'; cx.beginPath(); cx.arc(px-3,py-3,3,0,7); cx.fill();
  cx.fillStyle=inTune?'#a9ecdd':'#ffcf9a'; cx.font="600 16px 'IBM Plex Mono',monospace"; cx.textAlign='center';
  cx.fillText((cents>=0?'+':'')+cents.toFixed(0)+' cents', mx, 26); cx.textAlign='start';
}
function renderOrbitSilent(now){ drawOrbitBg(); const {cx:mx,cy}=ORB; const dt=Math.min(0.05,(now-_lastTs)||0.016); _lastTs=now;
  for(let i=_rings.length-1;i>=0;i--){const r=_rings[i];r.r+=dt*46;r.a-=dt*.55;if(r.a<=0){_rings.splice(i,1);continue;}cx.strokeStyle='rgba(79,227,193,'+r.a.toFixed(3)+')';cx.lineWidth=2;cx.beginPath();cx.arc(mx,cy,r.r,0,7);cx.stroke();}
  cx.fillStyle='rgba(155,146,184,.55)'; cx.beginPath(); cx.arc(mx,cy,8,0,7); cx.fill();
  cx.fillStyle='rgba(155,146,184,.7)'; cx.font="500 13px Cairo,sans-serif"; cx.textAlign='center'; cx.fillText('… انفخ في الناي', mx, 26); cx.textAlign='start'; }

/* reference tone + metronome */
let droneOsc=null;
function tone(freq, startAt, dur, peakGain){
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type='sine'; o.frequency.value=freq; g.gain.value=0.0001;
  o.connect(g).connect(audioCtx.destination); o.start(startAt);
  g.gain.setValueAtTime(0.0001,startAt);
  g.gain.exponentialRampToValueAtTime(peakGain||0.16, startAt+0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt+dur);
  o.stop(startAt+dur+0.05);
}
/* ---- listening example: plays a REAL ney recording of the note when available
   (demonstrates actual technique — attack, breath shape, timbre — not just pitch),
   falling back to a synthesized sine tone if no recording exists for that note yet. ---- */
function playNoteRef(noteLat, fallbackFreq, fallbackDur, onDone){
  if(!noteLat){ tone(fallbackFreq, audioCtx.currentTime+0.02, fallbackDur); setTimeout(onDone, fallbackDur*1000+150); return; }
  const a=new Audio(`ney-audio/note_${noteLat}.mp3`);
  let fired=false;
  const useFallback=()=>{ if(fired)return; fired=true; tone(fallbackFreq, audioCtx.currentTime+0.02, fallbackDur); setTimeout(onDone, fallbackDur*1000+150); };
  const onEnded=()=>{ if(fired)return; fired=true; onDone(); };
  a.addEventListener('ended', onEnded, {once:true});
  a.addEventListener('error', useFallback, {once:true});
  a.play().catch(useFallback);
}
/* ---- listening example: loops the target note/interval until stopped ---- */
let _listenPlaying=false, _listenTimer=null, _listenGen=0;
function scheduleListenCycle(gen){
  if(!_listenPlaying || gen!==_listenGen) return;   // this chain belongs to an earlier day/click — abandon it
  // jins/maqam sequences: play the actual musical phrase — audiation before
  // performance, not the other way around. Synthesized (no recording needed).
  if(curDay.kind==='jins'){
    const seq=curDay.notesSemis, noteDur=0.42, gap=0.06;
    const base=audioCtx.currentTime+0.1;
    seq.forEach((semis,i)=>{
      const hz=calib.qararHz*Math.pow(2,semis/12);
      tone(hz, base+i*(noteDur+gap), noteDur, 0.18);
    });
    const total=seq.length*(noteDur+gap)+0.9;
    _listenTimer=setTimeout(()=>scheduleListenCycle(gen), total*1000);
    return;
  }
  // rhythm days: the example is the BEAT PATTERN, not a pitch
  if(curDay.kind==='rhythm'||curDay.kind==='rhythmdrop'){
    const n=curDay.beats, b=curDay.beatSec;
    const drop = curDay.kind==='rhythmdrop' ? rdDrop : new Set();
    for(let i=0;i<=n;i++){
      if(drop.has(i)) continue;                       // silent beats stay silent in the demo too
      const at=audioCtx.currentTime+0.08+i*b;
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.frequency.value=i%4===0?1300:1100; g.gain.value=0.0001;
      o.connect(g).connect(audioCtx.destination); o.start(at);
      g.gain.setValueAtTime(0.0001,at); g.gain.exponentialRampToValueAtTime(.2,at+.005);
      g.gain.exponentialRampToValueAtTime(0.0001,at+.09); o.stop(at+.1);
    }
    _listenTimer=setTimeout(()=>scheduleListenCycle(gen),(n*b+1.1)*1000);
    return;
  }
  const moving = curDay.kind==='transition' || curDay.kind==='exchange';
  if(moving){
    playNoteRef(curDay.from.lat, TR.fromHz, 0.9, ()=>{
      if(!_listenPlaying || gen!==_listenGen) return;
      _listenTimer=setTimeout(()=>{
        if(!_listenPlaying || gen!==_listenGen) return;
        playNoteRef(curDay.to.lat, TR.toHz, 0.9, ()=>{
          if(!_listenPlaying || gen!==_listenGen) return;
          _listenTimer=setTimeout(()=>scheduleListenCycle(gen), 700);
        });
      }, 150);
    });
  } else {
    const hz = curDay.kind==='longtone' ? dayTarget(curDay) : targetHz;
    if(!hz){ stopListen(); return; }
    playNoteRef(curDay.lat, hz, 1.6, ()=>{ if(!_listenPlaying || gen!==_listenGen) return; _listenTimer=setTimeout(()=>scheduleListenCycle(gen), 600); });
  }
}
$('btnListen').addEventListener('click', async ()=>{
  ensureOutput();                                  // no microphone needed to hear an example
  if(_listenPlaying){ stopListen(); return; }
  if(!listenAvailable()) return;
  _listenPlaying=true; _listenGen++; $('btnListen').innerHTML='<span class="deck-icon">⏸</span>'; $('btnListen').classList.add('playing');
  scheduleListenCycle(_listenGen);
});
function stopListen(){ _listenPlaying=false; _listenGen++; clearTimeout(_listenTimer);
  $('btnListen').innerHTML='<span class="deck-icon">🔊</span>'; $('btnListen').classList.remove('playing'); }
/* which days actually HAVE an example to hear */
function listenAvailable(){
  if(!curDay) return false;
  if(curDay.kind==='breath') return false;                 // pitch-agnostic AND beat-free: nothing to demo
  if(curDay.kind==='jins') return !!(curDay.notesSemis && curDay.notesSemis.length);
  if(curDay.kind==='rhythm'||curDay.kind==='rhythmdrop') return true;  // the beat pattern is the example
  if(curDay.kind==='transition'||curDay.kind==='exchange') return !!TR;
  return !!(curDay.kind==='longtone' ? dayTarget(curDay) : targetHz);
}
/* show/hide + relabel the listen control for the day being opened */
function syncListenBtn(){
  const wrap=$('btnListen').parentElement, lbl=wrap.querySelector('.deck-label');
  const on=listenAvailable(); wrap.style.display = on?'':'none';
  if(!on){ stopListen(); return; }
  const beat = curDay.kind==='rhythm'||curDay.kind==='rhythmdrop';
  lbl.textContent = curDay.kind==='jins' ? 'استمع للمقام' : (beat ? 'استمع للإيقاع' : 'استمع للمثال');
  $('btnListen').title = curDay.kind==='jins' ? 'استمع لجملة المقام قبل العزف' : (beat ? 'استمع لنمط النبضات' : 'استمع للمثال بتكرار');
}

/* ---- metronome: cycles both → sound-only → light-only → off ---- */
let metroMode='both'; // 'off' | 'both' | 'sound' | 'light' — on by default: passive rhythm exposure from day one
const METRO_LABEL={off:'متوقّف', both:'صوت وضوء', sound:'صوت فقط', light:'ضوء فقط'};
const METRO_ICON ={off:'♩', both:'♩', sound:'♩', light:'♩'}; // one identity; the label states the mode
function updateMetroBtn(){
  $('metroIcon').textContent=METRO_ICON[metroMode];
  $('metroLabel').textContent=METRO_LABEL[metroMode];
  $('btnMetro').classList.toggle('active', metroMode!=='off');
}
$('btnMetro').addEventListener('click', ()=>{
  ensureOutput();
  metroMode = metroMode==='off'?'both' : metroMode==='both'?'sound' : metroMode==='sound'?'light' : 'off';
  updateMetroBtn();
  if(metroMode==='off') stopMetro(); else if(!metroTimer && recording) startMetro();
});
updateMetroBtn();

let metroTimer=null, nextBeatTime=0; const BEAT_SEC=1.0;
function flashBeat(){ const el=$('beatLight'); if(!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
function beepAllowed(){ return metroMode==='both' || metroMode==='sound'; }
function scheduleClick(at){
  if(beepAllowed()){
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.frequency.value=1600;g.gain.value=0.0001;o.connect(g).connect(audioCtx.destination);o.start(at);
    g.gain.setValueAtTime(0.0001,at);g.gain.exponentialRampToValueAtTime(0.22,at+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001,at+0.09);o.stop(at+0.1);
  }
  if(metroMode==='both'||metroMode==='light'){
    const delayMs=Math.max(0,(at-audioCtx.currentTime)*1000); setTimeout(flashBeat, delayMs);
  }
}
function metroSched(){ while(nextBeatTime<audioCtx.currentTime+0.12){ scheduleClick(nextBeatTime); nextBeatTime+=BEAT_SEC; } }
function startMetro(){ if(metroMode==='off')return; nextBeatTime=audioCtx.currentTime+0.06; metroSched(); metroTimer=setInterval(metroSched,25); }
function stopMetro(){ if(metroTimer){clearInterval(metroTimer);metroTimer=null;} }

let counting=false;
/* playTick: the MANDATORY cue clicks (count-in, exchange beat pulse) — always
   audible + always flashes, independent of the optional practice-metronome mode above. */
function playTick(freq){ if(!audioCtx)return; flashBeat();
  // short, high click (not a sustained tone) — minimizes bleed into the mic's
  // pitch-detection window right when the trainee's own onset is expected at
  // that exact instant. Real attempt data showed main-beat positions (where
  // the tick sounds) failing far more than sub-beat positions (silent) —
  // this is the fix, not muting detection (which would blind the very
  // onset we need to hear).
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.frequency.value=(freq&&freq>2000)?freq:(freq===1300?4200:3400); // well above the ney's fundamental+harmonic range
  g.gain.value=0.0001; o.connect(g).connect(audioCtx.destination);
  const t=audioCtx.currentTime; o.start(t); g.gain.exponentialRampToValueAtTime(0.16,t+0.003);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.035); o.stop(t+0.04); }
function drawCountdown(k){
  setupCanvas();
  const compact = curDay.kind==='longtone';
  const moving = curDay.kind==='transition' || curDay.kind==='exchange';
  if(curDay.kind==='breath') drawBreathBg(); else if(curDay.kind==='rhythm'||curDay.kind==='rhythmdrop') drawRhythmBg(); else if(moving) drawTransitionBg(0); else if(compact) drawThreadBg(); else drawOrbitBg();
  cx.fillStyle='rgba(230,184,92,.92)'; cx.font=(compact?"700 34px ":"700 66px ")+"'Aref Ruqaa',serif"; cx.textAlign='center';
  cx.fillText(toAr(k), ORB.cx, ORB.cy + (compact?10:24));
  if(!compact){
    cx.fillStyle='rgba(237,232,245,.8)'; cx.font="500 14px Cairo,sans-serif";
    const note = curDay.kind==='breath' ? 'خذ نفَسًا عميقًا' : (curDay.kind==='rhythm'||curDay.kind==='rhythmdrop') ? 'استعدّ للنبضة الأولى' : (moving ? 'استعدّ على '+curDay.from.note : 'استعدّ على '+curDay.note);
    cx.fillText(note, ORB.cx, ORB.h-20);
  }
  cx.textAlign='start';
}
function restoreSustainLabel(){
  $('sustainUnit').style.display=''; $('sustainNum').textContent='0.0'; $('sustainBar').style.width='0%';
  if(curDay.kind==='breath'){ $('sustainLabel').textContent='مدة النفَس الثابت'; $('targetSec').textContent=breathTarget.toFixed(1); }
  else if(curDay.kind==='longtone'){ $('sustainLabel').textContent='ثبات النفَس على النغمة'; $('targetSec').textContent=TARGET_SEC.toFixed(1); }
  else { $('sustainLabel').textContent='تقدّم التمرين'; $('targetSec').textContent='—'; $('sustainUnit').style.display='none'; }
}
function stopDervishVoice(){
  try{ if('speechSynthesis' in window){
    speechSynthesis.cancel();
    // some Android/Chrome builds ignore a single cancel mid-utterance
    setTimeout(()=>{ try{ speechSynthesis.cancel(); }catch(e){} }, 30);
  } }catch(e){}
  if(_dervishAudio){ try{ _dervishAudio.pause(); _dervishAudio.currentTime=0; }catch(e){} }
  _dervishSpeaking=false;
}
let _countdownIv=null;
let _paused=false, _pauseStart=0, _savedOnFrame=null, _metroWasOn=false;
function showPauseControl(){
  $('pauseWrap').style.display=''; _paused=false;
  $('pauseIcon').textContent='⏸'; $('pauseLabel').textContent='خذ نفَسًا';
  $('btnPause').classList.remove('active');
}
function hidePauseControl(){
  $('pauseWrap').style.display='none';
  if(_paused){ _paused=false; onFrame=_savedOnFrame; _savedOnFrame=null; } // safety: never leave onFrame stuck null
}
function togglePause(){
  if(!recording) return;
  if(!_paused){
    _paused=true; _pauseStart=performance.now();
    _savedOnFrame=onFrame; onFrame=null;
    _metroWasOn=!!metroTimer; stopMetro();
    $('pauseIcon').textContent='▶'; $('pauseLabel').textContent='استأنف';
    $('btnPause').classList.add('active');
  } else {
    _paused=false;
    const pausedMs=performance.now()-_pauseStart;
    // every exercise measures elapsed time as (performance.now()-recData.t0)/1000 —
    // shifting t0 forward by exactly how long we paused makes the clock pick up
    // right where it left off, with no jump and no lost/counted pause time.
    if(recData && recData.t0!=null) recData.t0 += pausedMs;
    onFrame=_savedOnFrame; _savedOnFrame=null;
    if(_metroWasOn) startMetro();
    $('pauseIcon').textContent='⏸'; $('pauseLabel').textContent='خذ نفَسًا';
    $('btnPause').classList.remove('active');
  }
}
$('btnPause').addEventListener('click', togglePause);
function runCountdown(cb){
  stopDervishVoice();                 // never let guidance speech bleed into the count-in cue
  if(typeof stopListen==='function') stopListen(); // never let the example demo bleed into the count-in cue either
  restoreSustainLabel();
  counting=true; $('btnRecLabel').textContent='…'; let n=4; drawCountdown(n); playTick(1100);
  _countdownIv=setInterval(()=>{ n--;
    if(n>=1){ drawCountdown(n); playTick(n===1?1650:1100); }
    else { clearInterval(_countdownIv); _countdownIv=null; counting=false; cb(); showPauseControl(); }
  },1000);
}
$('btnRec').addEventListener('click', async ()=>{
  if(counting) return;
  if(recording){ stopAttempt(); return; }
  if(!analyser){ try{await initAudio(); if(audioCtx.state==='suspended')await audioCtx.resume(); if(!rafId)loop();}catch(e){ setupCanvas();drawOrbitBg(); cx.fillStyle='#ffcf9a';cx.font="500 14px Cairo,sans-serif";cx.textAlign='center';cx.fillText('تعذّر الميكروفون — اسمح بالإذن',ORB.cx,ORB.cy);cx.textAlign='start'; return;} }
  runCountdown(()=> curDay.kind==='breath'? startBreath() : curDay.kind==='dynamic'? startDynamic() : curDay.kind==='transition'? startTransition() : curDay.kind==='exchange'? startExchange() : curDay.kind==='rhythm'? startRhythm() : curDay.kind==='rhythmdrop'? startRhythmDrop() : curDay.kind==='sustainRhythm'? startSustainRhythm() : curDay.kind==='tongue'? startTongue() : curDay.kind==='jins'? startJins() : startAttempt());
});
function startAttempt(){
  recording=true; $('btnRecLabel').textContent='إنهاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  recData={t0:performance.now(),pts:[],voiced:[]}; setupCanvas(); _thread=[]; _threadStep=0; _lastTs=0;
  if(metroMode!=='off') startMetro();
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000; const nowS=performance.now()/1000;
    const inTune=p.hz && p.clarity>=CLARITY; let cents=null;
    if(inTune){ cents=centsBetween(p.hz,targetHz);
      while(cents>600)cents-=1200; while(cents<-600)cents+=1200;   // fold to known target
      recData.pts.push({t:now,c:cents}); }
    recData.voiced.push({t:now,on:inTune});
    if(inTune) renderThread(cents, Math.abs(cents)<=TOL); else renderThreadSilent();
    const run=longestRun(recData.voiced); $('sustainNum').textContent=run.toFixed(1);
    $('sustainBar').style.width=Math.min(100,(run/TARGET_SEC)*100)+'%';
    if(inTune) recData._lastVoiced=now;
    const ended = recData._lastVoiced!=null && (now-recData._lastVoiced)>0.7 && run>=0.5;
    if(ended) stopAttempt(); else if(recData._lastVoiced==null && now>6) stopAttempt(); else if(now>40) stopAttempt();
  };
}
function longestRun(v){ let best=0,cs=null,lo=null; for(const s of v){ if(s.on){if(cs==null)cs=s.t;lo=s.t;} else{if(cs!=null&&s.t-lo>0.15){best=Math.max(best,lo-cs);cs=null;}} } if(cs!=null)best=Math.max(best,(lo??cs)-cs); return best; }
function longestRunWindow(v){ let best=0,bs=0,be=0,cs=null,lo=null; for(const s of v){ if(s.on){if(cs==null)cs=s.t;lo=s.t;} else{if(cs!=null&&s.t-lo>0.15){ if(lo-cs>best){best=lo-cs;bs=cs;be=lo;} cs=null; }} } if(cs!=null&&(lo-cs)>best){best=lo-cs;bs=cs;be=lo;} return {dur:best,start:bs,end:be}; }
function stopAttempt(){ if(!recording)return; recording=false; onFrame=null; stopMetro(); hidePauseControl();
  $('btnRecLabel').textContent='ابدأ'; $('btnRec').classList.remove('recording');
  setupCanvas();
  if(curDay.kind==='breath'){ drawBreathIdle(); scoreBreath(recData); }
  else if(curDay.kind==='dynamic'){ drawDynamicIdle(); scoreDynamic(recData); }
  else if(curDay.kind==='transition'){ drawTransitionIdle(); scoreTransition(recData); }
  else if(curDay.kind==='exchange'){ drawTransitionIdle(); scoreExchange(recData); }
  else if(curDay.kind==='rhythm'){ drawRhythmIdle(); scoreRhythm(recData); }
  else if(curDay.kind==='rhythmdrop'){ drawRhythmIdle(); scoreRhythmDrop(recData); }
  else if(curDay.kind==='sustainRhythm'){ drawRhythmIdle(); scoreSustainRhythm(recData); }
  else if(curDay.kind==='tongue'){ drawRhythmIdle(); scoreTongue(recData); }
  else if(curDay.kind==='jins'){ drawRhythmIdle(); scoreJins(recData); }
  else { drawThreadIdle(); score(recData); }
  const streakFrac = NEED>0 ? Math.min(1, attempts/NEED) : 0;
  $('sustainBar').style.width=(streakFrac*100)+'%';
  $('sustainNum').textContent=String(attempts);
  $('targetSec').textContent=String(NEED);
  $('sustainUnit').style.display='none';
  $('sustainLabel').textContent='سلسلة الإتقان (محاولات متتالية)';
  persistInProgress();
  scheduleAutoNext();
}
let _autoNextTimer=null, _autoNextWaited=0, _autoNextSettled=false;
function scheduleAutoNext(){
  clearTimeout(_autoNextTimer); _autoNextWaited=0; _autoNextSettled=false;
  _autoNextTimer=setTimeout(_autoNextTick, 2400); // pause long enough to read the feedback message before the next count-in begins
}
function _autoNextTick(){
  const activeView=document.querySelector('.view.active');
  if(!activeView || activeView.id!=='view-session') return; // day finished, or user navigated away — nothing to continue
  if(counting || recording) return; // already moving on (manual press or rung-advance race) — don't double-trigger
  if(!curDay) return;
  // Let the Dervish finish. The longest phrase runs ~10.5s of speech, and a
  // recorded clip can be slower than TTS, so the cap sits well clear of it —
  // it exists only so a broken audio element can never stall the session.
  if(_dervishSpeaking && _autoNextWaited<25000){
    _autoNextWaited+=400; _autoNextTimer=setTimeout(_autoNextTick, 400); return;
  }
  // speech just ended (or was never playing) — give a real settle beat before
  // the count-in starts, so a long message never throws off the next entry.
  if(!_autoNextSettled){
    _autoNextSettled=true; _autoNextTimer=setTimeout(_autoNextTick, 700); return;
  }
  _autoNextSettled=false;
  runCountdown(()=> curDay.kind==='breath'? startBreath() : curDay.kind==='dynamic'? startDynamic() : curDay.kind==='transition'? startTransition() : curDay.kind==='exchange'? startExchange() : curDay.kind==='rhythm'? startRhythm() : curDay.kind==='rhythmdrop'? startRhythmDrop() : curDay.kind==='sustainRhythm'? startSustainRhythm() : curDay.kind==='tongue'? startTongue() : curDay.kind==='jins'? startJins() : startAttempt());
}
function persistInProgress(){
  if(!curDay || !sessionLog) return;
  prog.inProgress = prog.inProgress || {};
  prog.inProgress[curDay.id] = { day:curDay.id, kind:curDay.kind, title:curDay.title,
    attempts:sessionLog.attempts, updated:new Date().toISOString() };
  saveProg();
}

$('btnDervish').addEventListener('click', ()=>{
  if(!curDay) return;
  const key = curDay.kind==='longtone'?'introLongtone' : curDay.kind==='breath'?'introBreath' : curDay.kind==='transition'?'introTransition' : 'introExchange';
  const audioKeyMap={introLongtone:'intro_longtone', introBreath:'intro_breath', introTransition:'intro_transition', introExchange:'intro_exchange'};
  showDervish(DERVISH[key][0], {audioKey:audioKeyMap[key]});
});
function median(a){a=a.slice().sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0;}
function std(a){if(a.length<2)return 0;const m=a.reduce((s,x)=>s+x,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length);}
function score(d){
  const run=longestRun(d.voiced); const all=d.pts.map(p=>p.c); const medC=median(all);
  const cs=all.filter(c=>Math.abs(c-medC)<80); const stab=std(cs);
  let ok=false,head='',body='',cls='retry',lowConf=false;
  // confidence gate — applies only to PITCH judgments; duration (run) comes from
  // voiced/RMS detection, which stays reliable even when pitch-tracking struggles.
  const voicedFrames=d.voiced.filter(v=>v.on).length;
  const pitchCoverage=voicedFrames>4 ? all.length/voicedFrames : 1;
  if(run<TARGET_SEC-0.3){
    const pattern=checkFailPattern({k:curDay.id,r:'short'});
    if(pattern){ head='نمط متكرّر: النفَس يقصر دائمًا'; _failPattern=[];
      body='نفَسك ينتهي مبكرًا في كل محاولاتك الأخيرة — هذا غالبًا لأنك تدفع الهواء بقوة في البداية فينفد سريعًا. خذ نفَسًا أعمق من البطن، وابدأ النفخة بلطف أكبر لتُوزّع الهواء على كامل المدة.'; }
    else { head='نفَسك أقصر قليلًا'; body=`ثبتّ ${run.toFixed(1)} ثانية والهدف ${TARGET_SEC}. خذ نفسًا أعمق من البطن، وابدأ النفخ بهدوء.`; }
  }
  else if(voicedFrames>4 && pitchCoverage<0.4){
    lowConf=true; cls='retry';
    head='لم أستطع الحكم بثقة كافية';
    body=`نفَسك استمرّ ${run.toFixed(1)} ثانية، لكن جودة الإشارة كانت منخفضة جدًّا لقياس الطبقة بدقّة — على الأرجح ضوضاء في الغرفة أو بُعد عن الميكروفون. هذه المحاولة لا تُحتسب ضدّك ولا تكسر سلسلتك؛ أعِد في بيئة أهدأ أو اقترب قليلًا من الميكروفون.`;
  }
  else if(Math.abs(medC)>TOL){
    const dir=medC>0?'أعلى':'أخفض';
    const pattern=checkFailPattern({k:curDay.id,r:'pitch',dir});
    if(pattern){ head=`نمط متكرّر: طبقتك دائمًا ${dir}`; _failPattern=[];
      body=`نغمتك ${dir} من ${curDay.note} بتكرار — هذا ليس صدفة. ${medC>0?'خفّف ضغط نفخك تدريجيًّا حتى تسمعها تنخفض للمكان الصحيح':'زد ضغط نفخك قليلًا وتحقّق من زاوية القصبة على شفتك'}.`; }
    else { head=`الطبقة مالت عن ${curDay.note}`; body=`نغمتك ${Math.abs(medC).toFixed(0)} سنت ${dir}. استمع للمثال ثم طابقه — ${medC>0?'خفّف ضغط النفخ':'زد ضغط النفخ'} قليلًا.`; }
  }
  else if(stab>STAB_MAX){
    const pattern=checkFailPattern({k:curDay.id,r:'unstable'});
    if(pattern){ head='نمط متكرّر: نغمتك تبدأ ثابتة ثم تهتزّ'; _failPattern=[];
      body='التذبذب يتكرّر رغم أن طبقتك صحيحة في البداية — هذا غالبًا توتّر في كتفيك أو رقبتك يتسرّب لنفَسك مع الوقت. أرخِ جسدك تمامًا قبل النفخة التالية، وتحقّق أنك لا تشدّ فكّك.'; }
    else { head='بدأت ثابتة ثم تمايلت'; body=`تشتّت طبقتك ${stab.toFixed(0)} سنت. ثبّت ضغط النفَس ولا ترخِ الشفاه قرب النهاية.`; }
  }
  else { ok=true; cls='ok'; attempts++; _failPattern=[]; head=`محاولة ناجحة (${toAr(attempts)}/${toAr(NEED)})`; body=`ثبات ${stab.toFixed(0)} سنت على ${run.toFixed(1)} ثانية، والطبقة مضبوطة (${medC>=0?'+':''}${medC.toFixed(0)}). ${attempts<NEED?'أعد بنفس الجودة — نحتاج '+toAr(NEED)+' متتالية.':''}`; }
  if(!ok && !lowConf){ if(attempts>0){ body+=` — انقطعت سلسلة النجاح (كنت عند ${toAr(attempts)})، نبدأ العدّ من جديد.`; } attempts=0; }
  if(!lowConf) registerAttemptResult(ok);
  if(!lowConf && run>=TARGET_SEC-0.3) trackDrift([medC]);
  sessionLog.attempts.push({n:sessionLog.attempts.length+1,success:ok,low_confidence:lowConf,cents_off:+medC.toFixed(1),stability_cents:+stab.toFixed(1),sustained_sec:+run.toFixed(2),ts:new Date().toISOString()});
  $('resultZone').innerHTML=`<div class="stats">
      <div class="stat ${Math.abs(medC)<=TOL?'g':'w'}"><div class="v">${medC>=0?'+':''}${medC.toFixed(0)}</div><div class="k">سنت عن ${curDay.note}</div></div>
      <div class="stat ${stab<=STAB_MAX?'g':'w'}"><div class="v">${stab.toFixed(0)}</div><div class="k">تشتّت الطبقة</div></div>
      <div class="stat ${run>=TARGET_SEC-0.3?'g':'b'}"><div class="v">${run.toFixed(1)}</div><div class="k">ثانية ثابتة</div></div>
    </div><div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  renderPips();
  if(attempts>=NEED){
    if(ltRung>=0 && ltRung<curDay.durLadder.length-1){
      setTimeout(()=>{
        ltRung++; attempts=0;
        TARGET_SEC=curDay.durLadder[ltRung]; STAB_MAX=Math.round(curDay.stabMax*curDay.stabMult[ltRung]); NEED=curDay.rungNeed[ltRung];
        $('sessEyebrow').textContent=`${dayLabel(curDay.id)} · نغمة طويلة · الدرجة ${toAr(ltRung+1)}/${toAr(curDay.durLadder.length)}`;
        $('targetSec').textContent=TARGET_SEC.toFixed(1);
        $('resultZone').innerHTML=`<div class="msg ok"><div class="head">رفعنا المستوى!</div>الدرجة التالية: ${TARGET_SEC.toFixed(0)} ثوانٍ. تبدأ سلسلة الإتقان من جديد عند هذه الدرجة.</div>`;
        renderPips();
      },900);
    } else {
      setTimeout(()=>finishDay({bestStab:+stab.toFixed(1), bestCents:+medC.toFixed(1), bestSustainSec:+run.toFixed(2), target_hz:sessionLog.target_hz}),900);
    }
  }
}
function finishDay(stats){
  // record progress + streak — fields depend on exercise kind, never mislabeled
  prog.done[curDay.id]=Object.assign({ts:new Date().toISOString(), kind:curDay.kind,
    attempts:sessionLog.attempts}, stats);
  if(prog.inProgress) delete prog.inProgress[curDay.id]; // now fully recorded in prog.done, no need for the partial copy
  const today=new Date().toISOString().slice(0,10);
  if(prog.lastDate!==today){ const y=new Date(Date.now()-864e5).toISOString().slice(0,10);
    prog.streakDays=(prog.lastDate===y)?(prog.streakDays+1):1; prog.lastDate=today; }
  saveProg();
  stopAll();
  $('doneSub').textContent = curDay.id===27
    ? `اكتملت المرحلة الأولى — تأسيس الصوت — بـ${toAr(27)} نجمة مُتقنة.`
    : `نجمة ${dayLabel(curDay.id)} أُضيئت في سماء رحلتك.`;
  setTimeout(()=>dervishCelebrate(curDay.id===27), 400);
  $('doneStats').innerHTML = curDay.kind==='transition' ?
    `<div class="stat g"><div class="v">${stats.bestGapMs}</div><div class="k">أنظف انتقال (م.ث)</div></div>
     <div class="stat g"><div class="v">${stats.bestToOffset>=0?'+':''}${stats.bestToOffset.toFixed(0)}</div><div class="k">دقة الوصول (سنت)</div></div>
     <div class="stat g"><div class="v">${toAr(Object.keys(prog.done).length)}</div><div class="k">أيام مُتقنة</div></div>` :
    curDay.kind==='exchange' ?
    `<div class="stat g"><div class="v">${stats.bestGapMs}</div><div class="k">أنظف فجوة (م.ث)</div></div>
     <div class="stat g"><div class="v">${stats.bestHoldsOk}</div><div class="k">وقفات مضبوطة</div></div>
     <div class="stat g"><div class="v">${toAr(Object.keys(prog.done).length)}</div><div class="k">أيام مُتقنة</div></div>` :
    curDay.kind==='rhythm' ?
    `<div class="stat g"><div class="v">${stats.bestHits}</div><div class="k">نبضات مضبوطة</div></div>
     <div class="stat g"><div class="v">${stats.bestTolMs}</div><div class="k">أدق هامش (م.ث)</div></div>
     <div class="stat g"><div class="v">${toAr(Object.keys(prog.done).length)}</div><div class="k">أيام مُتقنة</div></div>` :
    curDay.kind==='rhythmdrop' ?
    `<div class="stat g"><div class="v">${stats.bestHits}</div><div class="k">نبضات مضبوطة</div></div>
     <div class="stat g"><div class="v">${stats.bestDropped}</div><div class="k">نبضات صامتة اجتزتها</div></div>
     <div class="stat g"><div class="v">${toAr(Object.keys(prog.done).length)}</div><div class="k">أيام مُتقنة</div></div>` :
    curDay.kind==='eartrain' ?
    `<div class="stat g"><div class="v">${toAr(stats.earCorrect)}</div><div class="k">إجابات صحيحة متتالية</div></div>
     <div class="stat g"><div class="v">✦</div><div class="k">تمييز سمعي</div></div>
     <div class="stat g"><div class="v">${toAr(Object.keys(prog.done).length)}</div><div class="k">أيام مُتقنة</div></div>` :
    `<div class="stat g"><div class="v">${stats.bestStab.toFixed(0)}</div><div class="k">أفضل ثبات (سنت)</div></div>
     <div class="stat g"><div class="v">${stats.bestSustainSec.toFixed(1)}</div><div class="k">ثانية ثابتة</div></div>
     <div class="stat g"><div class="v">${toAr(Object.keys(prog.done).length)}</div><div class="k">أيام مُتقنة</div></div>`;
  show('done');
}

