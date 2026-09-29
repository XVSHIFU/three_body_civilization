import {useState} from 'react';
import {reviseHypothesis,type Hypothesis,type HypothesisAction,type Observation} from '../gameplay/evidence';
const labels:Record<HypothesisAction,string>={proposed:'提出',used:'用于判断',refuted:'标记反证',revised:'修订为暂定',withdrawn:'撤回'};
export function HypothesisPanel({hypothesis,chosen,civilization,readOnly,onChange}:{hypothesis:Hypothesis;chosen?:Observation;civilization:number;readOnly:boolean;onChange:(next:Hypothesis)=>void}){
 const [note,setNote]=useState(''),[error,setError]=useState('');
 function act(action:HypothesisAction){try{onChange(reviseHypothesis(hypothesis,action,chosen?[chosen]:[],civilization,note));setNote('');setError('');}catch(error){setError(String(error));}}
 return <section className="journal-section hypothesis-panel" aria-labelledby="hypothesis-title">
  <h4 id="hypothesis-title">玩家假设</h4><p>单一周期可以可靠预测天空。</p>
  <p className="quiet">{!hypothesis.proposed?'尚未提出或已撤回':hypothesis.status==='refuted'?'你已标记为被反证':'暂定 · 尚未证实'}。这代表你的判断，不会自动解锁知识。</p>
  <p className="quiet">{chosen?`本次引用：${chosen.id}`:'先记录并选中一条事实，再提出假设。'}</p>
  <label className="hypothesis-note">判断说明<textarea value={note} maxLength={500} rows={3} disabled={readOnly||!chosen} onChange={event=>setNote(event.target.value)} placeholder="说明这条事实如何支持、影响或反驳你的判断。"/></label>
  <div className="button-row">
   {!hypothesis.proposed?<button disabled={readOnly||!chosen} onClick={()=>act('proposed')}>据此提出假设</button>:<>
    {hypothesis.status==='tentative'?<><button disabled={readOnly||!chosen||!note.trim()} onClick={()=>act('used')}>用于本轮判断</button><button disabled={readOnly||!chosen||!note.trim()} onClick={()=>act('refuted')}>标记为反证</button></>:<button disabled={readOnly||!chosen||!note.trim()} onClick={()=>act('revised')}>修订为暂定</button>}
    <button disabled={readOnly||!chosen} onClick={()=>act('withdrawn')}>撤回假设</button>
   </>}
  </div>
  {error&&<p role="alert">{error}</p>}
  {!!hypothesis.history?.length&&<details><summary>判断历史 · {hypothesis.history.length} 次</summary><ol className="hypothesis-history">{[...hypothesis.history].reverse().map(entry=><li key={entry.revision}><strong>文明 {entry.civilization} · {labels[entry.action]}</strong>{entry.note&&<p>{entry.note}</p>}<small>依据：{entry.evidenceIds.join('、')}</small></li>)}</ol></details>}
 </section>;
}
