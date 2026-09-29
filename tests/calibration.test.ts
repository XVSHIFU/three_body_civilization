import {it,expect} from 'vitest';
import {inheritedCalibration,directionReadings} from '../src/gameplay/calibration';
import {sample} from '../src/gameplay/evidence';
import {emptyArchive,parseImport} from '../src/storage/archive';

const proof=sample(1,1200,'pillar',[{id:'s1',direction:[Math.SQRT1_2,Math.SQRT1_2,0],aboveHorizon:true,irradiance:1},{id:'s2',direction:[-Math.SQRT1_2,Math.SQRT1_2,0],aboveHorizon:true,irradiance:1}],28);
it('unlocks only inherited simultaneous evidence, not guesses or separate one-sun records',()=>{
 expect(inheritedCalibration([],2)).toBeNull();expect(inheritedCalibration([proof],1)).toBeNull();
 expect(inheritedCalibration([proof],2)?.id).toBe(proof.id);
 const separate=proof.sunIds.map((id,index)=>({...proof,id:`c1-pillar-${index}`,tick:index*600,sunIds:[id],directions:{[id]:proof.directions[id]}}));
 expect(inheritedCalibration(separate,2)).toBeNull();
});
it('derives the aid again after archive roundtrip without persisting an unearned unlock flag',()=>{
 const archive=emptyArchive();archive.civilization=2;archive.observations=[proof];
 const restored=parseImport(JSON.stringify(archive));expect(inheritedCalibration(restored.observations,restored.civilization)).toEqual(proof);
 restored.observations=[];expect(inheritedCalibration(restored.observations,restored.civilization)).toBeNull();
});
it('reads only sampled targets, computes compass angles, and handles the zenith without an invented bearing',()=>{
 const readings=directionReadings(proof);expect(readings).toHaveLength(2);
 expect(readings[0].altitude).toBeCloseTo(45);expect(readings[0].azimuth).toBe(90);expect(readings[1].azimuth).toBe(270);
 expect(directionReadings({...proof,sunIds:['s1'],directions:{s1:[0,1,0],s2:[0,0,1]}})).toEqual([{label:'天体 1',altitude:90,azimuth:null}]);
 expect(directionReadings({...proof,sunIds:[]})).toEqual([]);
 expect(directionReadings({...proof,source:'thermometer'})).toEqual([]);
});
