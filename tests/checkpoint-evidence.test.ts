import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {withCheckpoint} from '../src/storage/checkpoint-evidence';
import {validateArchive,type Archive,type Checkpoint} from '../src/storage/archive';
import {inheritArchive} from '../src/storage/compatibility';
it.each(['preserved','lost'])('keeps current-round evidence in %s history after repeated runtime checkpoint saves',individual=>{
 const archive=JSON.parse(readFileSync(`reports/fixtures/result-a-${individual}.json`,'utf8')) as Archive;
 const runtimeCheckpoint=structuredClone(archive.checkpoint!) as Checkpoint;runtimeCheckpoint.outcome!.evidenceCount=0;
 const saved=withCheckpoint(withCheckpoint(archive,runtimeCheckpoint),runtimeCheckpoint);
 expect(validateArchive(saved).checkpoint!.outcome!.evidenceCount).toBe(1);
 expect(saved.observations.length).toBe(2);
 expect(inheritArchive(saved).history.at(-1)!.outcome).toMatchObject({individual,evidenceCount:1});
 expect(runtimeCheckpoint.outcome!.evidenceCount).toBe(0);
 expect(archive.checkpoint!.outcome!.evidenceCount).toBe(1);
});

it('exports live progress between autosaves without changing the stored archive',()=>{
 const archive=JSON.parse(readFileSync('reports/fixtures/thermometer-scene-review.json','utf8')) as Archive;
 const stored=JSON.stringify(archive),live=structuredClone(archive.checkpoint!);
 live.tick+=599;live.position=[-24,.9,-29];live.preservation={...live.preservation,phase:'preparing',elapsed:1};
 const exported=JSON.parse(JSON.stringify(withCheckpoint(archive,live))) as Archive;
 expect(exported.checkpoint!.tick).toBe(live.tick);
 expect(exported.checkpoint!.position).toEqual([-24,.9,-29]);
 expect(exported.checkpoint!.preservation).toEqual(live.preservation);
 expect(exported.observations).toEqual(archive.observations);
 expect(exported.savedAt).toBe(archive.savedAt);
 expect(JSON.stringify(archive)).toBe(stored);
});

it('keeps an imported archive unchanged when no live world exists',()=>{
 const archive=JSON.parse(readFileSync('reports/fixtures/result-a-preserved.json','utf8')) as Archive;
 expect(withCheckpoint(archive,null)).toBe(archive);
 expect(withCheckpoint(archive,undefined)).toBe(archive);
});

