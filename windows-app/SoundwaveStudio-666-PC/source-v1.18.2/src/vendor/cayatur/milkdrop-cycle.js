'use strict';
(function(){
  if(typeof window==='undefined')return;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const normalize=md=>{
    md=md&&typeof md==='object'?md:{};
    const enabled=md.autoNext===true;
    const unit=md.autoNextUnit==='bars'?'bars':'seconds';
    return {
      enabled,
      unit,
      seconds:enabled&&unit==='seconds'?clamp(md.autoNextSeconds??md.seconds??30,3,3600):0,
      bars:enabled&&unit==='bars'?Math.round(clamp(md.autoNextBars??md.bars??8,1,128)):0,
      blendTime:clamp(md.blendTime??1.5,0,12),
      hardCut:['off','bass','treb','smart'].includes(md.hardCut)?md.hardCut:'off',
      hardCutBass:clamp(md.hardCutBass??1.5,1.05,12),
      hardCutTreb:clamp(md.hardCutTreb??2.9,1.05,20),
      hardCutMinDelay:clamp(md.hardCutMinDelay??0.6,0.15,15),
      locked:md.locked===true,
      neverRepeat:md.neverRepeat!==false,
      repeatWindow:Math.round(clamp(md.repeatWindow??8,1,100)),
      onTrack:md.onTrack===true,
    };
  };
  const idOf=p=>p&&String(p.id||'');
  class Cycle{
    constructor(){this.elapsed=0;this.barCount=0;this.lastCut=-1e9;this.history=[];this.queued=null;this.cut=false;this.blend=0;this.reason='';this._now=0;}
    reset(){this.elapsed=0;this.barCount=0;this.queued=null;this.cut=false;this.blend=0;this.reason='RESET';}
    _remember(id,o){
      if(!id)return;
      this.history=this.history.filter(x=>x!==id);
      this.history.unshift(id);
      const n=Math.max(1,o.repeatWindow||8);
      if(this.history.length>n)this.history.length=n;
    }
    _pool(list,cur,o){
      const all=(Array.isArray(list)?list:[]).filter(p=>p&&idOf(p)&&idOf(p)!==cur);
      if(!o.neverRepeat)return all;
      const h=new Set(this.history);
      let p=all.filter(x=>!h.has(idOf(x)));
      if(!p.length)p=all.filter(x=>idOf(x)!==this.history[0]);
      return p.length?p:all;
    }
    _choose(list,cur,o){
      const p=this._pool(list,cur,o);
      if(!p.length)return null;
      if(this.queued&&p.some(x=>idOf(x)===idOf(this.queued))){const q=this.queued;this.queued=null;return q;}
      return p[Math.floor(Math.random()*p.length)]||null;
    }
    _trigger(p,o,reason,cut){
      if(!p)return null;
      const id=idOf(p);
      this._remember(id,o);
      this.elapsed=0;this.barCount=0;this.cut=!!cut;this.blend=this.cut?0:o.blendTime;this.reason=reason;
      if(this.cut)this.lastCut=this._now;
      return p;
    }
    step(dt,md,list,cur,rel,ratings,beat){
      const o=normalize(md);
      const step=Math.max(0,Number(dt)||0);
      this._now+=step;this.elapsed+=step;this.cut=false;this.blend=o.blendTime;
      if(beat&&beat.onBar)this.barCount++;
      if(o.locked){this.reason='LOCKED';return null;}
      const enough=this._now-this.lastCut>=o.hardCutMinDelay;
      const bass=Number(rel?.bass)||0,treb=Number(rel?.treb??rel?.treble)||0;
      let hard=false;
      if(enough&&o.hardCut==='bass')hard=bass>=o.hardCutBass;
      else if(enough&&o.hardCut==='treb')hard=treb>=o.hardCutTreb;
      else if(enough&&o.hardCut==='smart')hard=bass>=o.hardCutBass||treb>=o.hardCutTreb;
      if(hard)return this._trigger(this._choose(list,cur,o),o,'HARDCUT',true);
      if(!o.enabled){this.reason='OFF';return null;}
      if(o.unit==='bars'){
        if(!beat){this.reason='NOTEMPO';return null;}
        if(this.barCount>=o.bars)return this._trigger(this._choose(list,cur,o),o,'BARS',false);
        this.reason='BARS';return null;
      }
      if(this.elapsed>=o.seconds)return this._trigger(this._choose(list,cur,o),o,'SECONDS',false);
      this.reason='SECONDS';return null;
    }
    onTrack(md,list,cur){
      const o=normalize(md);
      if(o.locked||!o.onTrack){this.reason=o.locked?'LOCKED':'TRACK_OFF';return null;}
      return this._trigger(this._choose(list,cur,o),o,'TRACK',false);
    }
    upcoming(md,list,cur){
      const o=normalize(md);
      if(o.locked)return null;
      if(this.queued&&idOf(this.queued)!==cur)return this.queued;
      this.queued=this._choose(list,cur,o);
      return this.queued;
    }
    remaining(md){
      const o=normalize(md);
      if(!o.enabled)return Infinity;
      if(o.unit==='bars')return Math.max(0,o.bars-this.barCount);
      return Math.max(0,o.seconds-this.elapsed);
    }
    progress(md){
      const o=normalize(md);
      if(!o.enabled)return 0;
      if(o.unit==='bars')return o.bars?clamp(this.barCount/o.bars,0,1):0;
      return o.seconds?clamp(this.elapsed/o.seconds,0,1):0;
    }
  }

  class Tempo{
    constructor(){this.beatsPerBar=4;this.locked=0;this.bpm=0;this._mean=0;this._lastBeat=-1e9;this._ints=[];this._beatCount=0;this._onBar=false;}
    setLock(v){this.locked=Math.max(0,Math.round(Number(v)||0));if(this.locked)this.bpm=this.locked;}
    update(audio,t,dt){
      const e=Math.max(0,Number(audio?.bass)||0);
      const k=Math.exp(-Math.max(0.001,Number(dt)||0.016)/0.45);
      this._mean=this._mean*k+e*(1-k);
      const threshold=Math.max(0.08,this._mean*1.35);
      this._onBar=false;
      const gap=t-this._lastBeat;
      if(e>threshold&&gap>0.24){
        if(this._lastBeat>-1e8&&gap<2.0){
          this._ints.push(gap);if(this._ints.length>8)this._ints.shift();
          const s=[...this._ints].sort((a,b)=>a-b);
          const med=s[Math.floor(s.length/2)];
          if(!this.locked&&med>0)this.bpm=Math.round(60/med);
        }
        this._lastBeat=t;this._beatCount++;
        this._onBar=((this._beatCount-1)%Math.max(1,this.beatsPerBar))===0;
      }
      if(this.locked)this.bpm=this.locked;
    }
    onBar(){return this._onBar;}
  }
  window.SVMilkdropCycle=Object.freeze({normalize,Cycle});
  if(!window.SVTempo)window.SVTempo=Object.freeze({Tempo});
})();