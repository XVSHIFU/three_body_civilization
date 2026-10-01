import {questStep,questWaypoint} from './quest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CourtyardLoop,CourtyardLoopStore,nearPreservationPoint,type PlayerPose} from './loop';
import {inheritedObservations,evidenceSummary} from './knowledge';
import type {Observation} from '../gameplay/evidence';
import type {SunView} from '../simulation/core';
import {interpolateSky} from '../simulation/sky';
import {ShadowSelector} from '../renderer/shadow';
import {PlayerController} from '../player/controller';
import {PositionInterpolation} from '../renderer/position-interpolation';
import {disposeResources} from '../renderer/dispose-resources';
import {CourtyardSession,type Panel} from './session';
import {createCourtyard,spawn,type CourtyardTarget} from './scene';
import '@fontsource/noto-serif-sc/chinese-simplified-400.css';
import './styles.css';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const panel=$<HTMLDialogElement>('panel'),body=$('panel-body'),actions=$('panel-actions'),title=$('panel-title'),host=$('scene');
const state=new CourtyardSession(),keys=new Set<string>(),abort=new AbortController();
const viewPosition=new PositionInterpolation(),movement=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
let needsRender=true;
const sampleMode=new URLSearchParams(location.search).has('sample'),store=new CourtyardLoopStore();
let loop:CourtyardLoop|null=null,saveFailed=false,storageMessage='',saving:Promise<boolean>=Promise.resolve(true),previousSky:SunView[]=[],currentSky:SunView[]=[],lastShadowTick=-12,startingPreservation=false,transitioning=false;
const shadowSelector=new ShadowSelector();
let renderer:THREE.WebGLRenderer,physics:RAPIER.World,player:PlayerController,world:Awaited<ReturnType<typeof createCourtyard>>;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(62,1,.08,220);camera.rotation.order='YXZ';camera.rotation.set(.10,-.38,0);
const ray=new THREE.Raycaster();let target:CourtyardTarget|undefined,last=0,notifyTimer:ReturnType<typeof setTimeout>,pending=false,disposed=false;
let lightMode='dual',fontScale=1;const records:{tick:number;light:string;angles:number[]}[]=[];
const suns:THREE.Mesh[]=[],lights:THREE.DirectionalLight[]=[];
function notify(text:string){$('notification').textContent=text;clearTimeout(notifyTimer);notifyTimer=setTimeout(()=>$('notification').textContent='',4000);}
function pause(){keys.clear();if(player)viewPosition.reset(player.eye);if(document.pointerLockElement===renderer?.domElement)document.exitPointerLock();}
function button(label:string,fn:()=>void,primary=false){const b=document.createElement('button');b.textContent=label;b.className=primary?'primary':'';b.onclick=fn;actions.append(b);return b;}
function open(next:Exclude<Panel,null>){if(saveFailed&&next!=='storage')return;if(loop?.movementLocked&&['instrument','facility'].includes(next))return;state.open(next);pause();drawPanel();if(loop&&next!=='storage')void persist();}
function escape(){state.escape();pause();drawPanel();if(loop&&!saveFailed)void persist();}
function readings(){return suns.filter(s=>s.visible).map(s=>Math.asin(s.position.clone().normalize().y)*180/Math.PI);}
function pose():PlayerPose {const p=player.body.translation();return {position:[p.x,p.y,p.z],yaw:camera.rotation.y,pitch:camera.rotation.x,motion:{verticalSpeed:player.verticalSpeed,grounded:player.grounded,safePosition:[p.x,p.y,p.z]}};}
function storageError(error:unknown){saveFailed=true;storageMessage=error instanceof Error?error.message:String(error);state.open('storage');pause();drawPanel();}
function persist():Promise<boolean>{if(!loop||disposed)return Promise.resolve(true);const current=loop;saving=store.save(current,pose()).then(()=>true).catch(e=>{storageError(e);return false;});return saving;}
async function exportArchive(){try{const data=loop?loop.snapshot(pose()):await store.readRaw();const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='courtyard-archive.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){notify(e instanceof Error?e.message:'导出失败，请保留当前页面。');}}
async function retrySave(){if(!loop)return;const ok=await persist();if(!ok)return;saveFailed=false;state.clock.clear('error');state.panel=loop.phase==='observing'?'pause':'result';drawPanel();}
function visibleReading():Observation {const origin=new THREE.Vector3(4,8.2,-6);scene.updateMatrixWorld(true);const ids=loop!.sky.filter(s=>{if(s.direction[1]<=.025)return false;const sight=new THREE.Raycaster(origin,new THREE.Vector3(...s.direction),.04,170);return !sight.intersectObjects(scene.children,true).some(hit=>hit.object instanceof THREE.Mesh&&!hit.object.userData.sky&&visibleObject(hit.object));}).map(s=>s.id);return loop!.observation(ids);}
function visibleObject(object:THREE.Object3D){for(let o:THREE.Object3D|null=object;o;o=o.parent)if(!o.visible)return false;return true;}
function observationHtml(o:Observation){return `<p>第${o.civilization}次文明 · 观测时刻 ${(o.tick/60).toFixed(0)}秒 · 可见光源 ${o.sunIds.length}个</p><div class="sample-readings">${o.sunIds.map((id,i)=>`<div>光源 ${i+1}<strong>${(Math.asin(o.directions[id][1])*180/Math.PI).toFixed(1)}°</strong></div>`).join('')}</div>`;}
function returnFromReading(){if(state.readingOrigin==='result'){state.panel='result';drawPanel();}else returnToScene();}
function readingButton(primary=true){button(state.readingOrigin==='result'?'返回结果':state.readingOrigin===null?'返回场景':'返回暂停',returnFromReading,primary);}
function cancelPreparation(){if(!loop||state.clock.paused)return;if(loop.cancelPreservation()){void persist();notify('已取消准备，可以继续观测。');updateHud();}}
function beginPreparation(){if(!loop||transitioning||pick()?.id!=='facility'||!nearPreservationPoint(pose().position)){notify('请靠近保存点操作桌，再按 E。');return;}if(loop.beginPreservation(pose().position))void finishPreservation();}
async function finishPreservation(){
 if(!loop||transitioning||saveFailed)return;transitioning=true;state.clock.pause('menu');pause();
 try{if(!await persist())return;loop.finishPreservation();state.clock.tick=loop.tick;previousSky=currentSky=loop.sky;lastShadowTick=-12;state.open('result');updateHud();if(await persist())drawPanel();}catch(e){storageError(e);}finally{transitioning=false;}
}
function inheritedHtml(){
 const records=inheritedObservations(loop!.archive.observations,loop!.archive.civilization);
 if(!records.length)return '';
 const history=loop!.archive.history.find(h=>h.civilization===records[0].civilization);
 return `<section class="log-entry"><h3>前人留下的天象</h3><p>第${records[0].civilization}次文明${history?history.outcome.individual==='preserved'?' · 观察者完成保存':' · 观察者未能完成有效保存':''}</p><p>${records.map(o=>`${(o.tick/60).toFixed(0)}秒：${o.sunIds.length}个光源`).join(' → ')}</p><p class="quiet">这是已记录的现象，不是安全保证。可用它选择下一次观测时机；空气变热时，留意返回左侧保存点的路程。</p></section>`;
}
function outcomeEvidenceHtml(){
 const evidence=evidenceSummary(loop!.archive.observations,loop!.archive.civilization),p=loop!.preservation;
 const cause=p.phase==='idle'?'你没有启动脱水保存。':p.phase==='failed'?'保管保护失效，身体未能保存。':p.phase==='preserved'?'你在灾变抵达前完成了脱水，保管保护仍有效。':`灾变抵达时，脱水只进行到 ${p.elapsed.toFixed(1)} 秒，尚未完成。`;
 return `<section class="log-entry"><h3>这次选择留下了什么</h3><p>${cause}</p>${evidence.current.length?`<p>留下 ${evidence.current.length} 条观测：${evidence.current.map(o=>`${(o.tick/60).toFixed(0)}秒 · ${o.sunIds.length}个光源`).join('；')}。</p><p>${evidence.newSuns.length?`档案新增了 ${evidence.newSuns.length} 个此前未记录的光源。`:'本轮读数补充了已有天象的记录。'}下一轮可据此选择观测时机。</p>`:'<p>这次没有留下新观测。下一轮可先到仪器记录，再决定何时保存。</p>'}</section>`;
}
function comparisonHtml(o:Observation){
 const previous=loop!.archive.observations.filter(p=>p.civilization===o.civilization&&p.tick<o.tick).at(-1);
 if(!previous)return '<p>这是本轮的首次读数。记下它，下次来时可以比较天象变化。</p>'+inheritedHtml();
 const added=o.sunIds.filter(id=>!previous.sunIds.includes(id)).length,missing=previous.sunIds.filter(id=>!o.sunIds.includes(id)).length;
 const changes=o.sunIds.filter(id=>previous.sunIds.includes(id)).map(id=>`${id.replace('s','光源 ')}高度变化 ${((Math.asin(o.directions[id][1])-Math.asin(previous.directions[id][1]))*180/Math.PI).toFixed(1)}°`);
 return `<p>距上次记录 ${((o.tick-previous.tick)/60).toFixed(0)} 秒：可见光源 ${previous.sunIds.length} → ${o.sunIds.length} 个。${added?'新出现 '+added+' 个。':''}${missing?'离开视野 '+missing+' 个。':''}</p><p>${changes.join('；')}</p>${inheritedHtml()}`;
}
async function nextCivilization(){if(!loop||transitioning||saveFailed)return;transitioning=true;try{if(!await saving)return;const next=loop.nextCivilization();const start:PlayerPose={position:[spawn.x,spawn.y,spawn.z],yaw:-.38,pitch:.1};await store.save(next,start);loop=next;player.setPosition(...start.position);player.grounded=false;physics.step();camera.rotation.set(start.pitch,start.yaw,0);viewPosition.reset(player.eye);state.clock.tick=0;state.clock.clear('result');state.panel='welcome';previousSky=currentSky=loop.sky;lastShadowTick=-12;world.dryBody.visible=false;needsRender=true;drawPanel();updateHud();}catch(e){storageError(e);}finally{transitioning=false;}}
function questConclusionHtml(){const records=questRecords();return `<p class="reading">${records.length>1?'你把不同时刻的天象留在同一册中。后来者可以比较这些记录，继续调查天空的变化。':records.length?'这一册留下了第一份读数。天象是否变化，还需要下一位观察者继续寻找证据。':'这册记录仍缺少你的观测。下一次，先从仪器留下第一份读数开始。'}</p>`;}
function resultPanel(content:(heading:string,html:string)=>void){
 const saved=loop!.checkpoint().outcome!,r=loop!.recovery;
 if(loop!.phase==='aftermath'){
  content('灾变之后',`<p class="reading">${saved.individual==='preserved'?'你已完成脱水，身体仍在保管中。':'灾变抵达时，你未能完成有效保存。'}</p><p>地表城市受损。${saved.individual==='preserved'?'脱水完成并不等于已经复苏，还需等待环境和救助条件。':'当前观察者未能幸存，但已提交的观测档案仍被保留。'}</p><p>本次留下 ${saved.evidenceCount} 条事实记录。</p>${questConclusionHtml()}${outcomeEvidenceHtml()}`);
  button('经过灾变，查看接续',()=>{try{loop!.resolveAftermath();void persist().then(ok=>{if(ok)drawPanel();});}catch(e){storageError(e);}},true);
 }else{
  const same=r!.observer==='same';content(same?'同一观察者复苏':'后来者接续档案',`<p class="reading">${same?'环境重新适宜，保管地点与身体仍完整。携水救助者协助浸泡，你恢复了行动。':'灾变过去，后来观察者找到了保留下来的档案。记录延续了下来，原观察者并未复活。'}</p><p>档案中共有 ${loop!.archive.observations.length} 条已记录事实。下一次文明从这些记录继续。</p>${questConclusionHtml()}${outcomeEvidenceHtml()}<p class="quiet">救助过场、压缩时长及可靠档案继承为游戏改编。下一文明将重现相同的初始天象，你可以带着记录尝试不同的选择。</p>`);
  button('开始下一文明',()=>void nextCivilization(),true);
 }
 button('查看留下的记录',()=>open('journal'));button('导出档案',()=>void exportArchive());
}
function updateHud(){if(!loop)return;const phase=loop.preservation.phase;const labels:Record<string,string>={preparing:'准备保存 · 前2秒可取消',entering:'进入保管位置',sealing:'交接与封护',dehydrating:'正在脱水',preserved:'脱水完成 · 等待灾变过去',failed:'保管失效'};
 const q=currentQuest();$('quest-goal').textContent=q.goal;$('quest-detail').textContent=q.detail;
 $('light-label').textContent=`第${loop.archive.civilization}次文明 · 观察者 ${loop.observerId}`;
 $('preservation-progress').hidden=phase==='idle'||loop.phase!=='observing';$<HTMLProgressElement>('preservation-meter').value=Math.min(12,loop.preservation.elapsed);$('preservation-label').textContent=labels[phase]??'';$('cancel-preservation').hidden=phase!=='preparing';$<HTMLButtonElement>('cancel-preservation').disabled=state.clock.paused;
 const bodyVisible=phase==='preserved';if(world.dryBody.visible!==bodyVisible){world.dryBody.visible=bodyVisible;renderer.shadowMap.needsUpdate=true;}
}
function questRecords(){return loop!.archive.observations.filter(o=>o.civilization===loop!.archive.civilization).sort((a,b)=>a.tick-b.tick);}
function currentQuest(){return questStep(loop!.quest,questRecords(),loop!.environment.warning,loop!.phase!=='observing');}
function questHtml(){const q=currentQuest();return `<section class="log-entry"><h3>委托 · 未写完的观测</h3><p>${q.goal}</p><p>${q.detail}</p></section>`;}
function updateQuestMarker(){
 const marker=$('quest-marker');if(!loop||state.panel||loop.movementLocked){marker.hidden=true;return;}
 const p=player.body.translation(),waypoint=questWaypoint(currentQuest().target,p.x,p.z);if(!waypoint){marker.hidden=true;return;}
 const point=new THREE.Vector3(...waypoint.position),distance=Math.hypot(point.x-p.x,point.z-p.z),local=camera.worldToLocal(point.clone()),projected=point.clone().project(camera);
 const offscreen=local.z>=0||Math.abs(projected.x)>.85||Math.abs(projected.y)>.72;
 let x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
 if(offscreen){x=local.x<0?140:innerWidth-140;y=innerHeight*.52;}
 marker.hidden=false;marker.style.left=`${THREE.MathUtils.clamp(x,140,innerWidth-140)}px`;marker.style.top=`${THREE.MathUtils.clamp(y,190,innerHeight-110)}px`;
 marker.querySelector('span')!.textContent=`${offscreen?(local.x<0?'向左转 · ':'向右转 · '):''}${waypoint.label} · ${distance.toFixed(0)}米`;
}
async function advanceQuest(briefed=false){if(!loop||saveFailed)return;loop.quest={accepted:true,briefed};if(await persist()){updateHud();drawPanel();notify(briefed?'委托更新：回到仪器，比较下一次天象。':'已接下委托：留下第一份天象记录。');}}
function observerPanel(content:(heading:string,html:string)=>void){
 const readings=questRecords(),first=readings[0];
 if(!first){content('观测员 · 未写完的观测','<p class="reading">“上一册只留下零散的天象。我需要一份从现在开始的记录：太阳有几个，在什么位置？”</p><p>“先去石阶上的仪器记下读数，再回来告诉我。我们要弄清楚，这片天空会不会变。”</p>');if(!loop!.quest.accepted)button('接下委托',()=>void advanceQuest(),true);else content('观测员 · 等你的读数','<p class="reading">“仪器就在石阶上。先记下一次，再谈变化。纸上的猜想不能代替你亲眼所见。”</p>');}
 else if(!loop!.quest.briefed){content('观测员 · 第一份读数',`<p class="reading">“${(first.tick/60).toFixed(0)}秒，${first.sunIds.length}个光源。好，这就是我们的起点。”</p><p>“再去看一次：数量有没有变，原来的太阳是不是升高了？只把真正看到的变化记下来。”</p><p>他指向左侧石门：“那里能保管脱水后的身体。如果空气开始发烫，就别只盯着天空。带回记录，也尽量保住自己。”</p>`);button('继续调查天象',()=>void advanceQuest(true),true);}
 else content('观测员 · 你的选择',`<p class="reading">${loop!.environment.warning?'“热浪来了。左侧石门后的保存点还在，但脱水也需要时间。还要不要再观察一次，你来决定。”':'“把两次读数放在一起，变化才有了证据。记录会留下，但我们未必总有下一次机会。”'}</p>${questHtml()}`);
 readingButton(false);
}
function renderLoopSky(){if(!loop)return;const views=interpolateSky(previousSky,currentSky,state.clock.interpolationAlpha);views.forEach((s,i)=>{suns[i].visible=s.aboveHorizon;suns[i].position.set(...s.direction).multiplyScalar(110);lights[i].position.set(...s.direction).multiplyScalar(75);lights[i].intensity=s.aboveHorizon?Math.min(3.5,s.irradiance*70):0;lights[i].castShadow=i===shadowSelector.source;lights[i].shadow.intensity=shadowSelector.strength;});const heat=THREE.MathUtils.clamp((loop.environment.temperature-39)/45,0,1);(scene.fog as THREE.Fog).color.set(0x9babb7).lerp(new THREE.Color(0xb78364),heat);renderer.toneMappingExposure=.78-heat*.06;
 if(loop.tick-lastShadowTick>=12){renderer.shadowMap.needsUpdate=true;lastShadowTick=loop.tick;}
}
function drawPanel(){
 needsRender=true;
 document.body.dataset.state=state.panel??'playing';$('target').hidden=!!state.panel||!target;
 if(!state.panel){panel.close();return;}if(!panel.open)panel.showModal();body.replaceChildren();actions.replaceChildren();$('close').hidden=state.panel==='loading'||state.panel==='welcome'||state.panel==='error'||state.panel==='storage'||state.panel==='result';
 const content=(heading:string,html:string)=>{title.textContent=heading;body.innerHTML=html;};
 switch(state.panel){
 case 'loading':content('观象庭院','<p>正在准备石阶、仪器与观测员…</p>');break;
 case 'welcome':if(loop){content('观象庭院',`<p class="reading">${loop.tick?'从上次停下的地方继续。':'观测员正在找人帮忙补完一册天象记录。'}</p><p>${currentQuest().goal}。${currentQuest().detail}。阅读与暂停期间，世界停止计时。</p><p class="quiet">约三分钟有效游玩。关键进度自动保存在本机，与旧原型档案独立。${loop.archive.observations.length?'档案中已有 '+loop.archive.observations.length+' 条记录。':''}</p>${inheritedHtml()}<dl class="controls"><dt>W A S D</dt><dd>行走 · Shift 快走</dd><dt>鼠标 / E</dt><dd>观察 / 近处交互</dd><dt>J / Esc</dt><dd>日志 / 暂停</dd></dl>`);button('进入庭院',()=>void resume(),true);button('设置',()=>open('settings'));break;}content('观象庭院','<p class="reading">沿石阶走近观象仪，读一读庭院留下的记录。</p><p class="quiet">可自由行走的品质样板。光照为检查场景，本页记录只保留到关闭页面。</p><dl class="controls"><dt>W A S D</dt><dd>行走 · Shift 快走</dd><dt>鼠标</dt><dd>观察四周</dd><dt>E</dt><dd>近处交互</dd><dt>J / Esc</dt><dd>日志 / 暂停</dd></dl>');button('进入庭院',()=>void resume(),true);button('设置',()=>open('settings'));break;
 case 'pause':content('世界已暂停','<p>准备好后，继续你的观测。</p>');button('继续探索',()=>void resume(),true);button('设置',()=>open('settings'));button('观测日志',()=>open('journal'));{const a=document.createElement('a');a.href='./';a.textContent='返回原型首页';actions.append(a);}break;
 case 'settings':if(loop){content('设置','<label class="setting">界面字号 <input id="font" aria-label="界面字号" type="range" min="1" max="1.5" step="0.1"></label><p class="quiet">天空随本次世界运行；这里不会切换天象或改变结局。</p>');$<HTMLInputElement>('font').value=String(fontScale);$<HTMLInputElement>('font').oninput=e=>{fontScale=+(e.target as HTMLInputElement).value;document.documentElement.style.setProperty('--font-scale',String(fontScale));};button('返回',()=>{state.panel=state.settingsOrigin;drawPanel();},true);break;}content('设置','<label class="setting">检查光照<select id="light"><option value="normal">常态 · 单日</option><option value="dual">双日</option><option value="disaster">灾变</option></select></label><label class="setting">界面字号 <input id="font" aria-label="界面字号" type="range" min="1" max="1.5" step="0.1"></label><p class="quiet">三种固定光照用于检查可读性，不推进正式天体模拟。</p>');$<HTMLSelectElement>('light').value=lightMode;$<HTMLSelectElement>('light').onchange=e=>{lightMode=(e.target as HTMLSelectElement).value;setLighting();};$<HTMLInputElement>('font').value=String(fontScale);$<HTMLInputElement>('font').oninput=e=>{fontScale=+(e.target as HTMLInputElement).value;document.documentElement.style.setProperty('--font-scale',String(fontScale));};button('返回',()=>{state.panel=state.settingsOrigin;drawPanel();},true);break;
 case 'plaque':content('观天 · 知行','<p class="reading">天象不会因我们的愿望停留。</p><p>先记下太阳所在的方向，再比较下一次观测。一次平静，不足以说明长久的规律。</p><p class="quiet">石牌旁的台阶通向观象仪。</p>');button(state.readingOrigin===null?'返回场景':'返回暂停',returnToScene,true);break;
 case 'observer':if(loop){observerPanel(content);break;}content('观测员','<p class="reading">“我把每一次观测都留下。即使判断错了，记录也能告诉后来的人，我们究竟看见过什么。”</p><p>他指了指石阶上的仪器，又低头核对手中的图册。</p>');button(state.readingOrigin===null?'返回场景':'返回暂停',returnToScene,true);break;
 case 'instrument':{if(loop){const observation=visibleReading();content('观象仪',questHtml()+observationHtml(observation)+comparisonHtml(observation)+'<p class="quiet">只记录此处无遮挡、位于地平线上方的光源。记录后可在日志中比较变化。</p>');const recordButton=button('记录本次观测',()=>{recordButton.disabled=true;try{loop!.record(observation);void persist().then(ok=>{if(ok){notify('观测已写入本机档案。'+(questRecords().length===1?' 去找观测员，交回第一份读数。':' 可在日志中比较两次读数。'));recordButton.textContent='本次读数已记录';updateHud();}});}catch(e){storageError(e);}});readingButton();break;}const angles=readings();content('观象仪',`<p>从瞄准台读取当前可见光源的高度。</p><div class="sample-readings">${angles.map((a,i)=>`<div>光源 ${i+1}<strong>${a.toFixed(1)}°</strong></div>`).join('')}</div><p class="quiet">固定检查光照的实测方向，不写入正式文明档案。</p>`);button('记录本次观测',()=>{if(!records.some(r=>r.tick===state.clock.tick&&r.light===lightMode)){records.push({tick:state.clock.tick,light:lightMode,angles});notify('已记入本页观测日志。');}else notify('本次观测已记录。');});button(state.readingOrigin===null?'返回场景':'返回暂停',returnToScene,true);break;}
 case 'journal':if(loop){const observations=loop.archive.observations;content('观测日志',questHtml()+inheritedHtml()+(observations.length?observations.slice(-30).map((o,i,a)=>`<article class="log-entry">${observationHtml(o)}${i&&a[i-1].civilization===o.civilization?`<p class="quiet">与上一条相比，可见光源由 ${a[i-1].sunIds.length} 个变为 ${o.sunIds.length} 个。</p>`:''}</article>`).join(''):'<p class="reading">还没有留下观测。</p><p>走上石阶，靠近观象仪按 E。读取后点击记录，事实才会写入档案。</p>'));readingButton();button('导出档案',()=>void exportArchive());break;}content('观测日志',records.length?records.map((r,i)=>`<article class="log-entry"><strong>观测 ${i+1} · ${r.light==='dual'?'双日':r.light==='normal'?'常态':'灾变'}检查光照</strong><p>${r.angles.map((a,j)=>`光源${j+1}高度 ${a.toFixed(1)}°`).join(' ／ ')}</p></article>`).join(''):'<p class="reading">还没有留下观测。</p><p>走上石阶，靠近观象仪的瞄准台，按 E 读取并记录。</p>');button(state.readingOrigin===null?'返回场景':'返回暂停',returnToScene,true);break;
 case 'facility':content('保存与救助','<p class="reading">这里集中保管脱水后的身体，并等待条件适宜时协助复苏。</p><p>确认后结束本轮观测，直接经历脱水与灾变。脱水仍占用世界中的时间，太晚开始可能无法完成。留在外面可记录后续天象，也可能错过保存时机。</p><p class="quiet">脱水是个体能力，设施提供保管与救助。完成脱水不保证复苏。</p>');if(loop)button('开始脱水保存',beginPreparation,true);readingButton(false);break;
 case 'result':if(loop)resultPanel(content);break;
 case 'storage':content('档案尚未写入','<p id="storage-failure"></p><p>世界已暂停，当前页面中的记录仍保留。可导出当前进度，或重试写入；另一标签发生更新时，请导出后重新读取。</p>');$('storage-failure').textContent=storageMessage;button('导出当前进度',()=>void exportArchive());if(loop)button('重试写入',()=>void retrySave());button('重新读取已保存进度',()=>location.reload());break;
 case 'error':content('庭院暂时无法继续','<p id="failure"></p><p class="quiet">原型档案未受影响。</p>');button('重新加载',()=>location.reload(),true);break;
 }
}
async function resume(){
 if(pending||document.hidden||state.panel==='error'||saveFailed||state.clock.pauseReasons.has('result'))return;
 if(document.pointerLockElement===renderer.domElement){if(state.locked())drawPanel();return;}
 if(innerWidth<1024||innerHeight<640){notify('请使用至少 1024 × 640 的桌面窗口。');return;}
 pending=true;
 try{const request=renderer.domElement.requestPointerLock();await request;}catch(e){startingPreservation=false;state.escape();drawPanel();notify(`未能锁定鼠标，请点击继续重试。${e instanceof Error?e.name:''}`);}finally{pending=false;}
}
function returnToScene(){if(state.readingOrigin==='result'){state.panel='result';drawPanel();return;}if(!state.canReturn){state.escape();drawPanel();return;}void resume();}
function setLighting(){
 needsRender=true;renderer.shadowMap.needsUpdate=true;
 const disaster=lightMode==='disaster';scene.fog=new THREE.Fog(disaster?0x9b6d53:0x9babb7,35,125);renderer.toneMappingExposure=disaster?.72:.78;
 lights[0].intensity=disaster?3.5:3;lights[0].color.set(disaster?0xffb378:0xffdfab);lights[1].intensity=lightMode==='normal'?0:.65;suns[1].visible=lightMode!=='normal';
 $('light-label').textContent=(lightMode==='normal'?'常态':lightMode==='dual'?'双日':'灾变')+' · 检查光照';
}
function pick(){if(loop?.movementLocked)return undefined;camera.updateMatrixWorld();ray.setFromCamera(new THREE.Vector2(),camera);ray.far=2.8;const hit=ray.intersectObjects(scene.children,true).find(h=>h.object instanceof THREE.Mesh&&visibleObject(h.object)&&!h.object.userData.sky);let node:THREE.Object3D|null=hit?.object??null;while(node&&!node.userData.targetId)node=node.parent;return world.targets.find(t=>t.id===node?.userData.targetId);}
async function initialize(){
 drawPanel();await RAPIER.init();physics=new RAPIER.World({x:0,y:-9.81,z:0});physics.timestep=1/60;
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(180,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 direction; void main(){float h=pow(max(normalize(direction).y,0.),.45);vec3 c=mix(vec3(.83,.73,.64),vec3(.26,.43,.66),h);gl_FragColor=vec4(c,1.);}'}));sky.userData.sky=true;scene.add(sky);
 const ambient=new THREE.HemisphereLight(0xd5dfea,0xa29881,2.5);scene.add(ambient);
 const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();const env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.34;environment.dispose();pmrem.dispose();
 for(const [i,pos] of [[-30,32,-75],[2,42,-85],[-35,25,-70]].slice(0,sampleMode?2:3).entries()){const sun=new THREE.DirectionalLight(i?0xffc88e:0xffdfab,i?.65:3);sun.position.set(...pos as [number,number,number]);sun.target.position.set(0,0,-2);scene.add(sun,sun.target);sun.castShadow=i===0;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:24,bottom:-24,near:1,far:140});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;lights.push(sun);const disk=new THREE.Mesh(new THREE.SphereGeometry(i?1.1:2.2,32,16),new THREE.MeshBasicMaterial({color:i?0xffd393:0xffe9b7,fog:false,toneMapped:false}));disk.position.copy(sun.position).normalize().multiplyScalar(110);disk.userData.sky=true;suns.push(disk);scene.add(disk);}
 world=await createCourtyard(scene,physics);player=new PlayerController(physics,spawn);physics.step();viewPosition.reset(player.eye);camera.position.copy(player.eye);
 // This sample has fixed lights and a constant read-ledger pose, with no player mesh.
 // Fixed sample lights invalidate on selection; loop sky refreshes shadows every 12 ticks.
 renderer.shadowMap.autoUpdate=false;setLighting();
 if(!sampleMode){try{loop=await store.open();const saved=loop.archive.checkpoint;if(saved){player.setPosition(...saved.position);if(saved.motion){player.verticalSpeed=saved.motion.verticalSpeed;player.grounded=saved.motion.grounded;}camera.rotation.set(saved.pitch,saved.yaw,0);state.clock.tick=loop.tick;physics.step();viewPosition.reset(player.eye);}previousSky=currentSky=loop.sky;}catch(e){storageError(e);}}
 $('objective').hidden=sampleMode;$('mode-label').textContent=sampleMode?'品质样板':'观测与保存';
 const resize=()=>{needsRender=true;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(innerWidth<1024||innerHeight<640){state.interrupt('focusLost');pause();if(state.panel===null)state.escape();drawPanel();}};
 const opts={signal:abort.signal};window.addEventListener('resize',resize,opts);resize();
 document.addEventListener('pointerlockchange',()=>{keys.clear();viewPosition.reset(player.eye);if(document.pointerLockElement===renderer.domElement){if(!state.locked())document.exitPointerLock();else if(startingPreservation){startingPreservation=false;if(loop?.beginPreservation(pose().position)){void persist();updateHud();}else notify('未能开始保存，请重新靠近操作桌。');}}else state.interrupt('pointerUnlocked');drawPanel();},opts);
 document.addEventListener('pointerlockerror',()=>{pending=false;startingPreservation=false;state.escape();drawPanel();notify('浏览器拒绝鼠标锁定，请点击继续重试。');},opts);
 window.addEventListener('blur',()=>{state.interrupt('focusLost');pause();drawPanel();if(loop&&!saveFailed)void persist();},opts);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){state.interrupt('hidden');pause();drawPanel();if(loop&&!saveFailed)void persist();}},opts);
 document.addEventListener('mousemove',e=>{if(state.clock.paused)return;camera.rotation.y-=e.movementX*.0018;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-e.movementY*.0018,-1.4,1.4);},opts);
 document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;if(e.code==='Escape'){e.preventDefault();escape();return;}if(state.clock.paused)return;if(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyJ','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR')cancelPreparation();if(e.code==='KeyJ')open('journal');if(e.code==='KeyE'&&target&&pick()?.id===target.id)open(target.id);},opts);
 document.addEventListener('keyup',e=>keys.delete(e.code),opts);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();state.clock.pause('contextLost');state.open('error');pause();drawPanel();$('failure').textContent='图形上下文丢失。请重新加载庭院。';},opts);
 state.ready();if(saveFailed)state.panel='storage';else if(loop&&loop.phase!=='observing')state.open('result');drawPanel();updateHud();last=performance.now();
 renderer.setAnimationLoop(now=>{
  if(disposed)return;const delta=(now-last)/1000;last=now;
  if(document.hidden)return;
  if(loop?.movementLocked&&loop.phase==='observing'&&!state.clock.paused){void finishPreservation();return;}
  state.clock.advance(delta,dt=>{
   movement.set(Number(keys.has('KeyD'))-Number(keys.has('KeyA')),0,Number(keys.has('KeyS'))-Number(keys.has('KeyW'))).normalize().applyAxisAngle(up,camera.rotation.y).multiplyScalar(keys.has('ShiftLeft')?4.5:3.1);
   if(loop?.movementLocked)movement.set(0,0,0);player.move(movement.x,movement.z,dt);physics.step();viewPosition.record(player.eye);world.mixer.update(dt);
   if(loop){previousSky=currentSky;loop.step();currentSky=loop.sky;shadowSelector.update(currentSky.map(s=>s.irradiance*Math.max(0,s.direction[1])),dt);if(loop.tick%15===0)updateHud();if(loop.tick%300===0)void persist();if(loop.phase!=='observing'){state.open('result');pause();drawPanel();updateHud();void persist();}}
  });
  camera.position.copy(viewPosition.at(state.clock.interpolationAlpha));
  if(!state.clock.paused){
   const next=pick();if(next!==target){target=next;$('target').hidden=!target;$('target').querySelector('span')!.textContent=target?.name??'';}
  }
  updateQuestMarker();
  if(!state.clock.paused||needsRender){renderLoopSky();renderer.render(scene,camera);needsRender=false;}
 });
 // Development-only inspection endpoint. It never fabricates pointer lock or bypasses physics.
 if(import.meta.env.DEV){Object.assign(window,{__courtyard:{scene,camera,player,world,physics,state,renderer,keys,readings,get loop(){return loop;},get snapshot(){const p=player.body.translation();return{position:[p.x,p.y,p.z],grounded:player.grounded,tick:state.clock.tick,panel:state.panel,reasons:[...state.clock.pauseReasons],locked:document.pointerLockElement===renderer.domElement,target:target?.id,records:loop?.archive.observations??records,phase:loop?.phase,preservation:loop?.preservation.phase,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}}});}
}
$('cancel-preservation').onclick=cancelPreparation;
$('journal').onclick=()=>open('journal');$('pause').onclick=escape;$('close').onclick=()=>state.panel==='settings'?(state.panel=state.settingsOrigin,drawPanel()):state.panel==='pause'?void resume():returnToScene();panel.addEventListener('cancel',e=>{e.preventDefault();escape();});
window.addEventListener('pagehide',()=>{if(loop&&!saveFailed)void persist();disposed=true;abort.abort();clearTimeout(notifyTimer);renderer?.setAnimationLoop(null);player?.dispose();physics?.free();disposeResources([scene]);renderer?.dispose();void saving.finally(()=>store.close());});
void initialize().catch(e=>{state.open('error');drawPanel();$('failure').textContent=e instanceof Error?e.message:String(e);});





