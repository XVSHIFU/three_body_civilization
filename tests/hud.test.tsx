import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {ExplorationHud,type ExplorationHudProps} from '../src/ui/ExplorationHud';
import {emptyArchive} from '../src/storage/archive';
import type {Observation} from '../src/gameplay/evidence';
const base:ExplorationHudProps={civilization:2,observations:[],ended:false,compressed:false,view:{location:'广场',feeling:'炎热',target:'读取观象柱',preservation:'preparing',warning:true},settings:emptyArchive().settings,onJournal:()=>{},onPause:()=>{},onCancelPreserve:()=>{}};
const reading:Observation={id:'temperature',civilization:2,tick:9000,source:'thermometer',temperature:31.7,sunIds:[],directions:{}};
it('shows only a recorded temperature from the current civilization with its sample time',()=>{
 const before=renderToStaticMarkup(<ExplorationHud {...base} observations={[{...reading,civilization:1}]}/>);
 expect(before).toContain('温度尚未测量');expect(before).not.toContain('31.7');
 const after=renderToStaticMarkup(<ExplorationHud {...base} observations={[reading]}/>);
 expect(after).toContain('31.7 °C · 采样 02:30');
 expect(after).not.toContain('三体阶段');expect(after).not.toContain('倒计时');
});
it('removes stale interaction and preparation controls once the round has ended',()=>{
 const html=renderToStaticMarkup(<ExplorationHud {...base} ended/>);
 expect(html).toContain('本轮观测已结束');expect(html).toContain('查看结算');
 for(const stale of ['读取观象柱','取消保存准备','准备中，可取消','钟声从'])expect(html).not.toContain(stale);
});
it('keeps cancellation only in the reversible preparation stage',()=>{
 for(const phase of ['idle','preparing','entering','sealing','dehydrating','preserved','failed']){
  const html=renderToStaticMarkup(<ExplorationHud {...base} view={{...base.view,preservation:phase}}/>);
  expect(html.includes('取消保存准备')).toBe(phase==='preparing');
 }
});
