/* ================= EXPORT PROGRESS ================= */
document.querySelectorAll('.transfer-tab').forEach(t=>t.addEventListener('click', ()=>{
  document.querySelectorAll('.transfer-tab').forEach(x=>x.classList.remove('sel'));
  t.classList.add('sel');
  document.querySelectorAll('[data-tpane]').forEach(p=>{
    p.style.display = p.dataset.tpane===t.dataset.ttab ? 'block' : 'none';
  });
}));
$('btnBackupExport').addEventListener('click', ()=>{
  const backup={ app:'miran', version:APP_VERSION, exported:new Date().toISOString(), backup:true,
    prog, calib, latencyCal };
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`miran-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
});

/* ── sync code: same backup payload as the file, but as a short pasteable
   text string instead of a download — no server, no account, still fully
   client-side. Uses the browser's native CompressionStream (gzip) when
   available to keep the code short; falls back to plain base64 (longer,
   but still works) on older browsers so nothing ever hard-fails. ── */
function u8ToB64(bytes){
  let bin=''; const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) bin+=String.fromCharCode.apply(null, bytes.subarray(i,i+chunk));
  return btoa(bin);
}
function b64ToU8(b64){
  const bin=atob(b64); const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return bytes;
}
async function buildSyncCode(){
  const backup={ app:'miran', version:APP_VERSION, exported:new Date().toISOString(), backup:true,
    prog, calib, latencyCal };
  const json=JSON.stringify(backup);
  if(window.CompressionStream){
    try{
      const cs=new CompressionStream('gzip');
      const writer=cs.writable.getWriter();
      writer.write(new TextEncoder().encode(json)); writer.close();
      const buf=await new Response(cs.readable).arrayBuffer();
      return 'MRZ1:'+u8ToB64(new Uint8Array(buf));
    }catch(e){ /* fall through to plain */ }
  }
  return 'MR01:'+u8ToB64(new TextEncoder().encode(json));
}
async function parseSyncCode(code){
  const c=(code||'').trim();
  const isZ = c.startsWith('MRZ1:'), isPlain = c.startsWith('MR01:');
  if(!isZ && !isPlain) throw new Error('صيغة الرمز غير صحيحة — تأكّد أنك نسخته كاملًا.');
  const bytes = b64ToU8(c.slice(5));
  let json;
  if(isZ){
    if(!window.DecompressionStream) throw new Error('هذا المتصفّح لا يدعم فكّ ضغط الرمز — استخدم النسخة الاحتياطية بالملفّ بدلًا منه.');
    const ds=new DecompressionStream('gzip');
    const writer=ds.writable.getWriter();
    writer.write(bytes); writer.close();
    const buf=await new Response(ds.readable).arrayBuffer();
    json=new TextDecoder().decode(buf);
  } else {
    json=new TextDecoder().decode(bytes);
  }
  const data=JSON.parse(json);
  if(!data || data.app!=='miran' || !data.prog) throw new Error('هذا الرمز لا يحتوي بيانات تقدّم صحيحة من مِران.');
  return data;
}
$('btnSyncGen').addEventListener('click', async ()=>{
  $('syncImportBox').style.display='none';
  $('syncGenBox').style.display='block';
  $('syncCodeOut').value='...جارٍ الإنشاء';
  $('syncCopyHint').textContent='';
  try{
    const code=await buildSyncCode();
    $('syncCodeOut').value=code;
  }catch(e){ $('syncCodeOut').value=''; $('syncCopyHint').textContent='تعذّر إنشاء الرمز — جرّب النسخة الاحتياطية بالملفّ.'; }
});
$('btnSyncCopy').addEventListener('click', async ()=>{
  const text=$('syncCodeOut').value; if(!text) return;
  try{
    await navigator.clipboard.writeText(text);
    $('syncCopyHint').textContent='✓ انتسخ الرمز — الصقه بجهازك الثاني.';
  }catch(e){
    $('syncCodeOut').select();
    try{ document.execCommand('copy'); $('syncCopyHint').textContent='✓ انتسخ الرمز — الصقه بجهازك الثاني.'; }
    catch(e2){ $('syncCopyHint').textContent='تعذّر النسخ تلقائيًا — النص محدَّد أعلاه، انسخه يدويًا (Ctrl/Cmd+C).'; }
  }
});
$('btnSyncShowImport').addEventListener('click', ()=>{
  $('syncGenBox').style.display='none';
  $('syncImportBox').style.display='block';
  $('syncCodeIn').focus();
});
$('btnSyncImport').addEventListener('click', async ()=>{
  const raw=$('syncCodeIn').value;
  if(!raw.trim()){ alert('الصق رمز المزامنة أولًا.'); return; }
  let data;
  try{ data=await parseSyncCode(raw); }
  catch(e){ alert(e.message||'تعذّر قراءة الرمز.'); return; }
  const daysCount=Object.keys(data.prog.done||{}).length;
  const sure=confirm(`استعادة هذا الرمز سيستبدل تقدّمك الحالي بالكامل.\n\nالرمز يحمل: ${daysCount} يومًا مُتقَنًا، مُصدَّرًا بتاريخ ${(data.exported||'').slice(0,10)}.\n\nهل أنت متأكد؟`);
  if(!sure) return;
  prog=data.prog; saveProg();
  if(data.calib){ calib=data.calib; saveCalib(); }
  if(data.latencyCal){ latencyCal=data.latencyCal; saveLatencyCal(); }
  $('syncCodeIn').value=''; $('syncImportBox').style.display='none';
  selectedLevel=null; renderHome(); show('home');
  alert('تمّ استيراد تقدّمك بنجاح.');
});
$('btnSkipDebug').addEventListener('click', ()=>{
  if(!curDay) return;
  const sure=confirm('تجاوز مؤقّت للاختبار فقط — سيُسجَّل هذا اليوم كمُتقَن بلا محاولة حقيقية. متابعة؟');
  if(!sure) return;
  stopAll();
  prog.done[curDay.id]=Object.assign({ts:new Date().toISOString(), kind:curDay.kind, debugSkipped:true},{});
  if(prog.inProgress) delete prog.inProgress[curDay.id];
  saveProg();
  renderHome(); show('home');
});
$('btnAdminJump').addEventListener('click', ()=>{
  const id=+$('adminJumpInput').value;
  if(!id || !CURRICULUM.find(d=>d.id===id)){ alert('رقم يوم غير صحيح.'); return; }
  targetDayId=id;
  const day=CURRICULUM.find(d=>d.id===id);
  if(day.kind==='eartrain'){ openEarTrain(day); return; }
  if(!calib){ show('calib'); return; }
  if(day.kind==='rhythm'||day.kind==='rhythmdrop'||day.kind==='tongue'){
    if(!latencyCal){ show('latcal'); return; }
  }
  startSession(id); // deliberately skips isUnlocked() — admin/testing only
});
$('btnBackupImport').addEventListener('click', ()=> $('backupFileInput').click());
$('backupFileInput').addEventListener('change', (e)=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=(ev)=>{
    let data;
    try{ data=JSON.parse(ev.target.result); }
    catch(err){ alert('تعذّرت قراءة الملف — تأكّد أنه ملفّ نسخة احتياطية صحيح من مِران.'); return; }
    if(!data || data.app!=='miran' || !data.prog){
      alert('هذا ليس ملفّ نسخة احتياطية من مِران — لا يحتوي البيانات المطلوبة.'); return;
    }
    const daysCount=Object.keys(data.prog.done||{}).length;
    const sure=confirm(`استيراد هذه النسخة سيستبدل تقدّمك الحالي بالكامل.\n\nالنسخة المستورَدة: ${daysCount} يومًا مُتقَنًا، مُصدَّرة بتاريخ ${(data.exported||'').slice(0,10)}.\n\nهل أنت متأكد؟`);
    if(!sure){ e.target.value=''; return; }
    prog=data.prog; saveProg();
    if(data.calib){ calib=data.calib; saveCalib(); }
    if(data.latencyCal){ latencyCal=data.latencyCal; saveLatencyCal(); }
    e.target.value='';
    selectedLevel=null; renderHome(); show('home');
    alert('تمّ استيراد تقدّمك بنجاح.');
  };
  reader.readAsText(file);
});
$('btnExport').addEventListener('click', ()=>{
  const report={ app:'miran', version:APP_VERSION, exported:new Date().toISOString(),
    ney_calibration: calib ? {qarar_hz:+calib.qararHz.toFixed(2), implied_concert_A4:+neyConcertPitch(calib.qararHz).impliedA4.toFixed(2), cents_from_440:+calib.cents.toFixed(1)} : null,
    latency_calibration: latencyCal ? {personal_latency_ms: latencyCal.ms, ts: latencyCal.ts} : null,
    foundation: { breath_stage: prog.foundation.breath ? 'complete' : 'in-progress',
                  breath_rung_reached: prog.foundation.rung||0, breath_rungs: BREATH.rungs },
    days_mastered: Object.keys(prog.done).length,
    streak_days: prog.streakDays,
    progress: prog.done,
    in_progress: prog.inProgress || {} };
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`miran-journey-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
});

$('btnReset').addEventListener('click', ()=>{
  const sure = confirm('سيُصفَّر كل تقدّمك (كل النجوم المُتقنة، ومرحلة النفَس) وتعود لبداية الرحلة تمامًا.\nمعايرة نايك ستبقى كما هي (لن تحتاج إعادة معايرتها).\n\nهل أنت متأكد؟');
  if(!sure) return;
  const typed = prompt('اكتب "تصفير" للتأكيد النهائي:');
  if(typed!=='تصفير'){ return; }
  prog = {done:{}, streakDays:0, lastDate:null, foundation:{breath:false, rung:0}};
  saveProg();
  stopAll();
  renderHome(); show('home');
});

