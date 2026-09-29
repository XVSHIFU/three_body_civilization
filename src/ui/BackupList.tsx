import {useEffect,useState} from 'react';
import type {ArchiveStore,BackupSummary} from '../storage/archive';
const names={"conflict-copy":'重新读取前的页面副本',"last-good":'上一份有效档案',"retired-checkpoint":'版本接续前的原档',quarantine:'隔离保留的损坏原件'};
export function BackupList({store,onBack,onNotice}:{store:ArchiveStore|null;onBack:()=>void;onNotice:(message:string)=>void}){
 const [items,setItems]=useState<BackupSummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[page,setPage]=useState(0),[refresh,setRefresh]=useState(0),[exporting,setExporting]=useState(false);
 useEffect(()=>{let active=true;setLoading(true);setError('');void(async()=>{try{if(!store)throw Error('本地档案不可用。');const backups=await store.listBackups();if(active){setItems(backups);setPage(0);}}catch(error){if(active)setError(String(error));}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[store,refresh]);
 async function exportBackup(item:BackupSummary){
  setExporting(true);setError('');
  try{
   if(!store)throw Error('本地档案不可用。');
   const original=await store.readBackupRaw(item.key),url=URL.createObjectURL(new Blob([JSON.stringify(original,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download=`civilization-backup-${item.kind}-${item.key.slice(-8)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   onNotice('已导出这份备份；当前档案未改变。');
  }catch(error){setError(String(error));}finally{setExporting(false);}
 }
 return <><p>这里保留上一份有效档案、版本接续前的检查点、重新读取前的页面副本和隔离的损坏原件。导出不会替换当前进度。</p>
  {loading?<p role="status">正在读取本地备份…</p>:!items.length&&!error?<p className="quiet">尚无备份。成功保存下一份档案或执行恢复后，保留的原件会出现在这里。</p>:<ul className="backup-list">{items.slice(page*10,page*10+10).map(item=><li key={item.key}><div><h3>{names[item.kind]}</h3><p>{item.civilization?`文明 ${item.civilization}`:'文明信息不可读'} · {item.readable?'结构校验通过':'无法校验，仅保留原件'}</p><small>原档保存时间：{item.savedAt?new Date(item.savedAt).toLocaleString('zh-CN'):'未知'}</small></div><button disabled={exporting} onClick={()=>void exportBackup(item)}>导出这份原件</button></li>)}</ul>}
  {error&&<p role="alert">{error}</p>}
  {items.length>10&&<nav className="button-row" aria-label="备份分页"><button disabled={!page} onClick={()=>setPage(page-1)}>上一页</button><span>{page+1} / {Math.ceil(items.length/10)}</span><button disabled={(page+1)*10>=items.length} onClick={()=>setPage(page+1)}>下一页</button></nav>}
  <div className="button-row"><button disabled={loading} onClick={()=>setRefresh(refresh+1)}>刷新列表</button><button onClick={onBack}>返回设置</button></div>
 </>;
}

