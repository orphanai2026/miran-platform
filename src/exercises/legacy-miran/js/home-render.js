/* ================= HOME RENDER ================= */
function renderHome(){
  const doneCount=Object.keys(prog.done).length;
  $('streakN').textContent=doneCount;
  $('phaseBand').textContent = prog.done[28] ? 'المرحلة الثانية · الإيقاع والتوقيت' : 'المرحلة الأولى · تأسيس الصوت';
  const fi=firstIncomplete();
  const activeLevel = !prog.foundation.breath ? 1 : levelOfDay(fi);
  if(selectedLevel===null) selectedLevel=activeLevel;

  // ── level rail: browsing convenience only, never a gate ──
  let railHtml='';
  LEVELS.forEach(L=>{
    const {done,total}=levelProgress(L.id);
    const pct = total? Math.round(done/total*100) : 0;
    const isSel = selectedLevel===L.id;
    const isCurrent = activeLevel===L.id; // where real progress is, vs. just being browsed
    const maqamPreview = L.locked && L.key==='maqam';
    railHtml+=`<div class="lvl-chip ${isSel?'sel':''} ${L.locked?'locked':''}" style="--lc:${L.color}"
      ${L.locked?(maqamPreview?'data-maqam-preview="1"':''):`data-lvl="${L.id}"`}>
      <div class="lvl-head">
        <div class="lvl-icon-badge ${isCurrent && !L.locked ? 'current' : ''}">${LVL_ICONS[L.key]||''}</div>
        <div class="lvl-num">${String(L.id).padStart(2,'0')}</div>
      </div>
      <div class="lvl-name">${L.name}</div>
      ${L.locked
        ? `<div class="lvl-lock">${LVL_LOCK_ICON}<span>${maqamPreview?'لمحة ✦':'قريبًا'}</span></div>`
        : `<div class="lvl-bar"><div class="lvl-fill ${pct>=100?'full':''}" style="width:${pct}%">${isCurrent&&pct>0&&pct<100?'<span class="lvl-fill-head"></span>':''}</div></div>
           <div class="lvl-frac">${done} / ${total}</div>`}
    </div>`;
  });
  $('lvlChipsRow').innerHTML=railHtml;
  $('lvlChipsRow').querySelectorAll('[data-lvl]').forEach(c=>c.addEventListener('click',()=>{
    selectedLevel=+c.dataset.lvl; renderHome();
    document.querySelector('.lvl-chip.sel')?.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
  }));
  $('lvlChipsRow').querySelectorAll('[data-maqam-preview]').forEach(c=>c.addEventListener('click',()=>{
    renderMaqamPreview(); show('maqamprev');
  }));

  // sliding light: a glowing bar that travels from the previously-selected
  // chip's position to the new one instead of the highlight just snapping —
  // the "felt" transition. #lvlIndicator persists across re-renders (it
  // lives outside #lvlChipsRow, which is the only part we overwrite) so its
  // left/width CSS transition actually has something to animate from.
  requestAnimationFrame(()=>{
    const selChip = document.querySelector('#lvlChipsRow .lvl-chip.sel');
    const ind = $('lvlIndicator');
    if(selChip){
      ind.style.left = selChip.offsetLeft+'px';
      ind.style.width = selChip.offsetWidth+'px';
      ind.style.opacity = '1';
      ind.style.setProperty('--ic', selChip.style.getPropertyValue('--lc') || '230,184,92');
    } else {
      ind.style.opacity='0';
    }
  });

  // scroll-position dots: a quiet pagination affordance under the rail,
  // one per level, gold pill marks whichever chip is currently selected —
  // clicking a dot jumps + scrolls just like tapping the chip itself.
  let dotsHtml='';
  LEVELS.forEach(L=>{ dotsHtml+=`<div class="lvl-dot ${selectedLevel===L.id?'sel':''}" data-dot="${L.id}"></div>`; });
  $('lvlDots').innerHTML=dotsHtml;
  $('lvlDots').querySelectorAll('[data-dot]').forEach(d=>d.addEventListener('click',()=>{
    const L=LEVELS.find(l=>l.id===+d.dataset.dot);
    if(L.locked && L.key!=='maqam') return;
    if(L.locked && L.key==='maqam'){ renderMaqamPreview(); show('maqamprev'); return; }
    selectedLevel=+d.dataset.dot; renderHome();
    document.querySelector('.lvl-chip.sel')?.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
  }));

  // pitch-accuracy spaced review: only surfaces when genuinely due, and only
  // while browsing this specific level — never nags on other levels.
  const PITCH_REVIEW_DAYS=6;
  const overdue = selectedLevel===2 ? mostOverdueEarlyDay() : null;
  if(overdue && overdue.days>=PITCH_REVIEW_DAYS){
    const noteName = CURRICULUM.find(d=>d.id===overdue.id).note;
    $('pitchReviewPrompt').innerHTML = `<a id="rePitch" style="display:block;text-align:center;margin:10px 0 2px;
      color:var(--gold-hi,#F7DCA0);cursor:pointer;font-size:.82rem;font-weight:700;
      background:rgba(230,184,92,.09);border:1px solid rgba(230,184,92,.3);border-radius:100px;padding:9px 14px">
      مرّت ${toAr(overdue.days)} أيام دون مراجعة نغمة ${noteName} — راجعها الآن</a>`;
    $('rePitch').addEventListener('click',()=>openDay(overdue.id));
  } else { $('pitchReviewPrompt').innerHTML=''; }

  // ── some levels get a sub-rail (same lvl-chip pattern used everywhere)
  // to split a long day-list into a few meaningful tracks instead of one
  // crowded rosette. Config-driven so any level can opt in. ──
  const SUBCAT_CONFIG = {
    2: [{key:'core', name:'الأوكتاف الأساسي', color:'230,184,92'},
        {key:'extra', name:'نغمات إضافية', color:'79,227,193'},
        {key:'unconfirmed', name:'تحتاج تأكيدك', color:'220,110,76'}],
    3: [{key:'speed', name:'السرعة', color:'220,110,76'},
        {key:'shapes', name:'الأشكال الإيقاعية', color:'155,110,220'}],
  };
  const subcats = SUBCAT_CONFIG[selectedLevel];
  if(subcats){
    if(selectedSubcatByLevel[selectedLevel]==null) selectedSubcatByLevel[selectedLevel]=subcats[0].key;
    let subHtml='<div class="lvl-heading">اختر مسارًا</div><div class="lvl-rail-wrap"><div class="lvl-rail">';
    subcats.forEach(sc=>{
      const scDays=levelDays(selectedLevel).filter(d=>d.subcat===sc.key);
      const done=scDays.filter(d=>prog.done[d.id]).length;
      const pct=scDays.length?Math.round(done/scDays.length*100):0;
      const isSel=selectedSubcatByLevel[selectedLevel]===sc.key;
      subHtml+=`<div class="lvl-chip ${isSel?'sel':''}" style="--lc:${sc.color}" data-subcat="${sc.key}">
        <div class="lvl-name">${sc.name}</div>
        <div class="lvl-bar"><div class="lvl-fill" style="width:${pct}%"></div></div>
        <div class="lvl-frac">${done} / ${scDays.length}</div>
      </div>`;
    });
    subHtml+='</div></div>';
    $('rhythmSubRail').innerHTML=subHtml;
    $('rhythmSubRail').querySelectorAll('[data-subcat]').forEach(c=>c.addEventListener('click',()=>{
      selectedSubcatByLevel[selectedLevel]=c.dataset.subcat; renderHome();
    }));
  } else { $('rhythmSubRail').innerHTML=''; }

  // ── the rosette: each petal is a day WITHIN the selected level only ──
  const days = selectedLevel===1 ? [] : (subcats ? levelDays(selectedLevel).filter(d=>d.subcat===selectedSubcatByLevel[selectedLevel]) : levelDays(selectedLevel));
  const N=days.length, W=300,H=300, cx=150, cy=150;
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="وردة هذا المستوى — كل وريقة يوم">`;
  svg+=`<defs><filter id="pglow"><feGaussianBlur stdDeviation="2.6" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="hubG"><stop offset="0" stop-color="#F7DCA0" stop-opacity=".9"/>
    <stop offset=".6" stop-color="#E6B85C" stop-opacity=".22"/>
    <stop offset="1" stop-color="#E6B85C" stop-opacity="0"/></radialGradient></defs>`;
  svg+=`<g opacity=".3"><circle cx="${cx}" cy="${cy}" r="130" fill="none" stroke="#4A3B7A" stroke-width=".7" stroke-dasharray="1.5 8"/>`;
  svg+=`<circle cx="${cx}" cy="${cy}" r="58" fill="none" stroke="#4A3B7A" stroke-width=".6"/></g>`;
  if(N===0 && selectedLevel!==1){
    svg+=`<text x="${cx}" y="${cy}" text-anchor="middle" font-family="Cairo,sans-serif" font-size="12" fill="#9B92B8">لا أيام هنا بعد</text>`;
  }
  if(N===0 && selectedLevel===1){
    // breath has no "days" to loop through, but it deserves the same magic as
    // the day rosette — a small necklace of its 5 real rungs (2, 4, 6, 8, 12s)
    // arcing above the hub, in the exact same gold/cyan/dark grammar.
    const rungs=BREATH.rungs, rn=rungs.length, rung=prog.foundation.rung||0, breathDone=prog.foundation.breath;
    const bestSec=prog.foundation.bestSec||[];
    const arcR=88, startA=-150, endA=-30; // a gentle arc across the top, like a crown
    svg+=`<text x="${cx}" y="${cy-arcR-26}" text-anchor="middle" font-family="'Aref Ruqaa',serif" font-size="15" fill="#F7DCA0">✦ عُقَد النفَس</text>`;
    for(let i=0;i<rn;i++){
      const ang=(startA+(endA-startA)*i/(rn-1))*Math.PI/180;
      const nx=cx+Math.cos(ang)*arcR, ny=cy+Math.sin(ang)*arcR;
      const done=breathDone||i<rung, current=!breathDone&&i===rung;
      if(i>0){ const pa=(startA+(endA-startA)*(i-1)/(rn-1))*Math.PI/180;
        const px=cx+Math.cos(pa)*arcR, py=cy+Math.sin(pa)*arcR;
        // the stem only grows as far as actually mastered — ungrown segments
        // are barely-there dotted hints, not a fully pre-drawn skeleton
        const grown = breathDone || i<=rung;
        svg+=`<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}"
          stroke="${grown?'rgba(230,184,92,.45)':'rgba(155,146,184,.14)'}" stroke-width="${grown?1.3:.7}"
          ${grown?'':'stroke-dasharray="1 3"'}/>`;
      }
      if(current) svg+=`<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="9" fill="none"
        stroke="#4FE3C1" stroke-width="1.4" opacity=".55" filter="url(#pglow)">
        <animate attributeName="r" values="9;11;9" dur="2.6s" repeatCount="indefinite"/></circle>`;
      svg+=`<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="6.5"
        fill="${done?'rgba(230,184,92,.92)':(current?'rgba(79,227,193,.85)':'#0a0818')}"
        stroke="${done?'rgba(247,220,160,.9)':(current?'#4FE3C1':'rgba(155,146,184,.35)')}" stroke-width="1.3"
        ${done||current?'filter="url(#pglow)"':''}/>`;
      const lbl = done ? (bestSec[i]!=null?bestSec[i].toFixed(1):rungs[i])+'s' : rungs[i]+'s';
      svg+=`<text x="${nx.toFixed(1)}" y="${(ny+18).toFixed(1)}" text-anchor="middle"
        font-family="IBM Plex Mono,monospace" font-size="8"
        fill="${done?'#E6B85C':(current?'#4FE3C1':'#6b5f91')}" opacity="${done||current?'.9':'.45'}">${lbl}</text>`;
    }
    svg+=`<text x="${cx}" y="${cy+arcR+18}" text-anchor="middle" font-family="Cairo,sans-serif" font-size="10.5" fill="#9B92B8">تابع من بطاقة النفَس أدناه</text>`;
  }
  let levelDone=0;
  days.forEach((d,i)=>{
    const id=d.id;
    const done=prog.done[id], current=(id===fi && d.kind!=='soon'), tappable=(done||current);
    if(done) levelDone++;
    const a=360*i/N;
    const col = done?'#E6B85C':(current?'#4FE3C1':'#4A3B7A');
    const op  = done?'.92':(current?'1':'.28');
    const fil = tappable?'filter="url(#pglow)"':'';
    if(current){
      // the active petal's outer glow, PLUS a small bright point of light that
      // travels around its loop continuously — the one deliberately animated
      // element on the whole rosette, so motion reads as "this is where you are"
      svg+=`<ellipse cx="${cx}" cy="${cy}" rx="15" ry="98" transform="rotate(${a} ${cx} ${cy})"
         fill="none" stroke="#4FE3C1" stroke-width="3.4" opacity=".2" filter="url(#pglow)"/>`;
      svg+=`<ellipse cx="${cx}" cy="${cy}" rx="13" ry="96" transform="rotate(${a} ${cx} ${cy})"
         fill="none" stroke="#4FE3C1" stroke-width="1.7" opacity="1" filter="url(#pglow)"
         stroke-dasharray="16 378" stroke-linecap="round">
         <animate attributeName="stroke-dashoffset" from="0" to="-394" dur="3.4s" repeatCount="indefinite"/>
       </ellipse>`;
    } else {
      svg+=`<ellipse cx="${cx}" cy="${cy}" rx="13" ry="96" transform="rotate(${a} ${cx} ${cy})"
         fill="none" stroke="${col}" stroke-width="${done?1.7:0.85}" opacity="${op}" ${fil}/>`;
    }
    const rad=(a-90)*Math.PI/180, tx=cx+Math.cos(rad)*114, ty=cy+Math.sin(rad)*114;
    // the number shown is this day's position WITHIN THIS LEVEL (always 1..N,
    // never jumps) — the raw global id (used internally for openDay/storage)
    // stays invisible here; it only surfaces once you're actually inside the
    // exercise, via dayLabel(), so the trainee never sees a confusing gap.
    svg+=`<text x="${tx.toFixed(1)}" y="${(ty+3.5).toFixed(1)}" text-anchor="middle"
       font-family="IBM Plex Mono,monospace" font-size="9"
       fill="${done?'#E6B85C':(current?'#4FE3C1':'#6b5f91')}" opacity="${tappable?'.95':'.42'}">${i+1}</text>`;
    if(!tappable){
      // a small lock glyph — a locked day should visibly say so, not just look dim
      svg+=`<g transform="translate(${(tx+9).toFixed(1)},${(ty-10).toFixed(1)})" opacity=".55">
        <rect x="-3.2" y="-1" width="6.4" height="5" rx="1" fill="none" stroke="#6b5f91" stroke-width=".8"/>
        <path d="M -1.8 -1 v-1.6 a1.8 1.8 0 0 1 3.6 0 v1.6" fill="none" stroke="#6b5f91" stroke-width=".8"/>
      </g>`;
    }
    if(tappable) svg+=`<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="15" fill="transparent"
       class="st-tap" style="cursor:pointer" data-day="${id}"/>`;
  });
  // hub
  svg+=`<circle cx="${cx}" cy="${cy}" r="34" fill="url(#hubG)">
    <animate attributeName="r" values="34;36.5;34" dur="4.2s" repeatCount="indefinite"/>
  </circle>`;
  if(N>0){
    svg+=`<text x="${cx}" y="${cy-2}" text-anchor="middle" font-family="IBM Plex Mono,monospace"
       font-size="21" fill="#F7DCA0">${levelDone}</text>`;
    svg+=`<text x="${cx}" y="${cy+15}" text-anchor="middle" font-family="Cairo,sans-serif"
       font-size="9.5" fill="#9B92B8">من ${N}</text>`;
  } else if(selectedLevel===1){
    // the necklace above already tells the detailed rung story — the hub
    // just needs a calm identity mark, not a second competing number
    svg+=`<text x="${cx}" y="${cy+6}" text-anchor="middle" font-family="'Aref Ruqaa',serif"
       font-size="20" fill="#F7DCA0">${prog.foundation.breath?'✓':'✦'}</text>`;
  }
  svg+=`</svg>`;
  $('sky').innerHTML=svg;
  $('sky').querySelectorAll('.st-tap').forEach(c=>c.addEventListener('click',()=>openDay(+c.dataset.day)));

  // tonight card = breath gateway first, then dynamic control, then first incomplete day
  if(!prog.foundation.breath){
    const r=prog.foundation.rung||0;
    $('tonightGlyph').textContent='✦';
    $('tonightTitle').textContent=BREATH.title;
    $('tonightBlurb').textContent=BREATH.blurb;
    $('tonightLat').textContent=`الدرجة ${toAr(r+1)} / ${toAr(BREATH.rungs.length)} · قبل النغمات`;
    $('tonightEyebrow').textContent='ابدأ من هنا · النفَس أولًا';
    $('btnStart').textContent = r>0 ? 'تابع النفَس' : 'ابدأ النفَس';
    $('btnStart').disabled=false; $('btnStart').style.opacity=1;
    targetDayId='breath';
  } else if(!prog.foundation.dynamicDone){
    $('tonightGlyph').textContent='◐';
    $('tonightTitle').textContent='التحكّم الديناميكي';
    $('tonightBlurb').textContent='نفَس ثابت أتقنته — الآن تحكّم بشدّته: ابدأ خافتًا وانتهِ بصوت أقوى، بلا فقدان الطبقة.';
    $('tonightLat').textContent='مهارة جديدة · قبل النغمات';
    $('tonightEyebrow').textContent='الخطوة الأخيرة قبل النغمات';
    $('btnStart').textContent='ابدأ التحكّم';
    $('btnStart').disabled=false; $('btnStart').style.opacity=1;
    targetDayId='dynamic';
  } else {
  const d=CURRICULUM[fi-1] || CURRICULUM[CURRICULUM.length-1];
  $('tonightGlyph').textContent=d.note;
  $('tonightTitle').textContent=d.title;
  $('tonightBlurb').textContent=d.blurb;
  $('tonightLat').textContent=(d.lat?d.lat+' · ':'')+dayLabel(d.id);
  $('tonightEyebrow').textContent = doneCount>0 ? 'التالي في رحلتك' : 'أول أيام الرحلة';
  $('btnStart').textContent = d.kind==='soon' ? 'قريبًا' : (doneCount>0?'تابع التدريب':'ابدأ التدريب');
  $('btnStart').disabled = d.kind==='soon';
  $('btnStart').style.opacity = d.kind==='soon' ? .5 : 1;
  targetDayId=d.id;
  }

  // breath-thread: only when calibration is truly not yet relevant to the
  // current step — otherwise the full calibration hero stays primary as usual.
  const pitchAgnosticNow = !prog.foundation.breath ||
    (CURRICULUM[fi-1] && (CURRICULUM[fi-1].kind==='rhythm' || CURRICULUM[fi-1].kind==='rhythmdrop'));
  const useThread = !calib && pitchAgnosticNow;
  $('threadWrap').classList.toggle('linked', useThread);
  $('calibWaitingStation').style.display = useThread ? '' : 'none';
  $('stdBadge').style.display = useThread ? 'none' : '';
  $('btnCalibSeg').style.display = useThread ? 'none' : '';

  // calibration hero: Hz is the real result (primary plate); cents deviation
  // from the fixed A440 standard is a note beside it, not a verdict.
  if(calib){
    const off=calib.cents;
    $('calibEyebrow').textContent='إعادة معايرة نايك';
    $('calibTitle').textContent='اضغط لمعايرة جديدة';
    $('calibReadoutPair').style.display='';
    $('calibNumHz').textContent=calib.qararHz.toFixed(1);
    $('calibNumCents').textContent=(off>=0?'+':'')+off.toFixed(0)+'¢';
    $('calibDirLabel').textContent = Math.abs(off)<1 ? 'مطابق تمامًا' : (off>0?'أعلى من المعيار':'أخفض من المعيار');
  } else {
    $('calibEyebrow').textContent='معايرة نايك';
    $('calibTitle').textContent='لم تُعايَر بعد — اضغط للبدء';
    $('calibReadoutPair').style.display='none';
  }
  $('neyTuning').innerHTML='';
  // spaced-review prompt for breath: quiet link normally, but turns into a
  // real prompt once genuinely due — the trainee shouldn't have to remember.
  const BREATH_REVIEW_DAYS=5;
  if(prog.foundation.breath){
    const existing=document.getElementById('reBreath');
    const el = existing || document.createElement('a');
    el.id='reBreath';
    const lastAt = prog.foundation.lastBreathAt ? new Date(prog.foundation.lastBreathAt) : null;
    const daysSince = lastAt ? Math.floor((Date.now()-lastAt.getTime())/86400000) : 999;
    const due = daysSince>=BREATH_REVIEW_DAYS;
    el.textContent = due ? `مرّت ${toAr(daysSince)} أيام على آخر مراجعة للنفَس — راجعه الآن` : 'مراجعة مرحلة النفَس';
    el.style.cssText = due
      ? 'display:block;text-align:center;margin-top:9px;color:var(--breath);cursor:pointer;font-size:.82rem;font-weight:700;background:rgba(255,179,71,.09);border:1px solid rgba(255,179,71,.3);border-radius:100px;padding:9px 14px'
      : 'display:block;text-align:center;margin-top:8px;color:var(--jade);cursor:pointer;font-size:.8rem';
    if(!existing){ el.addEventListener('click',()=>openBreath(true)); $('neyTuning').parentElement.insertBefore(el, $('neyTuning').nextSibling); }
  }
  // latency calibration status/re-calibrate link
  if(latencyCal){
    let el=document.getElementById('reLatCal');
    if(!el){ el=document.createElement('a'); el.id='reLatCal';
      el.style.cssText='display:block;text-align:center;margin-top:8px;color:var(--gold);cursor:pointer;font-size:.8rem';
      el.addEventListener('click',()=>{ targetDayId=null; show('latcal'); });
      $('neyTuning').parentElement.insertBefore(el, $('neyTuning').nextSibling);
    }
    el.textContent = `تأخيرك الشخصي: ${latencyCal.ms} م.ث · إعادة المعايرة`;
  }
}
const arNum='٠١٢٣٤٥٦٧٨٩';
const toAr=n=>String(n).replace(/\d/g,d=>arNum[d]);

function openDay(id){
  if(id==='breath'){ openBreath(); return; }
  if(id==='dynamic'){ openDynamicControl(); return; }
  if(!isUnlocked(id)) return;
  targetDayId=id;
  const day=CURRICULUM.find(d=>d.id===id);
  if(day && day.kind==='eartrain'){ openEarTrain(day); return; } // no mic needed — skip calibration entirely
  if(!calib){ show('calib'); return; }
  if(day && (day.kind==='rhythm'||day.kind==='rhythmdrop'||day.kind==='tongue') && !latencyCal){ show('latcal'); return; }
  startSession(id);
}
$('btnStart').addEventListener('click',()=>openDay(targetDayId));
$('sessBack').addEventListener('click',()=>{ stopAll(); renderHome(); show('home'); });
$('calibBack').addEventListener('click',()=>{ stopAll(); show('home'); });
$('btnGuide').addEventListener('click',()=> show('guide'));
$('btnCalibSeg').addEventListener('click',()=> show('calib'));
$('guideBack').addEventListener('click',()=> show('home'));
$('latcalBack').addEventListener('click',()=>{ stopAll(); show('home'); });
$('doneNext').addEventListener('click',()=>{ renderHome(); show('home'); });

