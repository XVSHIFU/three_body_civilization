import {useEffect,useRef,type ReactNode} from 'react';
export function Dialog({title,onClose,children,footer,wide=false}:{title:string;onClose:()=>void;children:ReactNode;footer?:ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=ref.current!;dialog.showModal();const cancel=(e:Event)=>{e.preventDefault();close.current();};dialog.addEventListener('cancel',cancel);return()=>{dialog.removeEventListener('cancel',cancel);dialog.close();previous?.focus();};},[]);
 return <dialog ref={ref} className={wide?'panel wide':'panel'} aria-labelledby="panel-title"><header className="panel-head"><div><h2 id="panel-title">{title}</h2><span className="quiet">阅读时，世界暂停。</span></div><button className="icon-button" onClick={onClose} aria-label="关闭面板"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div className="panel-content">{children}</div>{footer&&<footer className="panel-footer">{footer}</footer>}</dialog>;
}
