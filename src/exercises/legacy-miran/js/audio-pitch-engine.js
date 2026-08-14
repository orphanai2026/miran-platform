/* ================= AUDIO + PITCH (validated engine) ================= */
let audioCtx, analyser, micStream, buf, rafId, onFrame=null, _lastDetect=0;
const FMIN=140, FMAX=1600, CLARITY=0.86;
function detectPitch(x, sr){
  const n=x.length; let mean=0; for(let i=0;i<n;i++) mean+=x[i]; mean/=n;
  for(let i=0;i<n;i++) x[i]-=mean;
  let rms=0; for(let i=0;i<n;i++) rms+=x[i]*x[i]; rms=Math.sqrt(rms/n);
  if(rms<0.006) return {hz:null,clarity:0,rms};
  const tauMin=Math.floor(sr/FMAX), tauMax=Math.min(Math.floor(sr/FMIN),n-1);
  const d=new Float32Array(tauMax+1);
  for(let t=tauMin;t<=tauMax;t++){ let ac=0,m=0; for(let j=0;j<n-t;j++){ac+=x[j]*x[j+t];m+=x[j]*x[j]+x[j+t]*x[j+t];} d[t]=m>0?2*ac/m:0; }
  const peaks=[]; let t=tauMin; while(t<=tauMax&&d[t]>0)t++;
  while(t<=tauMax){ if(d[t]<=0){t++;continue;} let best=t; while(t<=tauMax&&d[t]>0){if(d[t]>d[best])best=t;t++;} peaks.push(best); }
  if(!peaks.length) return {hz:null,clarity:0,rms};
  let mx=0; for(const p of peaks) if(d[p]>mx)mx=d[p];
  const th=0.8*mx; let ch=peaks[0]; for(const p of peaks){if(d[p]>=th){ch=p;break;}}
  let sh=0; if(ch>0&&ch<tauMax){const a=d[ch-1],b=d[ch],c=d[ch+1],dd=a-2*b+c; if(dd!==0)sh=0.5*(a-c)/dd;}
  return {hz:sr/(ch+sh), clarity:mx, rms};
}
const centsBetween=(f,ref)=>1200*Math.log2(f/ref);
/* Output and capture are separate concerns: playing an example or a metronome
   click needs only an AudioContext, NOT microphone permission. Keeping them
   apart means the listen/metronome controls work before the mic is granted. */
function ensureOutput(){
  if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
  return audioCtx;
}
async function initAudio(){          // full duplex — adds mic capture on top of output
  ensureOutput();
  if(analyser) return;               // capture already wired (retry-safe if a past attempt failed)
  micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  const src=audioCtx.createMediaStreamSource(micStream);
  analyser=audioCtx.createAnalyser(); analyser.fftSize=2048; src.connect(analyser);
  buf=new Float32Array(analyser.fftSize);
}
function loop(ts){
  if(analyser && (ts-_lastDetect)>=32){ _lastDetect=ts; analyser.getFloatTimeDomainData(buf);
    const p=detectPitch(buf.slice(),audioCtx.sampleRate); if(onFrame)onFrame(p); }
  rafId=requestAnimationFrame(loop);
}
function stopAll(){ onFrame=null; stopMetro(); if(droneOsc){try{droneOsc.stop();}catch(e){} droneOsc=null;}
  recording=false; clearTimeout(_autoNextTimer);
  if(_countdownIv){ clearInterval(_countdownIv); _countdownIv=null; }
  counting=false; $('btnRecLabel').textContent='ابدأ'; $('btnRec').classList.remove('recording');
  if(typeof stopListen==='function') stopListen();
  if(typeof setIntroBlocking==='function') setIntroBlocking(false);
  if(typeof hidePauseControl==='function'){ _paused=false; hidePauseControl(); } }

