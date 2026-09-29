import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/noto-serif-sc/chinese-simplified-400.css';
import '../src/ui/styles.css';
import {Dialog} from '../src/ui/Dialog';
import {InstrumentReading,InstrumentActions} from '../src/ui/InstrumentReading';
import {FacilityReading} from '../src/ui/FacilityReading';
import {PreservationConfirm} from '../src/ui/PreservationConfirm';
import {addObservation,type Observation} from '../src/gameplay/evidence';
import {validateArchive} from '../src/storage/archive';
import fixture from '../reports/fixtures/calibration-review.json';

const examples=validateArchive(fixture).observations;
const location={name:'广场观测区',instrumentId:'pillar',instrumentName:'观象柱',position:[-10,3.25,-8] as [number,number,number]};
const sky:Observation={...examples[1],location};
const emptySky:Observation={...sky,id:'c1-pillar-0',civilization:1,sunIds:[],directions:{}};
const temperature:Observation={...sky,id:'c2-thermometer-0',source:'thermometer',sunIds:[],directions:{},temperature:31.7,location:{...location,instrumentId:'thermometer',instrumentName:'温度仪'}};
function Preview(){
 const [choice,setChoice]=useState('calibrated'),[theme,setTheme]=useState('b'),[scale,setScale]=useState(1.5),[opened,setOpened]=useState(false),[observations,setObservations]=useState<Observation[]>([]),[notice,setNotice]=useState(''),[confirmations,setConfirmations]=useState(0);
 const facility=choice.startsWith('facility'),sample=choice==='empty'?emptySky:choice==='temperature'?temperature:sky;
 const close=()=>setOpened(false);
 function open(){setObservations(choice==='empty'?[]:[examples[0]]);setNotice('');setOpened(true);}
 return <main className={`app theme-${theme}`} style={{'--font-scale':scale,overflow:'auto',padding:32} as React.CSSProperties} data-reduced="true">
  <h1 style={{fontSize:32,whiteSpace:'normal',margin:0}}>交互面板组件检查</h1>
  <p style={{maxWidth:'65ch',margin:'16px 0'}}>这里使用游戏的正式面板与固定操作区；读数为标注的检查样本。不启动三维世界，不申请鼠标锁定，不读写游戏档案。</p>
  <div className="settings-grid" style={{maxWidth:740}}>
   <label>检查状态<select value={choice} onChange={e=>setChoice(e.target.value)}><option value="empty">观象柱 · 空读数／首次记录</option><option value="calibrated">观象柱 · 继承校准／前代读数</option><option value="temperature">温度仪 · 无上次温度</option><option value="facility">保存设施 · 可以确认</option><option value="facility-disabled">保存设施 · 已开始／不可再次确认</option></select></label>
   <label>主题<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="a">A · 遗址测绘</option><option value="b">B · 天文台取景框</option><option value="c">C · 复古科幻</option></select></label>
   <label>界面字号<select value={scale} onChange={e=>setScale(Number(e.target.value))}><option value="1">100%</option><option value="1.5">150%</option></select></label>
  </div>
  <div className="button-row"><button className="primary" onClick={open}>打开检查面板</button></div>
  <p role="status">检查页确认次数：{confirmations}；已记录样本：{observations.length}。{!opened&&notice}</p>
  {opened&&<Dialog title={facility?'停止观测，进入保存':sample.source==='pillar'?'观象柱':'温度仪'} onClose={close} footer={facility?<PreservationConfirm code="KeyE" disabled={choice==='facility-disabled'} onCancel={close} onConfirm={()=>{setConfirmations(n=>n+1);setNotice('仅检查确认回调，未执行游戏保存流程。');close();}}/>:<InstrumentActions recorded={observations.some(o=>o.id===sample.id)} onClose={close} onRecord={()=>{setObservations(old=>addObservation(old,sample));setNotice('已记录检查样本；重复点击不会增加数量。');}}/>}>
   {notice&&<p className="quiet" role="status">{notice}</p>}
   {facility?<FacilityReading/>:<InstrumentReading civilization={sample.civilization} observations={observations} sample={sample}/>}
  </Dialog>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
