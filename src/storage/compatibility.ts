import {BUILD_ID,RUNTIME_ID} from '../build-info';
import {scenario} from '../simulation/scenario';
import type {Scenario} from '../simulation/core';
import type {Archive} from './archive';

export function checkpointIssues(archive:Archive,expected:Scenario=scenario):string[]{
 const checkpoint=archive.checkpoint;if(!checkpoint)return [];
 const issues:string[]=[];
 if(checkpoint.scenarioId!==expected.id||checkpoint.scenarioVersion!==expected.version)issues.push('场景版本已变化。');
 if(checkpoint.integratorVersion!==expected.integratorVersion)issues.push('轨道积分版本已变化。');
 if(checkpoint.runtimeId!==RUNTIME_ID)issues.push('检查点的运行规则与当前构建不匹配，无法保证原样续跑。');
 if(checkpoint.celestialAccumulator===undefined||checkpoint.celestialAccumulator>=expected.h||!checkpoint.motion||!checkpoint.npcs)issues.push('旧检查点缺少完整的积分、移动或人物恢复状态。');
 return issues;
}

/** User-selected knowledge-only continuation; never invent an unfinished run's outcome. */
export function inheritArchive(archive:Archive):Archive {
 if(!archive.checkpoint)throw Error('当前没有需要兼容处理的检查点。');
 if(archive.civilization>=100000)throw Error('文明编号已达上限，请导出档案。');
 const next=structuredClone(archive);
 if(next.checkpoint?.ended&&next.checkpoint.outcome&&!next.history.some(item=>item.civilization===next.civilization))next.history.push({civilization:next.civilization,outcome:next.checkpoint.outcome});
 next.civilization++;next.checkpoint=null;next.buildId=BUILD_ID;
 return next;
}
