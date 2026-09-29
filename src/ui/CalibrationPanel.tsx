import {inheritedCalibration,directionReadings} from '../gameplay/calibration';
import type {Observation} from '../gameplay/evidence';

export function CalibrationPanel({observations,civilization,sample}:{observations:Observation[];civilization:number;sample?:Observation|null}){
 const proof=inheritedCalibration(observations,civilization);if(!proof)return null;
 const readings=sample?directionReadings(sample):[];
 return <section className="journal-section calibration-panel" aria-label="继承校准">
  <h4>多天体方向刻度</h4>
  <p>前代已记录同时出现的多个天体。本轮观象仪开放逐目标方向读数，帮助你分开比较。</p>
  <details><summary>查看校准依据 · 文明 {proof.civilization}</summary><p>样本 {proof.id}，记录了 {proof.sunIds.length} 个同时可见的天体。只使用这份已留下的记录。</p></details>
  {sample?.source==='pillar'?<>
   <p className="quiet">以下对应文明 {sample.civilization} 的这次采样；天体编号仅在本样本内排序，不能直接当作跨样本身份。</p>
   {readings.length?<table className="calibration-readings"><caption>样本方向 · {sample.id}</caption><thead><tr><th scope="col">目标</th><th scope="col">高度角</th><th scope="col">方位角</th></tr></thead><tbody>{readings.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{row.altitude.toFixed(1)}°</td><td>{row.azimuth===null?'天顶处未定义':`${row.azimuth.toFixed(1)}°`}</td></tr>)}</tbody></table>:<p>本次没有可辨认的天体，不补出被遮挡或地平线下的方向。</p>}
   <p className="quiet">高度从地平线向上计；方位以北为 0°，向东增加。这是游戏观测刻度，不预测下一次天象。</p>
  </>:<p className="quiet">读取观象柱或选择已记录的天空样本，即可查看方向刻度。</p>}
 </section>;
}
