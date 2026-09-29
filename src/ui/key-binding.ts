/** Only an intentional, unmodified letter press can replace a binding. */
export function bindingCode(event:Pick<KeyboardEvent,'code'|'repeat'|'isComposing'|'ctrlKey'|'metaKey'|'altKey'|'shiftKey'|'keyCode'>):string|null{
 if(event.repeat||event.isComposing||event.keyCode===229||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return null;
 return /^Key[A-Z]$/.test(event.code)?event.code:null;
}
