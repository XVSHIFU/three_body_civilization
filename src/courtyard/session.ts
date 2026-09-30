import {GameClock,type PauseReason} from '../game/clock';
export type Panel='loading'|'welcome'|'pause'|'settings'|'journal'|'plaque'|'observer'|'instrument'|'error'|null;
/** UI and pointer-lock have one shared authority. Closing a panel is not an Esc action. */
export class CourtyardSession {
 readonly clock=new GameClock();panel:Panel='loading';settingsOrigin:Panel='pause';readingOrigin:Panel=null;
 ready(){this.clock.clear('loading');this.panel='welcome';}
 open(panel:Exclude<Panel,null>){if(panel==='error')this.clock.pause('error');if(panel==='settings')this.settingsOrigin=this.panel??'pause';if(['journal','plaque','observer','instrument'].includes(panel))this.readingOrigin=this.panel;this.panel=panel;this.clock.pause('menu');}
 interrupt(reason:'focusLost'|'hidden'|'pointerUnlocked'){this.clock.pause(reason);if(this.panel===null)this.panel='pause';}
 escape(){if(this.panel==='error'||this.panel==='loading')return;this.panel='pause';this.clock.pause('menu');}
 get canReturn(){return this.readingOrigin===null&&!(['hidden','focusLost','error','contextLost','loading','result'] as PauseReason[]).some(r=>this.clock.pauseReasons.has(r));}
 locked(){if((['error','contextLost','loading','result'] as PauseReason[]).some(r=>this.clock.pauseReasons.has(r)))return false;for(const reason of ['menu','pointerUnlocked','hidden','focusLost'] as const)this.clock.clear(reason);this.panel=null;return true;}
}
