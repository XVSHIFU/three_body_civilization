import type {RuntimeView} from '../game/runtime';
import type {Observation} from '../gameplay/evidence';
import type {Settings} from '../storage/archive';
import {time} from './observation-format';

const phaseNames:Record<string,string>={preparing:'准备中，可取消',entering:'进入保存位',sealing:'封闭设施',dehydrating:'完成保存准备',preserved:'保存完成，等待灾变结果',failed:'设施保护失效'};
const keyLabel=(key:string)=>key.replace('Key','').replace('Arrow','方向 ');
export interface ExplorationHudProps {
 civilization:number;
 observations:Observation[];
 ended:boolean;
 compressed:boolean;
 view:Pick<RuntimeView,'location'|'feeling'|'target'|'preservation'|'warning'|'anomalyCaption'>;
 settings:Pick<Settings,'keys'|'captions'>;
 onJournal:()=>void;
 onPause:()=>void;
 onCancelPreserve:()=>void;
}

export function ExplorationHud({civilization,observations,ended,compressed,view,settings,onJournal,onPause,onCancelPreserve}:ExplorationHudProps){
 const current=observations.filter(o=>o.civilization===civilization);
 const lastReading=[...current].reverse().find(o=>o.source==='thermometer'&&Number.isFinite(o.temperature));
 return <section className="hud" aria-label="探索界面">
  <header className="hud-location"><span>文明 {String(civilization).padStart(3,'0')}</span><h2>{view.location}</h2><p>{compressed?'三分钟演示 · 纪元尚未确认':'纪元尚未确认'}</p></header>
  <aside className="objective"><span>当前目标</span><p>{ended?'查看结算，整理本轮记录并接续下一文明。':current.length===0?'沿主路读取城门石牌，再前往广场观象柱。':view.warning?'核对证据，判断是否进入西北侧保存设施。':'比较观象柱与温度仪的读数；提前确认保存路线。'}</p></aside>
  <div className="crosshair" aria-hidden="true"/>
  <div className="body-status"><p>{ended?'本轮观测已结束':view.feeling}</p><span>{lastReading?`${lastReading.temperature!.toFixed(1)} °C · 采样 ${time(lastReading.tick)}`:'温度尚未测量'}</span></div>
  {!ended&&<div className="hud-center">
  {settings.captions&&(view.warning||view.anomalyCaption)&&<p className="warning-caption" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20ZM12 9v5m0 3v1"/></svg><span>{view.warning?'钟声从保存设施方向传来。居民正在撤离。':'一声钟响。广场上的观察者抬头望向天空。'}</span></p>}
  <div className="interact-prompt">
   {view.target&&<><kbd>{keyLabel(settings.keys.interact)}</kbd><span>{view.target}</span></>}
   {view.preservation!=='idle'&&<p>{phaseNames[view.preservation]}</p>}
   {view.preservation==='preparing'&&<button onClick={onCancelPreserve}>取消保存准备</button>}
  </div></div>}
  <nav className="hud-menu"><button onClick={onJournal}><kbd>{keyLabel(settings.keys.journal)}</kbd>日志</button><button onClick={onPause}><kbd>Esc</kbd>暂停</button></nav>
 </section>;
}
