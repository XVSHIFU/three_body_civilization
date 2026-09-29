import {ArchiveStore,ConflictError,emptyArchive,type Archive} from '../src/storage/archive';
const run=document.querySelector<HTMLButtonElement>('#run')!,exportButton=document.querySelector<HTMLButtonElement>('#export')!,status=document.querySelector<HTMLElement>('#status')!,output=document.querySelector<HTMLElement>('#report')!;let report:Record<string,unknown>|undefined;
run.onclick=async()=>{
 run.disabled=true;exportButton.disabled=true;status.textContent='运行真实 IndexedDB 事务…';
 const name=`three-body-validation:cas:${crypto.randomUUID()}`,a=new ArchiveStore(name),b=new ArchiveStore(name);
 try{
  await Promise.all([a.open(),b.open()]);await a.save(emptyArchive());
  const left=(await a.read())!,right=(await b.read())!;left.settings.theme='a';right.settings.theme='c';
  const results=await Promise.allSettled([a.save(left),b.save(right)]),winners=results.flatMap((r,i)=>r.status==='fulfilled'?[i]:[]),losers=results.flatMap((r,i)=>r.status==='rejected'?[i]:[]);
  if(winners.length!==1||losers.length!==1)throw Error('Expected one success and one conflict');
  const rejected=results[losers[0]] as PromiseRejectedResult;if(!(rejected.reason instanceof ConflictError))throw rejected.reason;
  const current=(await a.read())!,winnerDraft=[left,right][winners[0]],loserDraft=[left,right][losers[0]],loserStore=[a,b][losers[0]];
  if(current.revision!==2||current.settings.theme!==winnerDraft.settings.theme)throw Error('Winner was overwritten');
  const restored=await loserStore.readLatestPreserving(loserDraft),backups=await loserStore.listBackups(),copy=backups.find(item=>item.kind==='conflict-copy');if(!copy)throw Error('Missing conflict copy');
  const savedCopy=await loserStore.readBackupRaw(copy.key) as Archive;
  if(savedCopy.settings.theme!==loserDraft.settings.theme||savedCopy.revision!==1||JSON.stringify(restored)!==JSON.stringify(current))throw Error('Recovery did not preserve draft and latest independently');
  const lastGood=await a.read('last-good');if(lastGood?.revision!==1)throw Error('Last good revision missing');
  report={passed:true,database:name,browser:navigator.userAgent,writerResults:results.map(r=>r.status),winnerRevision:current.revision,winnerTheme:current.settings.theme,conflictCopyRevision:savedCopy.revision,conflictCopyTheme:savedCopy.settings.theme,lastGoodRevision:lastGood.revision,recoveryExact:true,scope:'Two independent real IndexedDB connections in one browser page using production ArchiveStore; not a full two-tab application workflow.'};status.textContent='通过：一个提交成功，另一个冲突；失败方草稿已保留，最新档案未被覆盖。';
 }catch(error){report={passed:false,database:name,error:String(error)};status.textContent='验证失败，详见报告。';}finally{a.close();b.close();output.textContent=JSON.stringify(report,null,2);run.disabled=false;exportButton.disabled=false;}
};
exportButton.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='indexeddb-concurrency-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
