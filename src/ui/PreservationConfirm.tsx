import {useEffect,useRef,useState} from 'react';
import {HoldConfirmation} from '../gameplay/hold-confirmation';

export function PreservationConfirm({code,disabled,onConfirm,onCancel}:{code:string;disabled:boolean;onConfirm:()=>void;onCancel:()=>void}){
 const callback=useRef(onConfirm);callback.current=onConfirm;
 const committed=useRef(false),[progress,setProgress]=useState(0);
 const confirm=()=>{if(disabled||committed.current)return;committed.current=true;callback.current();};
 const confirmRef=useRef(confirm);confirmRef.current=confirm;
 useEffect(()=>{
  if(disabled)return;
  const hold=new HoldConfirmation(),mountedAt=performance.now();let timer:ReturnType<typeof setInterval>|undefined;
  const cancel=()=>{hold.cancel();clearInterval(timer);timer=undefined;setProgress(0);};
  const down=(event:KeyboardEvent)=>{
   if(event.code==='Escape'){cancel();return;}
   if(event.code!==code||event.timeStamp<=mountedAt||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||document.hidden)return;
   if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable]'))return;
   event.preventDefault();hold.press(performance.now());
   clearInterval(timer);timer=setInterval(()=>{const now=performance.now();setProgress(hold.progress(now));if(hold.take(now)){clearInterval(timer);timer=undefined;confirmRef.current();}},40);
  };
  const up=(event:KeyboardEvent)=>{if(event.code===code)cancel();};
  const hidden=()=>{if(document.hidden)cancel();};
  document.addEventListener('keydown',down);document.addEventListener('keyup',up);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',cancel);
  return()=>{clearInterval(timer);document.removeEventListener('keydown',down);document.removeEventListener('keyup',up);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',cancel);};
 },[code,disabled]);
 return <div><p className="quiet">{disabled?'保存流程已开始，不能重复确认。':<>按住 {code.replace('Key','').replace('Arrow','方向 ')} 约 0.8 秒确认；松开取消。也可点击下方按钮。</>}</p>{progress>0&&<p aria-live="off">正在确认保存 · {Math.round(progress*100)}%</p>}<div className="panel-actions"><button onClick={onCancel}>{disabled?'返回场景':'继续观察'}</button><button className="primary" disabled={disabled} onClick={confirm}>确认进入保存</button></div></div>;
}


