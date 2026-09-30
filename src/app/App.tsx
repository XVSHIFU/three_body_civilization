import {bindingCode} from '../ui/key-binding';
import {ExplorationHud} from '../ui/ExplorationHud';
import {time,describe} from '../ui/observation-format';
import {InstrumentReading,InstrumentActions} from '../ui/InstrumentReading';
import {FacilityReading} from '../ui/FacilityReading';
import {withCheckpoint} from '../storage/checkpoint-evidence';
import {CalibrationPanel} from '../ui/CalibrationPanel';
import {inheritedCalibration} from '../gameplay/calibration';
import {selectExperience} from './experience';
import {PreservationConfirm} from '../ui/PreservationConfirm';
import {BackupList} from '../ui/BackupList';
import {BUILD_ID} from '../build-info';
import {checkpointIssues,inheritArchive} from '../storage/compatibility';
import {HypothesisPanel} from '../ui/HypothesisPanel';
import {useEffect,useRef,useState} from 'react';
import {ArchiveStore,DB_NAME,emptyArchive,parseImport,type Archive,type Settings,type Checkpoint} from '../storage/archive';
import {addObservation,deriveKnowledge,type Observation} from '../gameplay/evidence';
import type {GameRuntime,RuntimeView} from '../game/runtime';
import type {Interactable} from '../renderer/world';
import {Dialog} from '../ui/Dialog';
type Overlay='plaque'|'backups'|'compatibility'|'intro'|'journal'|'settings'|'instrument'|'facility'|'npc'|'pause'|'result'|'error'|null;
type Phase='entry'|'loading'|'ready'|'game';
const experience=selectExperience(window.location.search);
const themes={a:{name:'遗址测绘',asset:'survey',line:'观察天空，留下证据。'},b:{name:'天文台取景框',asset:'observatory',line:'天空没有承诺。留下你的判断。'},c:{name:'复古科幻',asset:'pulp',line:'观察，记录，然后作出选择。'}};
const initialView:RuntimeView={paused:true,reasons:['loading'],feeling:'尚可',location:'南侧城门',target:null,preservation:'idle',warning:false,tick:0,position:[0,.9,64],grounded:false,drawCalls:0,triangles:0,frameMs:0};
const keyLabel=(key:string)=>key.replace('Key','').replace('Arrow','方向 ');
const actionLabels:Record<string,string>={forward:'前进',back:'后退',left:'左移',right:'右移',interact:'交互',journal:'日志'};


function Arrow(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>;}
export function App(){
 const [archive,setArchive]=useState<Archive>(emptyArchive),archiveRef=useRef(archive);const [phase,setPhase]=useState<Phase>('entry'),[overlay,setOverlay]=useState<Overlay>(null),[view,setView]=useState(initialView),[loading,setLoading]=useState('读取本地档案'),[notice,setNotice]=useState(''),[error,setError]=useState(''),[storageStatus,setStorageStatus]=useState('正在读取档案'),[saving,setSaving]=useState(false),[storageReady,setStorageReady]=useState(false),[temporary,setTemporary]=useState(false),[readOnly,setReadOnly]=useState(false),[sample,setSample]=useState<Observation|null>(null),[target,setTarget]=useState<Interactable|null>(null),[selected,setSelected]=useState<string|null>(null);
 const [recoveryAvailable,setRecoveryAvailable]=useState(false);
 const [startupFailure,setStartupFailure]=useState(false),[startupDetails,setStartupDetails]=useState('');
 const nextTransition=useRef(false);
 const startupHistory=useRef<{error:string;details:string;before:ReturnType<GameRuntime['resourceSnapshot']>|null;cleanup:ReturnType<GameRuntime['cleanupSnapshot']>|null}[]>([]);
 const rebuildHistory=useRef<{before:ReturnType<GameRuntime['resourceSnapshot']>;released:GameRuntime['releasedResources'];retiredContextLost:boolean;after:ReturnType<GameRuntime['resourceSnapshot']>|null;checkpointExact:boolean}[]>([]);
 const host=useRef<HTMLDivElement>(null),runtime=useRef<GameRuntime|null>(null),store=useRef<ArchiveStore|null>(null),saveQueue=useRef<Promise<unknown>>(Promise.resolve()),mounted=useRef(true),busyStart=useRef(false),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null),generation=useRef(0),phaseRef=useRef(phase),channel=useRef<BroadcastChannel|null>(null);phaseRef.current=phase;
 const displayedStorageStatus=readOnly?'另一标签页正在使用档案；此页只读，可查看和导出。关闭其他游戏标签页后刷新此页。':storageStatus;
 const settings=archive.settings,theme=themes[settings.theme],knowledge=deriveKnowledge(archive.observations),calibration=inheritedCalibration(archive.observations,archive.civilization);
 function update(fn:(a:Archive)=>Archive){const next=fn(archiveRef.current);archiveRef.current=next;setArchive(next);}
 function toast(message:string){setNotice(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setNotice(''),4500);}
 function fail(message:string){setError(message);setOverlay('error');}
 function persist(checkpoint?:Checkpoint):Promise<boolean>{if(checkpoint)update(a=>withCheckpoint(a,checkpoint));if(temporary){setStorageStatus('临时体验 · 请导出档案');return Promise.resolve(false);}if(readOnly||!store.current)return Promise.resolve(false);setSaving(true);const next=saveQueue.current.then(async()=>{try{const saved=await store.current!.save(archiveRef.current);if(!mounted.current)return false;update(a=>({...a,revision:saved.revision,savedAt:saved.savedAt}));setStorageStatus(`已保存 ${new Date(saved.savedAt!).toLocaleTimeString('zh-CN')}`);return true;}catch(e){if(mounted.current){setStorageStatus('保存失败 · 上一份档案仍保留');setError(String(e));}return false;}finally{if(mounted.current)setSaving(false);}});saveQueue.current=next;return next;}
 useEffect(()=>{mounted.current=true;const db=new ArchiveStore(DB_NAME+experience.archiveSuffix);store.current=db;let alive=true;void(async()=>{try{await db.open(()=>{if(alive){setStorageStatus('其他标签页占用档案，请关闭后重试');}});const existing=await db.read();if(!alive){db.close();return;}if(existing){archiveRef.current=existing;setArchive(existing);setStorageStatus(existing.savedAt?`已读取档案 · 上次保存 ${new Date(existing.savedAt).toLocaleString('zh-CN')}`:'已读取本地档案');}else setStorageStatus('尚无本地档案');setStorageReady(true);}catch(e){if(alive){setError(String(e));setStorageStatus('档案不可用 · 可导出原件或临时体验');setStorageReady(true);try{const backup=await db.read('last-good');if(alive)setRecoveryAvailable(!!backup);}catch{/* Keep corrupt originals untouched. */}}}})();
  if('BroadcastChannel'in window){const c=new BroadcastChannel('three-body-civilization:active'+experience.archiveSuffix);channel.current=c;const id=crypto.randomUUID();c.onmessage=e=>{if(e.data?.type==='hello'&&e.data.id!==id)c.postMessage({type:'occupied',to:e.data.id});if(e.data?.type==='occupied'&&e.data.to===id){setReadOnly(true);setStorageStatus('另一标签页正在使用档案；此页只读');}};c.postMessage({type:'hello',id});}
  return()=>{alive=false;mounted.current=false;generation.current++;runtime.current?.dispose();runtime.current=null;db.close();channel.current?.close();if(toastTimer.current)clearTimeout(toastTimer.current);};
 },[]);
 function open(next:Overlay){runtime.current?.pause('menu');setOverlay(next);}
 function close(){setOverlay(null);}
 async function start(fresh=false){if(busyStart.current||readOnly||(nextTransition.current&&!fresh))return;if(!fresh&&checkpointIssues(archiveRef.current,experience.scenario).length){setOverlay('compatibility');return;}if(window.innerWidth<1024||window.innerHeight<640){toast('游戏需要至少 1024 × 640 的桌面窗口；你仍可查看档案与设置。');return;}busyStart.current=true;setStartupFailure(false);setStartupDetails('');setError('');const token=++generation.current;setOverlay(null);setPhase('loading');setLoading('检查 WebGL2 与鼠标权限');try{if(!('requestPointerLock'in HTMLElement.prototype))throw Error('此浏览器不支持鼠标锁定，请使用桌面浏览器。');const {GameRuntime}=await import('../game/runtime');if(token!==generation.current)return;runtime.current?.dispose();runtime.current=null;const r=new GameRuntime(host.current!,archiveRef.current.settings,archiveRef.current.civilization,{view:setView,interact:(t,o)=>{setTarget(t);setSample(o);setOverlay(o?'instrument':t.kind==='plaque'?'plaque':t.kind==='facility'?'facility':t.kind==='archive'?'journal':'npc');},error:fail,ended:c=>{update(a=>withCheckpoint(a,c));setOverlay('result');void persist();},checkpoint:c=>{void persist(c);},journal:()=>setOverlay('journal'),pause:()=>{}},experience.scenario);runtime.current=r;await r.initialize(setLoading,fresh?null:archiveRef.current.checkpoint);if(token!==generation.current){r.dispose();return;}setView({...initialView,paused:true});setPhase('ready');if(archiveRef.current.checkpoint?.ended&&!fresh)setOverlay('result');}catch(e){const failed=runtime.current,before=failed?.resourceSnapshot()??null;failed?.dispose();const message=e instanceof Error?e.message:String(e),details=e instanceof Error&&e.cause?String(e.cause):'';startupHistory.current.push({error:message,details,before,cleanup:failed?.cleanupSnapshot()??null});if(startupHistory.current.length>20)startupHistory.current.shift();runtime.current=null;setPhase('entry');setStartupFailure(true);setStartupDetails(details);fail(message);}finally{busyStart.current=false;}}
 async function reloadLatest(){
  if(!store.current||saving||busyStart.current||nextTransition.current)return;
  nextTransition.current=true;runtime.current?.pause('menu');setSaving(true);
  try{
   await saveQueue.current;
   const snapshot=withCheckpoint(archiveRef.current,runtime.current?.checkpoint());
   const latest=await store.current.readLatestPreserving(snapshot);
   if(!mounted.current)return;
   runtime.current?.dispose();runtime.current=null;update(()=>latest);setTemporary(false);setError('');setRecoveryAvailable(false);setPhase('entry');setOverlay('settings');
   setStorageStatus(readOnly?'已读取最新档案；此页仍只读，其他标签页的写入权限不变':'已读取最新档案；原页面进度已保留为可导出的副本');
  }catch(cause){fail(`未能读取最新档案：${String(cause)}。当前页面进度仍保留。`);}
  finally{nextTransition.current=false;setSaving(false);}
 }
 async function rebuildScene(){
  const active=runtime.current;if(!active||readOnly||busyStart.current||nextTransition.current)return;
  nextTransition.current=true;active.pause('error');
  const beforeCheckpoint=active.checkpoint(),before=active.resourceSnapshot();
  try{
   const saved=await persist(active.checkpoint());
   if(!mounted.current)return;
   if(!saved&&!temporary){fail('场景尚未重建：当前进度未能写入档案。请重试保存，或先导出当前档案。');return;}
   setError('');nextTransition.current=false;
   await start();
   rebuildHistory.current.push({before,released:active.releasedResources,retiredContextLost:active.retiredContextLost,after:runtime.current?.resourceSnapshot()??null,checkpointExact:!!runtime.current&&JSON.stringify(beforeCheckpoint)===JSON.stringify(runtime.current.checkpoint())});
   if(rebuildHistory.current.length>20)rebuildHistory.current.shift();
  }catch(cause){fail(`无法重建场景：${String(cause)}。当前档案仍可导出。`);}
  finally{nextTransition.current=false;}
 }
 async function resume(){if(archiveRef.current.checkpoint?.ended){setOverlay('result');return;}setOverlay(null);setPhase('game');await runtime.current?.resume();}
 async function entry(){if(runtime.current){await persist(runtime.current.checkpoint());runtime.current.dispose();runtime.current=null;}setOverlay(null);setPhase('entry');}
 function changeSettings(patch:Partial<Settings>){update(a=>({...a,settings:{...a.settings,...patch}}));runtime.current?.setSettings(archiveRef.current.settings);void persist();}
 function record(){if(!sample)return;const duplicate=archiveRef.current.observations.some(o=>o.id===sample.id);update(a=>({...a,observations:addObservation(a.observations,sample)}));void persist(runtime.current?.checkpoint());toast(duplicate?'此时间窗已记录，不重复保存。':'已加入观测档案。');}
 function exportStartup(){const report={build:BUILD_ID,scenario:experience.scenario.id,attempts:startupHistory.current,scope:'Initialization failures in this page, up to 20. Cleanup records actual abort signal, canvas connection and retired WebGL context state. Resource counts are not GPU memory or retained heap; null means runtime construction did not complete.'},url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='startup-failures.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function exportRebuilds(){const report={build:BUILD_ID,scenario:experience.scenario.id,browser:navigator.userAgent,cycles:rebuildHistory.current,scope:'Resource counts before disposal, after owned-resource disposal (before renderer disposal), and immediately after new renderer initialization (may precede first frame). Retired WebGL context loss and checkpoint equality are recorded. Optional JS heap is browser-wide and approximate. Not a GPU-memory or retained-heap measurement; no forced GC.'};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='scene-rebuilds.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function exportPerformance(){if(!runtime.current)return;const report=runtime.current.performanceReport(),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='performance-capture.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(report.complete?'性能采样已导出。':'已导出未满 90 秒的采样，不能作为完整验收。');}
 function exportArchive(){const snapshot=withCheckpoint(archiveRef.current,runtime.current?.checkpoint());const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`civilization-${archiveRef.current.civilization}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出当前档案。');}
 async function recoverArchive(){if(readOnly||runtime.current||saving)return;setSaving(true);try{const recovered=await store.current!.recoverLastGood();update(()=>recovered);setRecoveryAvailable(false);setError('');setStorageStatus('已恢复上一份有效档案；损坏原件已隔离保留');toast('恢复完成。');}catch(e){fail(String(e));}finally{setSaving(false);}}
 async function exportOriginal(){try{const raw=await store.current!.readRaw();if(raw===undefined)throw Error('没有可导出的本地原件。');const url=URL.createObjectURL(new Blob([JSON.stringify(raw,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='civilization-original.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){fail(String(e));}}
 async function importArchive(file:File){
  if(readOnly||busyStart.current||nextTransition.current)return;
  nextTransition.current=true;
  try{
   if(file.size>4*1024*1024)throw Error('导入文件超过 4 MB。');
   const imported=parseImport(await file.text());
   if(runtime.current)throw Error('请返回入口后再导入，避免覆盖正在运行的世界。');
   setSaving(true);
   const transaction=saveQueue.current.then(async()=>{
    const candidate={...imported,revision:archiveRef.current.revision};
    if(temporary){update(()=>candidate);setStorageStatus('导入到临时体验 · 尚未写入本地');return;}
    if(!store.current)throw Error('本地档案不可用；当前档案未替换。');
    const committed=await store.current.save(candidate);
    if(mounted.current){update(()=>committed);setStorageStatus('导入完成 · 已写入本地档案');}
   });
   saveQueue.current=transaction.catch(()=>{});
   await transaction;toast(temporary?'已导入内存，离开前请导出。':'档案已导入并保存。');
  }catch(e){fail(String(e));}
  finally{nextTransition.current=false;setSaving(false);}
 }
 async function inheritCompatible(){
  if(nextTransition.current||saving||readOnly||runtime.current)return;
  nextTransition.current=true;setSaving(true);
  try{
   await saveQueue.current;
   const candidate=inheritArchive(archiveRef.current);
   if(temporary){update(()=>candidate);setStorageStatus('仅在内存继承记录 · 请导出档案');}
   else{
    if(!store.current)throw Error('本地档案不可用；原检查点未改变。');
    const committed=await store.current.save(candidate,{preservePrevious:true});
    update(()=>committed);setStorageStatus('已继承记录 · 原检查点另行保留');
   }
   setOverlay(null);toast('记录与假设已保留，新的文明可开始观测。');
  }catch(error){fail(String(error));}
  finally{nextTransition.current=false;setSaving(false);}
 }
 async function nextCivilization(){
  if(nextTransition.current||saving||!archiveRef.current.checkpoint?.outcome)return;
  nextTransition.current=true;
  try{
   if(!temporary&&!await persist()){fail('结算尚未成功写入本地档案。请重试保存或导出；当前结算继续保留。');return;}
   setSaving(true);
   const current=archiveRef.current;
   const candidate:Archive={...current,civilization:current.civilization+1,history:[...current.history,{civilization:current.civilization,outcome:current.checkpoint!.outcome!}],checkpoint:null};
   const committed=temporary?candidate:await store.current!.save(candidate);
   update(()=>committed);if(temporary)setStorageStatus('仅在内存继承记录 · 离开前请导出档案');runtime.current?.dispose();runtime.current=null;
   await start(true);
  }catch(e){fail('进入下一文明的事务失败；当前结算仍保留。'+String(e));}
  finally{nextTransition.current=false;setSaving(false);}
 }

 const chosen=archive.observations.find(o=>o.id===selected)??archive.observations.at(-1);
 const panelFooter=<>
  {overlay==='instrument'&&sample&&<InstrumentActions recorded={archive.observations.some(o=>o.id===sample.id)} onClose={close} onRecord={record}/>}
  {overlay==='facility'&&<PreservationConfirm onCancel={close} code={settings.keys.interact} disabled={view.preservation!=='idle'} onConfirm={()=>{setOverlay(null);runtime.current?.preserve();}}/>}
  {overlay==='plaque'&&<div className="panel-actions"><button className="primary" onClick={close}>返回场景</button></div>}
  {overlay==='npc'&&<div className="panel-actions"><button className="primary" onClick={close}>我会留下记录</button></div>}
  {overlay==='intro'&&<div className="panel-actions"><button className="primary" onClick={()=>setOverlay('settings')}>查看设置与档案选项</button></div>}
  {overlay==='result'&&<div className="panel-actions"><button disabled={saving} onClick={()=>void reloadLatest()}>保留页面副本并读取最新档案</button><button onClick={exportArchive}>导出档案</button><button className="primary" disabled={saving||readOnly} onClick={()=>void nextCivilization()}>{saving?'正在写入档案…':'进入下一文明'}</button></div>}
 </>;
 return <main className={`app theme-${settings.theme}`} style={{'--font-scale':settings.fontScale} as React.CSSProperties} data-reduced={settings.reducedMotion} data-large={settings.fontScale>1.2}>
  <div ref={host} className="world-host" aria-label="第一人称三维场景"/>
  {phase==='entry'&&<section className="entry" aria-label="游戏入口" style={{backgroundImage:`url(${import.meta.env.BASE_URL}assets/plates/${theme.asset}.webp)`}}>
   <nav className="theme-switch" aria-label="界面主题">{Object.entries(themes).map(([id,t])=><button key={id} aria-pressed={settings.theme===id} title={t.name} onClick={()=>changeSettings({theme:id as Settings['theme']})}>{id.toUpperCase()}<span>{t.name}</span></button>)}</nav>
   <div className="entry-content"><p className="wordmark" aria-hidden="true">THREE BODY<br/>CIVILIZATION</p><h1>三体文明</h1><p className="entry-line">{theme.line}</p><p className="experience-choice"><span>{experience.label}{experience.compressed?' · 独立演示档案':' · 约十分钟'}</span><a href={experience.alternateHref}>{experience.alternateLabel}</a></p>{archive.history.at(-1)&&<p className="quiet">{archive.history.at(-1)!.outcome.individual==='preserved'?'保存记录已核验 · 观察者复苏':'新的观察者 · 接续前代档案'}<br/>已继承 {archive.observations.filter(o=>o.civilization<archive.civilization).length} 条观测</p>}{calibration&&<p className="quiet">已继承多天体校准 · 观象柱开放逐目标方向读数</p>}<p className="experience-choice"><a href={`${import.meta.env.BASE_URL}courtyard.html`}>进入观象庭院样板</a></p><nav className="entry-menu" aria-label="主菜单"><button className="primary start" disabled={!storageReady||readOnly} onClick={()=>void start()}>{archive.checkpoint?'继续观测':'开始观测'}<Arrow/></button><button onClick={()=>open('journal')}>文明档案</button><button onClick={()=>open('settings')}>设置</button></nav></div>
   <div className="location-stamp"><span>荒原观测站</span><span>文明 {String(archive.civilization).padStart(3,'0')}</span></div><footer className="entry-footer"><span>本地开发版 0.3 · 入口为概念美术</span><span>{displayedStorageStatus}</span></footer>
   <div className="small-window">请使用至少 1024 × 640 的桌面窗口游玩。当前可浏览档案与设置。</div>
  </section>}
  {phase==='loading'&&<section className="loading-screen" aria-live="polite"><span className="loading-mark" aria-hidden="true"/><h2>初始化本地文明</h2><p>{loading}</p><small>首次进入需要准备物理模块和场景材质。</small></section>}
  {(phase==='game'||phase==='ready')&&<><ExplorationHud civilization={archive.civilization} observations={archive.observations} ended={!!archive.checkpoint?.ended} compressed={experience.compressed} view={view} settings={settings} onJournal={()=>open('journal')} onPause={()=>open('pause')} onCancelPreserve={()=>runtime.current?.cancelPreserve()}/>
   {view.paused&&!overlay&&<div className="resume-shade"><div><h2>{archive.checkpoint?.ended?'本轮观测已结束':phase==='ready'?'文明已就绪':'世界已暂停'}</h2>{archive.checkpoint?.ended?<p>查看城市与个体的结局，再决定何时进入下一文明。</p>:<p>{[settings.keys.forward,settings.keys.left,settings.keys.back,settings.keys.right].map(keyLabel).join(' / ')} 移动 · 鼠标观察 · {keyLabel(settings.keys.interact)} 交互 · {keyLabel(settings.keys.journal)} 日志</p>}<button className="primary" onClick={()=>void resume()}>{archive.checkpoint?.ended?'查看结算':'点击继续'}<Arrow/></button>{!archive.checkpoint?.ended&&<small>点击后锁定鼠标，按 Esc 释放。</small>}<button className="text-button" onClick={()=>open('settings')}>调整设置</button><button className="text-button" onClick={()=>open('pause')}>暂停菜单</button></div></div>}
  </>}
  {notice&&!overlay&&<div className="toast" role="status">{notice}</div>}
  {overlay&&<Dialog title={{plaque:target?.displayName??'石牌',backups:'保留的本地原档',compatibility:'选择如何接续档案',intro:'观察、判断与保存',journal:'观测档案',settings:'设置',instrument:target?.displayName??'仪器读数',facility:'停止观测，进入保存',npc:target?.displayName??'交谈',pause:'世界已暂停',result:'城市终结，记录留下',error:'需要处理的问题'}[overlay]} onClose={close} wide={overlay==='journal'||overlay==='settings'} footer={['instrument','facility','plaque','npc','intro','result'].includes(overlay)?panelFooter:undefined}>
   {notice&&<p className="quiet" role="status">{notice}</p>}
   {overlay==='backups'&&<BackupList store={store.current} onBack={()=>setOverlay('settings')} onNotice={toast}/>}
   {overlay==='compatibility'&&<><p>这份档案可以读取，但当前版本不能原样恢复其中的世界。</p><ul>{checkpointIssues(archive,experience.scenario).map(reason=><li key={reason}>{reason}</li>)}</ul><p>你可以先导出原档案，或保留全部已记录事实、知识、假设历史和设置，开启新的文明。旧文明的行走位置与未完成动作不继续执行，也不会被算作死亡或保存成功。</p><p className="quiet">本地模式会在同一事务中另存原检查点，写入成功后才接续。临时体验只改变内存，请自行导出。</p><div className="button-row"><button onClick={exportArchive}>导出原档案</button><button className="primary" disabled={saving||readOnly} onClick={()=>void inheritCompatible()}>保留记录，开启新文明</button><button onClick={close}>暂不处理</button></div></>}
   {overlay==='journal'&&<div className="journal-layout"><aside className="evidence-index"><p>{archive.observations.length} 条已记录证据</p>{archive.observations.length===0?<p className="quiet">尚无观测。进入广场，读取观象柱后记录第一份样本。</p>:archive.observations.map(o=><button key={o.id} className={chosen?.id===o.id?'selected':''} onClick={()=>setSelected(o.id)}><span>文明 {String(o.civilization).padStart(3,'0')} · {time(o.tick)}</span><strong>{o.source==='pillar'?'天空样本':'温度读数'}</strong></button>)}</aside><section className="evidence-body"><span className="section-label">观测事实</span><h3>{chosen?describe(chosen):'让判断从证据开始。'}</h3>{chosen&&<><p className="quiet">地点：{chosen.location?.name??'旧档未记录地点'} · 来源：{chosen.location?.instrumentName??(chosen.source==='pillar'?'观象仪':'温度仪')} · 游戏时间 {time(chosen.tick)}</p>{chosen.source==='pillar'&&<div className="sun-samples" aria-label="已记录的天体方向">{chosen.sunIds.map((id,i)=><div key={id}><span className="sample-disc"/><span>天体 {i+1}</span><small>高度分量 {chosen.directions[id]?.[1].toFixed(3)}</small></div>)}</div>}<p>样本编号：{chosen.id}。{chosen.source==='pillar'?'这是采样瞬间的记录，不代表当前天空。未看到其他天体，也不能证明其他天体不存在。':'这是采样瞬间的仪器读数，按 0.1 °C 显示，不代表当前位置或当前时刻的温度。'}</p></>}
   <CalibrationPanel observations={archive.observations} civilization={archive.civilization} sample={chosen}/><HypothesisPanel hypothesis={archive.hypothesis} chosen={chosen} civilization={archive.civilization} readOnly={readOnly} onChange={hypothesis=>{update(a=>({...a,hypothesis}));void persist();}}/><section className="journal-section"><span className="section-label">继承知识</span><h4>{knowledge.length?'已证实：太阳并非唯一。':'证据尚不足。'}</h4><p className="quiet">{knowledge.length?`发现于文明 ${knowledge[0].civilization}，依据 ${knowledge[0].evidenceIds[0]}。`:'需要在同一观测样本中辨认至少两颗天体。'}</p>{archive.history.at(-1)&&<p>上一文明个体：{archive.history.at(-1)!.outcome.individual==='preserved'?'完成保存，当前观察者复苏。':'未保存，由新的观察者接续档案。'}</p>}</section></section></div>}
   {overlay==='instrument'&&sample&&<InstrumentReading civilization={archive.civilization} observations={archive.observations} sample={sample}/>}
   {overlay==='facility'&&<FacilityReading/>}
   {overlay==='plaque'&&<>{target?.reading?.map((line,index)=><p key={index}>{line}</p>)}</>}
   {overlay==='npc'&&<><p className="large-copy">{target?.kind==='teacher'?'先记下你真正看到的。观象柱在广场西侧，温度仪就在旁边。不要把一次平静当作永远。':'设施在广场西北侧。先看清入口，再决定何时回来。阴影可以遮光，却不能替代保存流程。'}</p><p className="quiet">观象台提供更开阔的天空，但离保存设施更远。</p></>}
   {overlay==='intro'&&<><p className="large-copy">什么时候停止观察，转而保存自己和已经得到的知识？</p><p>你从南侧城门进入古城。沿主路寻找广场西侧的观象柱和温度仪，读取并记录真实看到的信息，再打开文明档案比较样本。</p><p>提前确认西北侧保存设施的入口。你可以继续前往高台观察，也可以进入设施；保存需要约 12 秒，只有准备阶段能够取消，完成后将失去后续观测机会。</p><p>警告出现后，文字会提示设施方向。城市是否毁灭、个体是否保存和知识是否留下分别结算。下一文明继承你记录的证据。</p><p className="quiet">W/A/S/D 移动，鼠标观察，E 交互，J 日志，Esc 暂停。实际按键以设置为准。首版需要至少 1024 × 640 的桌面窗口、WebGL2 与鼠标锁定；手机可阅读说明和档案。脱水与复苏是虚构机制。</p></>}
   {overlay==='settings'&&<><div className="settings-grid"><label>界面字号 <output>{Math.round(settings.fontScale*100)}%</output><input aria-label="界面字号" type="range" min="1" max="1.5" step="0.1" value={settings.fontScale} onChange={e=>changeSettings({fontScale:+e.target.value})}/></label><label>画质<select value={settings.quality} onChange={e=>changeSettings({quality:e.target.value as Settings['quality']})}><option value="low">兼容 · 关闭场景阴影</option><option value="standard">标准 · 单主阴影</option><option value="high">增强 · 提高渲染分辨率</option></select></label><label>垂直视野 <output>{settings.fov}°</output><input type="range" min="55" max="85" value={settings.fov} onChange={e=>changeSettings({fov:+e.target.value})}/></label><label>鼠标灵敏度 <output>{settings.sensitivity.toFixed(1)}</output><input type="range" min="0.2" max="3" step="0.1" value={settings.sensitivity} onChange={e=>changeSettings({sensitivity:+e.target.value})}/></label><label>音量 <output>{Math.round(settings.volume*100)}%</output><input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={e=>changeSettings({volume:+e.target.value})}/></label><label>结算低频 <output>{Math.round(settings.bassVolume*100)}%</output><input type="range" min="0" max="1" step="0.05" value={settings.bassVolume} onChange={e=>changeSettings({bassVolume:+e.target.value})}/></label><label>入口主题<select value={settings.theme} onChange={e=>changeSettings({theme:e.target.value as Settings['theme']})}>{Object.entries(themes).map(([id,t])=><option key={id} value={id}>{id.toUpperCase()} · {t.name}</option>)}</select></label><label className="check-row"><input type="checkbox" checked={settings.reducedMotion} onChange={e=>changeSettings({reducedMotion:e.target.checked})}/>减少动态效果</label><label className="check-row"><input type="checkbox" checked={settings.captions} onChange={e=>changeSettings({captions:e.target.checked})}/>环境提示字幕</label></div><details><summary>按键设置</summary><div className="key-settings">{Object.entries(settings.keys).map(([action,key])=><label key={action}>{({forward:'前进',back:'后退',left:'左移',right:'右移',interact:'交互',journal:'日志'} as Record<string,string>)[action]}<input value={key.replace('Key','')} readOnly aria-label={`重新绑定${actionLabels[action]}`} onKeyDown={e=>{if(!bindingCode(e.nativeEvent))return;e.preventDefault();if(Object.values(settings.keys).includes(e.code)&&key!==e.code){toast('此按键已绑定其他动作。');return;}changeSettings({keys:{...settings.keys,[action]:e.code}});}}/></label>)}</div><p className="quiet">选中输入框后按字母键；Esc 与 Shift 保留。</p></details><section className="storage-section"><h3>本地档案</h3><button onClick={()=>setOverlay('intro')}>玩法说明与设备要求</button><p>{displayedStorageStatus}</p><div className="button-row"><button disabled={saving} onClick={()=>void reloadLatest()}>保留页面副本并读取最新档案</button><button onClick={exportArchive}>导出档案</button><button onClick={()=>void exportOriginal()}>导出本地原件</button><button onClick={()=>setOverlay('backups')}>查看保留原档</button>{recoveryAvailable&&<button disabled={saving||readOnly||phase!=='entry'} onClick={()=>void recoverArchive()}>恢复上一份有效档案</button>}<label className="file-button">导入档案<input type="file" accept=".json,application/json" disabled={phase!=='entry'||readOnly} onChange={e=>{const f=e.target.files?.[0];if(f)void importArchive(f);e.target.value='';}}/></label><button disabled={saving||readOnly} onClick={()=>void persist()}>重试保存</button></div><label className="check-row"><input type="checkbox" checked={temporary} onChange={e=>{setTemporary(e.target.checked);setStorageStatus(e.target.checked?'临时体验 · 请导出档案':'本地存档模式');}}/>临时体验（仅内存，离开前请导出）</label></section></>}
   {overlay==='pause'&&<><p>{archive.checkpoint?.ended?'本轮已经结束。可以查看结算、导出档案或返回入口。':'移动和世界时间都已停止。返回后请主动点击继续。'}</p><div className="pause-actions"><button className="primary" onClick={()=>void resume()}>{archive.checkpoint?.ended?'查看结算':'继续探索'}</button><button onClick={()=>setOverlay('settings')}>设置与存档</button><button onClick={()=>void entry()}>保存并返回入口</button></div><details><summary>开发诊断</summary><div className="button-row"><button onClick={()=>{runtime.current?.startPerformanceCapture();toast('采样已准备，继续探索后累计 90 秒有效帧。');}}>开始 90 秒性能采样</button><button onClick={exportPerformance}>导出性能采样</button><button disabled={saving||readOnly} onClick={()=>void rebuildScene()}>重建场景并记录资源</button><button disabled={saving||readOnly} onClick={()=>{if(!runtime.current?.simulateContextLoss())toast('当前场景不可用，或浏览器不支持上下文丢失测试。');}}>模拟图形上下文丢失</button><button disabled={!rebuildHistory.current.length} onClick={exportRebuilds}>导出重建记录（{rebuildHistory.current.length}）</button></div><pre>{JSON.stringify({tick:view.tick,position:view.position.map(x=>+x.toFixed(2)),grounded:view.grounded,pauseReasons:view.reasons,drawCalls:view.drawCalls,triangles:view.triangles,meanFrameMs:+view.frameMs.toFixed(2)},null,2)}</pre><p className="quiet">仅开发诊断；重建会先保存当前进度。资源计数不等于显存或保留堆内存，当前帧统计不代表实机性能验收。</p></details></>}
   {overlay==='result'&&<><p className="large-copy">{archive.checkpoint?.outcome?.reason}</p><dl className="result-list"><div><dt>地表城市</dt><dd>毁灭</dd></div><div><dt>当前个体</dt><dd>{archive.checkpoint?.outcome?.individual==='preserved'?'设施内保存':'未能保存'}</dd></div><div><dt>本轮观测</dt><dd>{archive.observations.filter(o=>o.civilization===archive.civilization).length} 条</dd></div><div><dt>继承知识</dt><dd>{knowledge.length?'太阳并非唯一':'证据尚不足'}</dd></div></dl><p>档案继承与你是否存活分别记录；下一位观察者只能得到你真正留下的信息。</p><p className="quiet">{displayedStorageStatus}</p></>}
   {overlay==='error'&&<><p className="error-text">{error}</p>{(startupDetails||startupFailure)&&<details><summary>查看错误详情</summary>{startupDetails&&<p className="quiet">{startupDetails}</p>}{startupFailure&&<button onClick={exportStartup}>导出启动诊断</button>}</details>}<div className="button-row">{startupFailure&&<button className="primary" disabled={!storageReady||readOnly} onClick={()=>void start()}>重试初始化</button>}<button onClick={()=>setOverlay('intro')}>阅读玩法说明</button><button onClick={exportArchive}>导出当前档案</button>{!startupFailure&&<><button disabled={saving} onClick={()=>void reloadLatest()}>保留页面副本并读取最新档案</button><button onClick={()=>void persist()}>重试保存</button></>}{runtime.current&&<button disabled={saving||readOnly} onClick={()=>void rebuildScene()}>保留进度并重建场景</button>}{runtime.current&&error.includes('可走区域')&&<button onClick={()=>{runtime.current?.recover();close();}}>回到最近安全点</button>}<button className={startupFailure?undefined:"primary"} onClick={()=>void entry()}>返回入口</button></div></>}
  </Dialog>}
 </main>;
}










