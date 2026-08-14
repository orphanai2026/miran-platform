/* ================= RHYTHM-DROP (Phase 2 day 16 — internal pulse, no audible cue on dropped beats) ================= */
function startRhythmDrop(){
  recording=true; $('btnRecLabel').textContent='إنهاء'; $('btnRec').classList.add('recording'); $('resultZone').innerHTML='';
  const beatSec=curDay.beatSec, nBeats=curDay.beats;
  const beatTimes=Array.from({length:nBeats+1},(_,i)=>i*beatSec);
  recData={t0:performance.now(), hits:new Array(nBeats+1).fill(undefined), wasVoiced:false, lastBeatPlayed:-1};
  setupCanvas();
  const END=nBeats*beatSec+0.7;
  onFrame=(p)=>{
    const now=(performance.now()-recData.t0)/1000;
    const beatIdx=Math.min(Math.floor(now/beatSec+0.5), nBeats);
    if(beatIdx!==recData.lastBeatPlayed && now>=beatIdx*beatSec-0.02){
      recData.lastBeatPlayed=beatIdx;
      if(!rdDrop.has(beatIdx)) playTick(beatIdx%4===0?1300:1100); // dropped beats stay silent — no sound, no flash
    }
    const voiced=!!(p.hz && p.clarity>=CLARITY);
    if(voiced && !recData.wasVoiced){
      const now2=now;
      let bi=-1,bd=Infinity;
      beatTimes.forEach((bt,i)=>{ if(recData.hits[i]===undefined){ const dd=Math.abs(now2-bt); if(dd<bd){bd=dd;bi=i;} } });
      if(bi>=0 && bd<=beatSec/2){ const offMs=(now2-beatTimes[bi])*1000; const corrected=offMs-(latencyCal?latencyCal.ms:0); recData.hits[bi]=Math.abs(corrected)<=curDay.tolMs; }
    }
    recData.wasVoiced=voiced;
    const curIdx=Math.min(Math.floor(now/beatSec), nBeats);
    renderDropBeats(beatTimes, recData.hits, curIdx, rdDrop);
    $('sustainNum').textContent=Math.min(now,END).toFixed(1);
    $('sustainBar').style.width=Math.min(100,(now/END)*100)+'%';
    if(now>=END) stopAttempt();
  };
}
function scoreRhythmDrop(d){
  const total=curDay.beats+1;
  const hits=d.hits.filter(h=>h===true).length;
  const missed=d.hits.filter(h=>h===undefined).length;
  const droppedHits=[...rdDrop].filter(i=>d.hits[i]===true).length;
  const ok = hits>=total-1;
  sessionLog.attempts.push({n:sessionLog.attempts.length+1, success:ok, hits, missed_beats:missed, dropped_count:rdDrop.size, dropped_hit:droppedHits, tol_ms:curDay.tolMs, latency_correction_ms:latencyCal?latencyCal.ms:0, ts:new Date().toISOString()});
  registerAttemptResult(ok);
  let head,body,cls;
  if(!ok){
    cls='retry'; attempts=0;
    const failReason = droppedHits<rdDrop.size ? 'silent' : 'audible';
    const pattern = checkFailPattern({k:curDay.id, rung:rdRung, r:failReason});
    if(pattern && failReason==='silent'){
      head='نمط متكرّر: تفقد الإيقاع عند الصمت دائمًا'; _failPattern=[];
      body='في كل محاولاتك الأخيرة، تفوتك النبضات الصامتة تحديدًا لا المسموعة — هذا يعني أنك ما زلت تعتمد على سماع النقر لا على إحساسك الداخلي بالزمن. جرّب أن تُنشئ صوتًا في ذهنك يواصل العدّ حتى في الصمت.';
    } else {
      head = droppedHits<rdDrop.size ? 'فقدت الإيقاع عند الصمت' : 'التوقيت يحتاج دقة أكبر';
      body = droppedHits<rdDrop.size
        ? `أصبت ${toAr(droppedHits)} من ${toAr(rdDrop.size)} نبضات صامتة فقط. لا تنتظر الصوت — دَعِ النبضات المسموعة السابقة ترشدك.`
        : `أصبت ${toAr(hits)} من ${toAr(total)} نبضات. استمر بنفس السرعة الداخلية حتى مع غياب النقر.`;
    }
  } else {
    cls='ok'; attempts++; _failPattern=[]; head=`إيقاع داخلي ثابت (${toAr(attempts)}/${toAr(NEED)})`;
    body=`أصبت ${toAr(hits)} من ${toAr(total)} نبضة، منها ${toAr(droppedHits)} من ${toAr(rdDrop.size)} نبضة صامتة. ${attempts<NEED?'أعِد — نحتاج '+toAr(NEED)+' متتالية.':''}`;
  }
  $('resultZone').innerHTML=`<div class="stats">
      <div class="stat g"><div class="v">${hits}/${total}</div><div class="k">نبضات مضبوطة</div></div>
      <div class="stat ${droppedHits===rdDrop.size?'g':'w'}"><div class="v">${droppedHits}/${rdDrop.size}</div><div class="k">نبضات صامتة مضبوطة</div></div>
      <div class="stat g"><div class="v">${curDay.tolMs}</div><div class="k">هامش التوقيت (م.ث)</div></div>
    </div><div class="msg ${cls}"><div class="head">${head}</div>${body}</div>`;
  renderPips();
  if(attempts>=NEED){
    if(rdRung<curDay.dropLadder.length-1){
      setTimeout(()=>{
        rdRung++; attempts=0; rdDrop=new Set(curDay.dropLadder[rdRung]); NEED=curDay.rungNeed[rdRung];
        $('sessEyebrow').textContent=`${dayLabel(curDay.id)} · إيقاع · حذف · الدرجة ${toAr(rdRung+1)}/${toAr(curDay.dropLadder.length)}`;
        $('resultZone').innerHTML=`<div class="msg ok"><div class="head">رفعنا المستوى!</div>عدد النبضات الصامتة صار ${toAr(rdDrop.size)}.</div>`;
        renderPips();
      },900);
    } else {
      setTimeout(()=>finishDay({bestHits:hits, bestDropped:rdDrop.size}),900);
    }
  }
}

