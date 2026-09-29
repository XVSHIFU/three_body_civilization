import {BUILD_ID} from '../build-info';
import type {Archive,Checkpoint} from './archive';
/** Runtime checkpoints do not own the journal; reconcile saves, exports and recovery copies. */
export function withCheckpoint(archive:Archive,checkpoint?:Checkpoint|null):Archive {
 if(!checkpoint)return archive;
 return {...archive,buildId:BUILD_ID,checkpoint:{...checkpoint,outcome:checkpoint.outcome?{...checkpoint.outcome,evidenceCount:archive.observations.filter(o=>o.civilization===archive.civilization).length}:null}};
}
