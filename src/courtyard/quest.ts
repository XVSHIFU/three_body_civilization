import type {Observation} from '../gameplay/evidence';
export interface QuestProgress {accepted:boolean;briefed:boolean}
export interface QuestStep {id:string;goal:string;detail:string;target:'observer'|'instrument'|'facility'|null}
export function questStep(progress:QuestProgress,records:Observation[],warning:boolean,ended:boolean):QuestStep {
 if(ended)return {id:'ended',goal:'这一页已经留下',detail:'查看本次观测与接续结果',target:null};
 if(warning)return {id:'choice',goal:'热浪正在逼近',detail:'穿过左侧石门保存；也可自愿留下再观测一次',target:'facility'};
 if(!records.length&&!progress.accepted)return {id:'meet',goal:'与观测员交谈',detail:'靠近庭院中的观测员，按 E 接受委托',target:'observer'};
 if(!records.length)return {id:'first',goal:'留下第一份天象记录',detail:'走上石阶，在仪器前按 E，然后记录读数',target:'instrument'};
 if(!progress.briefed)return {id:'report',goal:'把读数带给观测员',detail:'记录已保存，回到观测员身边按 E 交谈',target:'observer'};
 const first=records[0],changed=records.slice(1).some(o=>o.sunIds.length!==first.sunIds.length||o.sunIds.some(id=>!first.sunIds.includes(id)||Math.abs(Math.asin(o.directions[id][1])-Math.asin(first.directions[id][1]))>5*Math.PI/180));
 return changed?{id:'evidence',goal:'天象变化已被记下',detail:'可前往保存点保全自己，也可继续补充观测',target:'facility'}:{id:'compare',goal:'再观察一次，寻找变化',detail:'比较太阳数量与高度；记录后会与第一份读数对照',target:'instrument'};
}
/** Authored walkable waypoints, not a straight arrow through the raised terrace or wall. */
export function questWaypoint(target:QuestStep['target'],x:number,z:number):{position:[number,number,number];label:string}|null {
 if(!target)return null;
 if(z<-5&&x<-5&&target!=='facility')return {position:[-8,1.5,-3],label:'穿过石门返回庭院'};
 if(target==='facility'){
  if(x>-1&&z<0)return {position:[4,2.2,3],label:'沿石阶下行'};
  if(z>-4)return {position:[-8,1.7,-5],label:'穿过左侧石门'};
  return {position:[-9,1.7,-10.5],label:'保存点操作桌'};
 }
 if(target==='observer'&&x>-1&&z<0)return {position:[4,2.2,3],label:'沿石阶下行'};
 if(target==='observer')return {position:[7.25,2,1.5],label:'观测员'};
 if(z>1)return {position:[4,1.7,1],label:'沿石阶上行'};
 return {position:[4,3,-3.65],label:'观象仪操作台'};
}
