import type {Observation} from '../gameplay/evidence';
import {CalibrationPanel} from './CalibrationPanel';
import {time,describe} from './observation-format';

export function InstrumentReading({civilization,observations,sample}:{civilization:number;observations:Observation[];sample:Observation}){
 const previousSample=[...observations].reverse().find(o=>o.source===sample.source&&o.id!==sample.id);
 return <>{civilization>1&&<p className="quiet">开始本轮测量前，请核对旧样本的文明编号和时间；上轮读数不代表当前天空。</p>}<p className="quiet">{sample.location?.name??'地点未记录'} · {sample.location?.instrumentName??'仪器'} · 本次采样 {time(sample.tick)} · 确认前世界保持暂停</p><div className="reading-comparison"><section><span>本次读数</span><h3>{describe(sample)}</h3></section><section><span>上次读数</span><h3>{previousSample?describe(previousSample):'尚无记录'}</h3>{previousSample&&<small>文明 {previousSample.civilization} · {time(previousSample.tick)} · {previousSample.location?.name??'旧档未记录地点'} · {previousSample.location?.instrumentName??'仪器未记录'}</small>}</section></div><p>{sample.source==='pillar'?'地平线以下或被建筑遮挡的天体不进入这份样本。':'这是游戏仪器的瞬时温度读数；离开仪器后不会自动刷新。'}</p><CalibrationPanel observations={observations} civilization={civilization} sample={sample}/></>;
}

export function InstrumentActions({recorded,onClose,onRecord}:{recorded:boolean;onClose:()=>void;onRecord:()=>void}){
 return <div className="panel-actions"><button onClick={onClose}>返回场景</button><button className="primary" onClick={onRecord}>{recorded?'本次样本已记录':'记录本次读数'}</button></div>;
}
