import {expect,it} from 'vitest';
import {addObservation,locationName,sample,type ObservationLocation} from '../src/gameplay/evidence';
import {emptyArchive,parseImport} from '../src/storage/archive';

it('keeps observations from separate instruments in the same window and snapshots their location',()=>{
 const location:ObservationLocation={instrumentId:'pillar',instrumentName:'观象柱',name:locationName({x:-10,z:-8}),position:[-10,3.15,-8]};
 const low=sample(1,610,'pillar',[],28,location);
 location.position[0]=999;
 expect(low.location?.position[0]).toBe(-10);
 const high=sample(1,620,'pillar',[],28,{instrumentId:'high-pillar',instrumentName:'高台观象仪',name:locationName({x:18,z:-32.8}),position:[18,13.75,-32.8]});
 const same=sample(1,630,'pillar',[],28,low.location);
 const observations=addObservation(addObservation([low],high),same);
 expect(observations).toHaveLength(2);
 expect(observations.map(o=>o.location?.name)).toEqual(['广场观测区','观象台']);
 const archive=emptyArchive();archive.civilization=2;archive.observations=observations;
 expect(parseImport(JSON.stringify(archive)).observations).toEqual(observations);
});

it('preserves legacy unknown locations and rejects malformed or mismatched location identities',()=>{
 const archive=emptyArchive();archive.observations=[sample(1,610,'thermometer',[],28)];
 expect(parseImport(JSON.stringify(archive)).observations[0].location).toBeUndefined();
 const located=sample(1,610,'thermometer',[],28,{instrumentId:'thermometer',instrumentName:'温度仪',name:'荒原广场',position:[-7.8,2.15,-6]});
 archive.observations=[located];
 for(const location of [null,{...located.location,position:[0,0]},{...located.location,name:''},{...located.location,position:[501,0,0]}]){
  expect(()=>parseImport(JSON.stringify({...archive,observations:[{...located,location}]}))).toThrow('地点');
 }
 expect(()=>parseImport(JSON.stringify({...archive,observations:[{...located,location:{...located.location,instrumentId:'elsewhere'}}]}))).toThrow('身份');
});


it('names actual landmark footprints without labelling the entire northwest as the facility',()=>{
 for(const [position,name] of [
  [{x:-26,z:-9},'档案馆'],[{x:-7.8,z:-4.3},'广场观测区'],
  [{x:-24,z:-30},'保存设施'],[{x:-24,z:-23},'保存设施入口'],
  [{x:24,z:-8},'观象台'],[{x:0,z:-34},'西侧撤离阶梯'],
  [{x:0,z:64},'南侧城门'],[{x:-65,z:-65},'荒原广场'],
  [{x:60,z:-50},'荒原广场'],[{x:-26,z:-5.4},'荒原广场'],
 ] as const)expect(locationName(position)).toBe(name);
 const old=sample(1,0,'pillar',[],28,{instrumentId:'pillar',instrumentName:'观象柱',name:'荒原广场',position:[-10,3.15,-8]});
 const archive=emptyArchive();archive.observations=[old];expect(parseImport(JSON.stringify(archive)).observations[0].location?.name).toBe('荒原广场');
});
