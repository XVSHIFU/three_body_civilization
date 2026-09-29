export type SoundCue='step'|'instrument'|'bell'|'facility'|'ending';
/** Original procedural audio; no recordings or third-party sound assets. */
export class WorldAudio {
 private master:GainNode;
 private feedback:GainNode;
 private bass:GainNode;
 private wind:AudioBufferSourceNode;
 private normal:GainNode;
 private abnormal:GainNode;
 constructor(readonly context:AudioContext){
  this.master=context.createGain();this.master.gain.value=0;this.master.connect(context.destination);
  this.feedback=context.createGain();this.feedback.gain.value=0;this.feedback.connect(context.destination);
  this.bass=context.createGain();this.bass.gain.value=.5;this.bass.connect(this.feedback);
  const noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate),samples=noise.getChannelData(0);
  let seed=771;for(let i=0;i<samples.length;i++){seed=(seed*1664525+1013904223)>>>0;samples[i]=(seed/4294967296*2-1)*.35;}
  this.wind=context.createBufferSource();this.wind.buffer=noise;this.wind.loop=true;
  const soft=context.createBiquadFilter(),harsh=context.createBiquadFilter();soft.type='lowpass';soft.frequency.value=300;harsh.type='bandpass';harsh.frequency.value=850;harsh.Q.value=.7;
  this.normal=context.createGain();this.abnormal=context.createGain();this.normal.gain.value=.08;this.abnormal.gain.value=0;
  this.wind.connect(soft).connect(this.normal).connect(this.master);this.wind.connect(harsh).connect(this.abnormal).connect(this.master);this.wind.start();
 }
 update(volume:number,heat:number,paused:boolean,bassVolume:number){
  const now=this.context.currentTime,blend=Math.max(0,Math.min(1,(heat-1)/4));
  this.master.gain.setTargetAtTime(paused?0:volume,now,.08);
  this.feedback.gain.setTargetAtTime(volume,now,.02);this.bass.gain.setTargetAtTime(bassVolume,now,.02);
  this.normal.gain.setTargetAtTime(.08*(1-blend),now,1.2);this.abnormal.gain.setTargetAtTime(.11*blend,now,1.2);
 }
 cue(kind:SoundCue){
  if(this.context.state!=='running')return;
  const specifications:Record<SoundCue,[number,number,number]>={step:[85,.055,.07],instrument:[660,.12,.04],bell:[320,1.2,.075],facility:[145,.3,.05],ending:[55,1.8,.045]};
  const [frequency,duration,level]=specifications[kind],osc=this.context.createOscillator(),gain=this.context.createGain(),now=this.context.currentTime;
  osc.type=kind==='facility'?'triangle':'sine';osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(frequency*.75,now+duration);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(level,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  osc.connect(gain).connect(kind==='ending'?this.bass:kind==='instrument'?this.feedback:this.master);osc.start();osc.stop(now+duration);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 dispose(){this.wind.stop();this.wind.disconnect();this.master.disconnect();this.feedback.disconnect();this.bass.disconnect();this.normal.disconnect();this.abnormal.disconnect();}
}
