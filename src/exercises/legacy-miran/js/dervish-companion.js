/* ================= الدرويش · voice-and-text companion ================= */
/* Phrases carry full tashkeel (diacritics) — undiacritized Arabic makes
   browser TTS guess vowels and mispronounce; explicit tashkeel fixes most of it. */
const DERVISH = {
  introDiaphragm: ['قَبْلَ أَنْ نَبْدَأ، تَحَقَّقْ مِنْ شَهِيقِكَ: ضَعْ يَدَكَ عَلَى بَطْنِكَ، وَخُذْ نَفَسًا. إِنِ اتَّسَعَتْ يَدُكَ وَبَطْنُكَ لَا كَتِفَاكَ، فَنَفَسُكَ صَحِيحٌ. هَذَا أَسَاسُ كُلِّ نَفَسٍ سَنَبْنِيهِ مَعًا.'],
  introLongtone: ['اسْتَعِدَّ… ثَبِّتْ نَفَسَكَ عَلَى النَّغْمَةِ بِهُدُوءٍ، وَابْدَأْ حِينَ تَرْتَاحُ.'],
  introBreath: ['قَبْلَ النَّغْمَةِ، النَّفَسُ. خُذْ شَهِيقًا عَمِيقًا مِنَ الْبَطْنِ، وَأَطْلِقْ صَوْتًا وَاحِدًا ثَابِتًا مَا اسْتَطَعْتَ — لَا تَهُمُّكَ الطَّبَقَةُ الْآنَ، بَلِ الِاسْتِمْرَارُ.'],
  introTransition: ['اثْبُتْ عَلَى النَّغْمَةِ الْأُولَى، وَحِينَ تَسْمَعُ الْإِشَارَةَ انْتَقِلْ بِنُعُومَةٍ إِلَى الثَّانِيَةِ.'],
  introExchange: ['تَابِعِ النَّبْضَةَ بِأُذُنِكَ، وَانْتَقِلْ مَعَهَا بِلَا تَرَدُّدٍ — لَا تَسْبِقْهَا وَلَا تَتَأَخَّرْ عَنْهَا.'],
  fail2: ['خُذْ نَفَسًا عَمِيقًا مِنَ الْبَطْنِ، وَأَرْخِ كَتِفَيْكَ قَبْلَ أَنْ تُعِيدَ الْمُحَاوَلَةَ.',
          'اسْتَمِعْ لِلْمِثَالِ مَرَّةً أُخْرَى قَبْلَ أَنْ تَعْزِفَ — طَابِقْ أُذُنَكَ قَبْلَ نَفَسِكَ.'],
  fail3: ['رَاقِبْ زَاوِيَةَ الْقَصَبَةِ عَلَى شَفَتِكَ السُّفْلَى — أَمِلْهَا قَلِيلًا حَتَّى يَصْفُوَ الصَّوْتُ.',
          'أَرْخِ قَبْضَتَكَ عَلَى النَّايِ — الشَّدُّ الزَّائِدُ يُتْعِبُ نَفَسَكَ بِسُرْعَةٍ.'],
  fail4: ['لَا بَأْسَ عَلَيْكَ — خُذْ اسْتِرَاحَةً قَصِيرَةً، ثُمَّ عُدْ بِنَفَسٍ جَدِيدٍ. الْقَصَبَةُ تَنْتَظِرُكَ.'],
  failBreath2: ['خُذِ الْهَوَاءَ مِنَ الْبَطْنِ لَا مِنَ الصَّدْرِ — ضَعْ يَدَكَ عَلَيْهَا وَاشْعُرْ بِهَا تَنْتَفِخُ أَوَّلًا.',
                'أَطْلِقِ الْهَوَاءَ بِبُطْءٍ وَثَبَاتٍ — لَا تَدْفَعْهُ دَفْعَةً وَاحِدَةً فِي الْبِدَايَةِ.'],
  failBreath3: ['الصَّوْتُ يَحْتَاجُ ثَبَاتًا لَا طُولًا فَقَطْ — تَخَيَّلْ خَيْطًا مُسْتَقِيمًا مِنَ الْهَوَاءِ لَا يَتَمَوَّجُ.',
                'اسْتَرْخِ فِي كَتِفَيْكَ وَحَلْقِكَ — التَّوَتُّرُ هُوَ مَنْ يَجْعَلُ الصَّوْتَ يَهْتَزُّ.'],
  failBreath4: ['لَا بَأْسَ عَلَيْكَ — خُذْ اسْتِرَاحَةً قَصِيرَةً، ثُمَّ عُدْ بِنَفَسٍ جَدِيدٍ. النَّفَسُ يُبْنَى بِالتَّكْرَارِ لَا بِالْعَجَلَةِ.'],
  celebrate: ['نَجْمَةٌ جَدِيدَةٌ أَضَاءَتْ فِي سَمَاءِ رِحْلَتِكَ — الْقَصَبَةُ بَدَأَتْ تَعْرِفُكَ أَكْثَرَ.',
              'إِتْقَانٌ حَقِيقِيٌّ، لَا حَظٌّ عَابِرٌ. أَحْسَنْتَ.'],
  phaseDone: ['اكْتَمَلَتِ الْمَرْحَلَةُ الْأُولَى — تَأْسِيسُ الصَّوْتِ صَارَ مِلْكَكَ الْآنَ. الْإِيقَاعُ يَنْتَظِرُكَ فِي الْمَرْحَلَةِ الْقَادِمَةِ.']
};
let failStreak=0, _seenIntro=new Set(), _dervishTimer=null, _arVoice=null;
if('speechSynthesis' in window){
  const pickVoice=()=>{ const all=speechSynthesis.getVoices(); const vs=all.filter(v=>v.lang&&v.lang.toLowerCase().startsWith('ar'));
    if(!vs.length){ _arVoice=null; return; }
    // Cloud/network voices (localService:false, e.g. Google's server TTS) sound far more
    // natural than the device's built-in local engine (often robotic espeak-style on Android).
    // Priority: exact ar-SA + cloud → any Arabic + cloud → exact ar-SA local → named quality engine → anything Arabic.
    _arVoice = vs.find(v=>v.lang.toLowerCase()==='ar-sa' && v.localService===false)
      || vs.find(v=>v.localService===false)
      || vs.find(v=>v.lang.toLowerCase()==='ar-sa')
      || vs.find(v=>/google|microsoft|natural/i.test(v.name))
      || vs[0];
  };
  pickVoice(); speechSynthesis.onvoiceschanged=pickVoice;
  window._miranListArabicVoices=()=>speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.toLowerCase().startsWith('ar')).map(v=>({name:v.name,lang:v.lang,cloud:!v.localService}));
}
let _introBlocking=false, _introSafety=null;
let _introTimeout=null;
function setIntroBlocking(on){
  _introBlocking=on;
  $('btnRec').disabled=on; $('btnRec').style.opacity=on?.45:1;
  $('btnSkipIntro').style.display=on?'':'none';
  clearTimeout(_introSafety);
  // unblocking must also cancel any pending delayed intro call — otherwise a
  // skip pressed in the brief window before the bubble appears gets silently
  // overridden when that delayed call fires and blocks the button again.
  if(!on) clearTimeout(_introTimeout);
  // safety net only — must sit ABOVE the longest guidance clip (~10.5s speech,
  // longer if it is a recorded voice) so it never cuts real guidance short.
  if(on) _introSafety=setTimeout(()=>setIntroBlocking(false), 30000);
}
$('btnSkipIntro').addEventListener('click', ()=>{ stopDervishVoice(); setIntroBlocking(false); });
let _dervishSpeaking=false;
function dervishSpeak(text, onEnd){
  const done=()=>{ _dervishSpeaking=false; if(onEnd) onEnd(); };
  if(!('speechSynthesis' in window)){ done(); return; }
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang='ar-SA'; u.rate=0.85; u.pitch=1.0; u.volume=1.0; if(_arVoice) u.voice=_arVoice;
    u.onend=done; u.onerror=done;
    _dervishSpeaking=true;
    speechSynthesis.speak(u);
  }catch(e){ done(); }
}
let _dervishAudio=null;
function dervishPlayAudio(key, onFail, onEnd){
  const failWrap=()=>{ _dervishSpeaking=false; onFail(); };
  const endWrap=()=>{ _dervishSpeaking=false; if(onEnd) onEnd(); };
  if(!key) return failWrap();
  const a = new Audio(`dervish-audio/${key}.mp3`);
  _dervishAudio = a;
  a.addEventListener('error', failWrap, {once:true});
  a.addEventListener('ended', endWrap, {once:true});
  _dervishSpeaking=true;
  a.play().catch(failWrap);
}
function showDervish(text, opts){
  opts=opts||{}; const el=$(opts.target||'dervishBubble'); if(!el) return;
  el.textContent=text; el.classList.add('show');
  if(_dervishAudio){ try{_dervishAudio.pause();}catch(e){} }
  if(opts.blocking) setIntroBlocking(true);
  const finish=()=>{ if(opts.blocking) setIntroBlocking(false); if(opts.onEnd) opts.onEnd(); };
  if(opts.speak!==false){
    if(opts.audioKey) dervishPlayAudio(opts.audioKey, ()=>dervishSpeak(text, finish), finish);
    else dervishSpeak(text, finish);
  } else finish();
  clearTimeout(_dervishTimer);
  if(!opts.sticky) _dervishTimer=setTimeout(()=>el.classList.remove('show'), 6000);
}
function pick(arr){ return Math.floor(Math.random()*arr.length); } // returns an INDEX now, so we can derive the matching audio key
function dervishIntroFor(day){
  if(day.testMode) return; // "لا يقدّم شرحًا أثناء المحاولة الأولى" — assessment days get no head-start hint
  const key = day.kind==='breath'?'introBreath' : day.kind==='longtone'?'introLongtone' : day.kind==='transition'?'introTransition' : 'introExchange';
  if(_seenIntro.has(day.id)) return; _seenIntro.add(day.id);
  const audioKeyMap={introLongtone:'intro_longtone', introBreath:'intro_breath', introTransition:'intro_transition', introExchange:'intro_exchange'};
  setIntroBlocking(true); // block starting the instant we know guidance is coming, not just once the bubble appears
  _introTimeout=setTimeout(()=>showDervish(DERVISH[key][0], {audioKey:audioKeyMap[key], blocking:true}), 500);
}
function registerAttemptResult(ok){
  if(ok){ failStreak=0; return; }
  failStreak++;
  const isBreath = curDay && curDay.kind==='breath';
  const b2 = isBreath?DERVISH.failBreath2:DERVISH.fail2, k2 = isBreath?'failbreath2':'fail2';
  const b3 = isBreath?DERVISH.failBreath3:DERVISH.fail3, k3 = isBreath?'failbreath3':'fail3';
  const b4 = isBreath?DERVISH.failBreath4:DERVISH.fail4, k4 = isBreath?'failbreath4':'fail4';
  if(failStreak===2){ const i=pick(b2); showDervish(b2[i], {audioKey:b2.length>1?`${k2}_${i+1}`:k2}); }
  else if(failStreak===3){ const i=pick(b3); showDervish(b3[i], {audioKey:b3.length>1?`${k3}_${i+1}`:k3}); }
  else if(failStreak>=4){ const i=pick(b4); showDervish(b4[i], {audioKey:k4, sticky:true}); failStreak=0; }
}
function dervishCelebrate(phaseDone){
  const bank = phaseDone?DERVISH.phaseDone:DERVISH.celebrate;
  const i=pick(bank); const key = phaseDone?'phase_done':(bank.length>1?`celebrate_${i+1}`:'celebrate');
  showDervish(bank[i], {target:'doneDervishBubble', audioKey:key, sticky:true});
}

