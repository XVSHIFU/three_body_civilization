import {it,expect} from 'vitest';
import {emptyArchive,parseImport} from '../src/storage/archive';
import {sample,reviseHypothesis,deriveKnowledge} from '../src/gameplay/evidence';

it('retains proposal, use, refutation and revision across civilizations without granting knowledge',()=>{
 const archive=emptyArchive(),first=sample(1,0,'thermometer',[],28),second=sample(1,600,'thermometer',[],40);
 archive.observations=[first,second];
 archive.hypothesis=reviseHypothesis(archive.hypothesis,'proposed',[first],1,'尝试比较变化周期');
 archive.hypothesis=reviseHypothesis(archive.hypothesis,'used',[first],1,'用作下一次测量的暂定依据');
 archive.hypothesis=reviseHypothesis(archive.hypothesis,'refuted',[second],1,'本次读数与我原来的预期不符');
 archive.civilization=2;
 archive.hypothesis=reviseHypothesis(archive.hypothesis,'revised',[first,second],2,'重新限定判断条件，等待更多证据');
 const restored=parseImport(JSON.stringify(archive));
 expect(restored.hypothesis.history?.map(entry=>entry.action)).toEqual(['proposed','used','refuted','revised']);
 expect(restored.hypothesis.status).toBe('tentative');expect(deriveKnowledge(restored.observations)).toEqual([]);
 const withdrawn=reviseHypothesis(restored.hypothesis,'withdrawn',[second],2,'');
 expect(withdrawn.proposed).toBe(false);expect(withdrawn.history).toHaveLength(5);
});

it('requires recorded evidence and a reason, and rejects invalid imported histories',()=>{
 const archive=emptyArchive(),observation=sample(1,0,'thermometer',[],28);
 expect(()=>reviseHypothesis(archive.hypothesis,'proposed',[],1,'')).toThrow('事实');
 archive.observations=[observation];archive.hypothesis=reviseHypothesis(archive.hypothesis,'proposed',[observation],1,'');
 expect(()=>reviseHypothesis(archive.hypothesis,'refuted',[observation],1,' ')).toThrow('说明');
 const invalid=structuredClone(archive);invalid.hypothesis.history![0].evidenceIds=['missing'];
 expect(()=>parseImport(JSON.stringify(invalid))).toThrow('历史');
 const inconsistent=structuredClone(archive);inconsistent.hypothesis.proposed=false;
 expect(()=>parseImport(JSON.stringify(inconsistent))).toThrow('不一致');
 const legacy=emptyArchive();expect(parseImport(JSON.stringify(legacy)).hypothesis.history).toBeUndefined();
});
