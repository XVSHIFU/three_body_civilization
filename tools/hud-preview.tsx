import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../src/ui/styles.css';
import {ExplorationHud} from '../src/ui/ExplorationHud';
import {emptyArchive} from '../src/storage/archive';
import type {Observation} from '../src/gameplay/evidence';

const archive=emptyArchive();
const reading:Observation={id:'hud-temperature',civilization:1,tick:9000,source:'thermometer',temperature:31.7,sunIds:[],directions:{}};
function Preview(){
 const [state,setState]=useState('preparing'),[scale,setScale]=useState(1.5),[theme,setTheme]=useState('b'),[captions,setCaptions]=useState(true),[notice,setNotice]=useState('');
 const preservation=['preparing','entering','sealing','dehydrating','preserved','failed'].includes(state)?state:'idle';
 return <main className={`app theme-${theme}`} style={{'--font-scale':scale} as React.CSSProperties}>
  <ExplorationHud civilization={1} compressed={false} ended={state==='ended'} observations={state==='empty'?[]:[reading]}
   view={{location:'西北侧保存设施',feeling:state==='empty'?'尚可':'灼热，呼吸急促',target:state==='empty'?null:'进入保存设施',preservation,warning:!['empty','anomaly'].includes(state),anomalyCaption:state==='anomaly'}}
   settings={{keys:archive.settings.keys,captions}} onJournal={()=>setNotice('日志回调已触发')} onPause={()=>setNotice('暂停回调已触发')} onCancelPreserve={()=>{setNotice('取消准备回调已触发');setState('warning');}}/>
  <aside style={{position:'absolute',top:'36%',left:32,width:240,padding:16,background:'var(--ground)',border:'1px solid var(--line)',fontSize:14}} aria-label="检查控制">
   <p>正式 HUD 组件 · 样本数据</p><p>无场景运行、无档案写入。</p>
   <label>状态<select value={state} onChange={e=>{setState(e.target.value);setNotice('');}}>{['empty','anomaly','warning','preparing','entering','sealing','dehydrating','preserved','failed','ended'].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
   <label>字号<select value={scale} onChange={e=>setScale(Number(e.target.value))}><option value="1">100%</option><option value="1.5">150%</option></select></label>
   <label>主题<select value={theme} onChange={e=>setTheme(e.target.value)}>{['a','b','c'].map(s=><option key={s}>{s}</option>)}</select></label>
   <label><input type="checkbox" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>字幕</label>
   <p role="status">{notice}</p>
  </aside>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
